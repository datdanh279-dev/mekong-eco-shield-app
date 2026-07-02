from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User
from app.models.geospatial import (
    FloodPrediction,
    SalinityPrediction,
    DerivedProduct,
    Farm,
)
from app.schemas.alert import (
    FloodPredictionResponse,
    SalinityPredictionResponse,
    PaginatedPredictions,
)
from app.utils.helpers import http_not_found

router = APIRouter()


@router.get("/flood", response_model=PaginatedPredictions)
async def list_flood_predictions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    valid_from: datetime | None = Query(None),
    valid_to: datetime | None = Query(None),
    min_confidence: float | None = Query(None, ge=0, le=1),
) -> PaginatedPredictions:
    conditions: list = []

    if valid_from:
        conditions.append(FloodPrediction.valid_from >= valid_from)
    if valid_to:
        conditions.append(FloodPrediction.valid_to <= valid_to)
    if min_confidence is not None:
        conditions.append(FloodPrediction.confidence >= min_confidence)

    count_q = select(func.count(FloodPrediction.id)).where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    q = (
        select(FloodPrediction)
        .where(and_(*conditions))
        .order_by(desc(FloodPrediction.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(q)
    predictions = result.scalars().all()

    return PaginatedPredictions(
        items=[FloodPredictionResponse.model_validate(p) for p in predictions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/flood/{prediction_id}", response_model=FloodPredictionResponse)
async def get_flood_prediction(
    prediction_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> FloodPredictionResponse:
    result = await db.execute(
        select(FloodPrediction).where(FloodPrediction.id == prediction_id)
    )
    prediction = result.scalars().first()
    if prediction is None:
        raise http_not_found("Flood prediction")
    return FloodPredictionResponse.model_validate(prediction)


@router.get("/flood/nearby/{farm_id}", response_model=list[FloodPredictionResponse])
async def get_flood_predictions_for_farm(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    limit: int = Query(5, ge=1, le=50),
) -> list[FloodPredictionResponse]:
    farm_result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = farm_result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    q = (
        select(FloodPrediction)
        .where(FloodPrediction.footprint.ST_Intersects(farm.geom))
        .order_by(desc(FloodPrediction.created_at))
        .limit(limit)
    )
    result = await db.execute(q)
    predictions = result.scalars().all()

    return [FloodPredictionResponse.model_validate(p) for p in predictions]


@router.get("/salinity", response_model=PaginatedPredictions)
async def list_salinity_predictions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    valid_from: datetime | None = Query(None),
    valid_to: datetime | None = Query(None),
    min_confidence: float | None = Query(None, ge=0, le=1),
) -> PaginatedPredictions:
    conditions: list = []

    if valid_from:
        conditions.append(SalinityPrediction.valid_from >= valid_from)
    if valid_to:
        conditions.append(SalinityPrediction.valid_to <= valid_to)
    if min_confidence is not None:
        conditions.append(SalinityPrediction.confidence >= min_confidence)

    count_q = select(func.count(SalinityPrediction.id)).where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    q = (
        select(SalinityPrediction)
        .where(and_(*conditions))
        .order_by(desc(SalinityPrediction.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(q)
    predictions = result.scalars().all()

    return PaginatedPredictions(
        items=[SalinityPredictionResponse.model_validate(p) for p in predictions],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/salinity/{prediction_id}", response_model=SalinityPredictionResponse)
async def get_salinity_prediction(
    prediction_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> SalinityPredictionResponse:
    result = await db.execute(
        select(SalinityPrediction).where(SalinityPrediction.id == prediction_id)
    )
    prediction = result.scalars().first()
    if prediction is None:
        raise http_not_found("Salinity prediction")
    return SalinityPredictionResponse.model_validate(prediction)


@router.get("/salinity/nearby/{farm_id}", response_model=list[SalinityPredictionResponse])
async def get_salinity_predictions_for_farm(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    limit: int = Query(5, ge=1, le=50),
) -> list[SalinityPredictionResponse]:
    farm_result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = farm_result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    q = (
        select(SalinityPrediction)
        .where(SalinityPrediction.footprint.ST_Intersects(farm.geom))
        .order_by(desc(SalinityPrediction.created_at))
        .limit(limit)
    )
    result = await db.execute(q)
    predictions = result.scalars().all()

    return [SalinityPredictionResponse.model_validate(p) for p in predictions]
