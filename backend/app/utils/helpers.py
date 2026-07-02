import math
from typing import Any, Generic, TypeVar

from fastapi import HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class PaginationParams:
    def __init__(self, page: int = 1, page_size: int = 20):
        self.page = max(page, 1)
        self.page_size = min(max(page_size, 1), 100)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size

    @property
    def limit(self) -> int:
        return self.page_size


async def paginate(
    db: AsyncSession,
    model: Any,
    pagination: PaginationParams,
    filters: list[Any] | None = None,
) -> dict[str, Any]:
    query = select(model)
    count_query = select(func.count(model.id))

    if filters:
        for f in filters:
            query = query.where(f)
            count_query = count_query.where(f)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    query = query.offset(pagination.offset).limit(pagination.limit)
    result = await db.execute(query)
    items = result.scalars().all()

    total_pages = math.ceil(total / pagination.page_size) if pagination.page_size > 0 else 0

    return {
        "items": items,
        "total": total,
        "page": pagination.page,
        "page_size": pagination.page_size,
        "total_pages": total_pages,
    }


def http_not_found(entity: str = "Resource") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"{entity} not found",
    )


def http_forbidden(detail: str = "Not authorized") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=detail,
    )


def http_bad_request(detail: str = "Bad request") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=detail,
    )


def http_conflict(detail: str = "Resource already exists") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail=detail,
    )
