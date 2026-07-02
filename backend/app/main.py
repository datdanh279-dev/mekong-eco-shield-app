import logging
import time
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import redis.asyncio as redis
import sentry_sdk
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_client import make_asgi_app, Counter, Histogram
from pydantic import BaseModel

from app.api.v1 import router as v1_router
from app.core.config import settings
from app.core.database import init_db, close_db

logger = logging.getLogger(__name__)

request_count = Counter("http_requests_total", "Total HTTP requests", ["method", "endpoint", "status"])
request_latency = Histogram("http_request_duration_seconds", "HTTP request latency", ["method", "endpoint"])

redis_client: redis.Redis | None = None


class HealthResponse(BaseModel):
    status: str
    database: str
    redis: str
    version: str


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    global redis_client

    logger.info("Starting Mekong Eco-Shield AI backend...")

    if settings.SENTRY_DSN:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.2,
        )
        logger.info("Sentry initialized")

    try:
        await init_db()
        logger.info("Database initialized")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")

    try:
        redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        await redis_client.ping()
        logger.info("Redis connected")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
        redis_client = None

    yield

    await close_db()
    if redis_client:
        await redis_client.close()
    logger.info("Mekong Eco-Shield AI backend shut down")


app = FastAPI(
    title="Mekong Eco-Shield AI API",
    description="Backend API for Mekong Eco-Shield AI platform - "
                "Flood and salinity prediction, green credit scoring, and IoT sensor management",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time

    request_count.labels(
        method=request.method,
        endpoint=request.url.path,
        status=response.status_code,
    ).inc()

    request_latency.labels(
        method=request.method,
        endpoint=request.url.path,
    ).observe(duration)

    return response


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if settings.RATE_LIMIT_ENABLED and redis_client:
        client_ip = request.client.host if request.client else "unknown"
        key = f"rate_limit:{client_ip}"
        current = await redis_client.get(key)
        if current is not None and int(current) >= settings.RATE_LIMIT_REQUESTS:
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Try again later."},
            )
        pipe = redis_client.pipeline()
        await pipe.incr(key)
        await pipe.expire(key, settings.RATE_LIMIT_WINDOW_SECONDS)
        await pipe.execute()

    response = await call_next(request)
    return response


app.include_router(v1_router)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    db_status = "ok"
    try:
        from sqlalchemy import select, text
        from app.core.database import async_session_factory
        async with async_session_factory() as session:
            await session.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    redis_status = "ok"
    if redis_client:
        try:
            await redis_client.ping()
        except Exception:
            redis_status = "error"
    else:
        redis_status = "disconnected"

    return HealthResponse(
        status="ok",
        database=db_status,
        redis=redis_status,
        version="1.0.0",
    )


if settings.PROMETHEUS_ENABLED:
    metrics_app = make_asgi_app()
    app.mount("/metrics", metrics_app)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
