from typing import ClassVar

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config: ClassVar[SettingsConfigDict] = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/mekong_eco_shield"
    REDIS_URL: str = "redis://localhost:6379/0"

    SECRET_KEY: str = "change-me-in-production-use-a-real-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    LOG_LEVEL: str = "INFO"

    SENTRY_DSN: str | None = None

    CORS_ORIGINS: list[str] = ["*"]

    API_V1_PREFIX: str = "/api/v1"

    PROMETHEUS_ENABLED: bool = True
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW_SECONDS: int = 60


settings = Settings()
