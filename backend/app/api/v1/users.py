from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user, check_role
from app.models.fintech import User, UserRole, UserStatus
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    PaginatedUsers,
)
from app.services.auth_service import AuthService
from app.utils.helpers import http_not_found

router = APIRouter()


@router.get("/", response_model=PaginatedUsers)
async def list_users(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(check_role(UserRole.ADMIN, UserRole.ANALYST))],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    role: str | None = Query(None),
    status: str | None = Query(None),
    search: str | None = Query(None),
) -> PaginatedUsers:
    conditions = [User.is_deleted == False]

    if role:
        conditions.append(User.role == UserRole(role))
    if status:
        conditions.append(User.status == UserStatus(status))
    if search:
        conditions.append(
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )

    count_q = select(func.count(User.id)).where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    offset = (page - 1) * page_size
    q = (
        select(User)
        .where(and_(*conditions))
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(q)
    users = result.scalars().all()

    return PaginatedUsers(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to view this user",
        )

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalars().first()
    if user is None:
        raise http_not_found("User")

    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    data: UserUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> UserResponse:
    if current_user.role != UserRole.ADMIN and current_user.id != user_id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this user",
        )

    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalars().first()
    if user is None:
        raise http_not_found("User")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            setattr(user, field, value)

    await db.flush()
    await db.refresh(user)

    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(check_role(UserRole.ADMIN))],
) -> None:
    result = await db.execute(
        select(User).where(User.id == user_id, User.is_deleted == False)
    )
    user = result.scalars().first()
    if user is None:
        raise http_not_found("User")

    user.soft_delete()
    await db.flush()


@router.post("/", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(check_role(UserRole.ADMIN))],
) -> UserResponse:
    service = AuthService(db)
    result = await service.register(data)
    return result["user"]
