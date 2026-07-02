from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User, UserRole, GreenCreditScore
from app.models.geospatial import Farm
from app.schemas.credit import (
    CreditApplicationCreate,
    CreditApplicationResponse,
    GreenCreditScoreResponse,
    PaginatedCreditApplications,
    PaginatedCreditScores,
)
from app.services.credit_scoring import CreditScoringService
from app.utils.helpers import http_not_found

router = APIRouter()


@router.get("/scores", response_model=PaginatedCreditScores)
async def list_scores(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    farm_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedCreditScores:
    conditions = []

    if current_user.role not in (UserRole.ADMIN, UserRole.ANALYST, UserRole.FINANCIAL_INSTITUTION):
        conditions.append(GreenCreditScore.user_id == current_user.id)
    if farm_id:
        conditions.append(GreenCreditScore.farm_id == farm_id)

    count_q = select(func.count(GreenCreditScore.id)).where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    q = (
        select(GreenCreditScore)
        .where(and_(*conditions))
        .order_by(desc(GreenCreditScore.created_at))
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(q)
    scores = result.scalars().all()

    return PaginatedCreditScores(
        items=[GreenCreditScoreResponse.model_validate(s) for s in scores],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/scores/{farm_id}/latest", response_model=GreenCreditScoreResponse)
async def get_latest_score(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> GreenCreditScoreResponse:
    service = CreditScoringService(db)
    score = await service.get_latest_score(farm_id)
    if score is None:
        raise http_not_found("Credit score")
    return GreenCreditScoreResponse.model_validate(score)


@router.get("/scores/{farm_id}/history", response_model=PaginatedCreditScores)
async def get_score_history(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedCreditScores:
    service = CreditScoringService(db)
    offset = (page - 1) * page_size
    scores, total = await service.get_score_history(farm_id, limit=page_size, offset=offset)

    return PaginatedCreditScores(
        items=[GreenCreditScoreResponse.model_validate(s) for s in scores],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/calculate/{farm_id}", response_model=GreenCreditScoreResponse, status_code=201)
async def calculate_score(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> GreenCreditScoreResponse:
    result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    if current_user.role != UserRole.ADMIN and farm.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    service = CreditScoringService(db)
    score_data = await service.calculate_score(farm_id, user_id=current_user.id)
    return GreenCreditScoreResponse(**score_data)
