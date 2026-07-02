from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    get_password_hash,
    verify_password,
)
from app.models.fintech import User, UserRole, UserStatus
from app.schemas.user import UserCreate, UserLogin, UserResponse


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserCreate) -> dict[str, Any]:
        existing = await self.db.execute(
            select(User).where(User.email == data.email)
        )
        if existing.scalars().first() is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered",
            )

        if data.phone:
            phone_exists = await self.db.execute(
                select(User).where(User.phone == data.phone)
            )
            if phone_exists.scalars().first() is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Phone already registered",
                )

        user = User(
            email=data.email,
            full_name=data.full_name,
            phone=data.phone,
            hashed_password=get_password_hash(data.password),
            role=UserRole(data.role),
            status=UserStatus.PENDING_VERIFICATION,
            organization=data.organization,
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)

        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }

    async def login(self, data: UserLogin) -> dict[str, Any]:
        result = await self.db.execute(
            select(User).where(User.email == data.email, User.is_deleted == False)
        )
        user = result.scalars().first()

        if user is None or not verify_password(data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password",
            )

        user.last_login_at = datetime.now(timezone.utc)
        await self.db.flush()

        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }

    async def refresh_token(self, token: str) -> dict[str, Any]:
        try:
            payload = decode_token(token)
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                )
            user_id = payload.get("sub")
        except (ValueError, Exception):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token",
            )

        result = await self.db.execute(
            select(User).where(User.id == user_id, User.is_deleted == False)
        )
        user = result.scalars().first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found",
            )

        access_token = create_access_token(subject=user.id, role=user.role.value)
        refresh_token = create_refresh_token(subject=user.id)

        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "user": UserResponse.model_validate(user),
        }
