from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    TokenRefresh,
    TokenResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    data: UserLogin,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    service = AuthService(db)
    result = await service.login(data)
    return TokenResponse(**result)


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    service = AuthService(db)
    result = await service.register(data)
    return TokenResponse(**result)


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    data: TokenRefresh,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    service = AuthService(db)
    result = await service.refresh_token(data.refresh_token)
    return TokenResponse(**result)


@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    return UserResponse.model_validate(current_user)
