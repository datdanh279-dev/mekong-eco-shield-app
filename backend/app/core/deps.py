from collections.abc import AsyncGenerator
from typing import Annotated

from fastapi import Depends, HTTPException, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, oauth2_scheme
from app.models.fintech import User, UserRole


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = decode_token(token)
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")

        if user_id is None or token_type != "access":
            raise credentials_exception
    except (JWTError, ValueError):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id, User.is_deleted == False))
    user = result.scalars().first()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    from app.models.fintech import UserStatus

    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )
    return current_user


def check_role(*allowed_roles: UserRole):
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)],
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role {current_user.role} not permitted for this action",
            )
        return current_user

    return role_checker
