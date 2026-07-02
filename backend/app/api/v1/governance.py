from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User, UserRole
from app.schemas.governance import (
    DeviceCreate,
    DeviceResponse,
    ProposalCreate,
    ProposalResponse,
    VoteRequest,
    VoteResponse,
    GovernanceStats,
)
from app.services.governance_service import GovernanceService

router = APIRouter()


@router.post("/devices/register", response_model=DeviceResponse, status_code=201)
async def register_device(
    data: DeviceCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeviceResponse:
    service = GovernanceService(db)
    return await service.register_device(data.device_fingerprint, current_user.id)


@router.get("/devices/{device_id}", response_model=DeviceResponse)
async def get_device(
    device_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeviceResponse:
    service = GovernanceService(db)
    return await service.get_device(device_id)


@router.get("/devices/verify/{fingerprint}", response_model=DeviceResponse)
async def verify_device_fingerprint(
    fingerprint: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> DeviceResponse:
    service = GovernanceService(db)
    return await service.get_device_by_fingerprint(fingerprint)


@router.post("/proposals", response_model=ProposalResponse, status_code=201)
async def create_proposal(
    data: ProposalCreate,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProposalResponse:
    service = GovernanceService(db)
    return await service.create_proposal(current_user.id, data)


@router.get("/proposals", response_model=list[ProposalResponse])
async def list_proposals(
    status: Optional[str] = Query(None, description="Filter by status"),
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[ProposalResponse]:
    service = GovernanceService(db)
    return await service.get_proposals(status)


@router.get("/proposals/{proposal_id}", response_model=ProposalResponse)
async def get_proposal(
    proposal_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ProposalResponse:
    service = GovernanceService(db)
    return await service.get_proposal_detail(proposal_id)


@router.post("/proposals/{proposal_id}/vote", response_model=VoteResponse)
async def cast_vote(
    proposal_id: str,
    data: VoteRequest,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> VoteResponse:
    service = GovernanceService(db)
    device = await service.get_device_by_fingerprint(
        data.device_fingerprint
    )
    if device.user_id != current_user.id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Device does not belong to current user",
        )
    return await service.cast_vote(device.id, proposal_id, data.vote)


@router.post("/proposals/{proposal_id}/execute")
async def execute_proposal(
    proposal_id: str,
    current_user: Annotated[User, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    if current_user.role != UserRole.ADMIN:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can execute proposals",
        )
    service = GovernanceService(db)
    return await service.execute_proposal(proposal_id)


@router.get("/stats", response_model=GovernanceStats)
async def governance_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> GovernanceStats:
    service = GovernanceService(db)
    return await service.get_governance_stats()
