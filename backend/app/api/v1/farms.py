from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from geoalchemy2.shape import to_shape
from shapely.geometry import mapping
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User, UserRole
from app.models.geospatial import Farm, AdminZone, LandUseType
from app.schemas.farm import (
    FarmCreate,
    FarmUpdate,
    FarmResponse,
    PaginatedFarms,
    FarmGeoJSON,
    GeometryModel,
)
from app.utils.geo import geojson_to_wkb, wkb_to_geojson, validate_coordinates, calculate_area_ha
from app.utils.helpers import http_not_found, paginate, PaginationParams

router = APIRouter()


@router.get("/", response_model=PaginatedFarms)
async def list_farms(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_zone_id: str | None = Query(None),
    land_use: str | None = Query(None),
    is_verified: bool | None = Query(None),
    owner_id: str | None = Query(None),
) -> PaginatedFarms:
    conditions = [Farm.is_deleted == False]

    if current_user.role not in (UserRole.ADMIN, UserRole.ANALYST, UserRole.GOVERNMENT):
        conditions.append(Farm.owner_id == current_user.id)
    if admin_zone_id:
        conditions.append(Farm.admin_zone_id == admin_zone_id)
    if land_use:
        conditions.append(Farm.land_use == LandUseType(land_use))
    if is_verified is not None:
        conditions.append(Farm.is_verified == is_verified)
    if owner_id:
        conditions.append(Farm.owner_id == owner_id)

    pagination = PaginationParams(page, page_size)

    count_q = select(func.count(Farm.id)).where(and_(*conditions))
    total = (await db.execute(count_q)).scalar() or 0

    q = (
        select(Farm)
        .where(and_(*conditions))
        .order_by(Farm.created_at.desc())
        .offset(pagination.offset)
        .limit(pagination.limit)
    )
    result = await db.execute(q)
    farms = result.scalars().all()

    return PaginatedFarms(
        items=[FarmResponse.model_validate(f) for f in farms],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/{farm_id}", response_model=FarmResponse)
async def get_farm(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> FarmResponse:
    result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    if current_user.role not in (UserRole.ADMIN, UserRole.ANALYST, UserRole.GOVERNMENT) and farm.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    return FarmResponse.model_validate(farm)


@router.post("/", response_model=FarmResponse, status_code=201)
async def create_farm(
    data: FarmCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> FarmResponse:
    if not validate_coordinates(data.geometry):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid geometry")

    zone_result = await db.execute(
        select(AdminZone).where(AdminZone.id == data.admin_zone_id)
    )
    if zone_result.scalars().first() is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Admin zone not found")

    centroid = geojson_to_wkb(data.geometry) if "centroid" not in data.geometry else None

    farm = Farm(
        name=data.name,
        owner_id=current_user.id,
        admin_zone_id=data.admin_zone_id,
        geom=geojson_to_wkb(data.geometry),
        area_ha=data.area_ha,
        land_use=LandUseType(data.land_use),
        crop_calendar=data.crop_calendar,
        irrigation_type=data.irrigation_type,
        soil_type=data.soil_type,
    )
    db.add(farm)
    await db.flush()
    await db.refresh(farm)

    return FarmResponse.model_validate(farm)


@router.patch("/{farm_id}", response_model=FarmResponse)
async def update_farm(
    farm_id: str,
    data: FarmUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> FarmResponse:
    result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    if current_user.role != UserRole.ADMIN and farm.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            if field == "geometry":
                setattr(farm, "geom", geojson_to_wkb(value))
            elif field == "land_use":
                setattr(farm, "land_use", LandUseType(value))
            else:
                setattr(farm, field, value)

    await db.flush()
    await db.refresh(farm)
    return FarmResponse.model_validate(farm)


@router.delete("/{farm_id}", status_code=204)
async def delete_farm(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> None:
    result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    if current_user.role != UserRole.ADMIN and farm.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    farm.soft_delete()
    await db.flush()


@router.get("/{farm_id}/geojson", response_model=GeometryModel)
async def get_farm_geojson(
    farm_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> GeometryModel:
    result = await db.execute(
        select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
    )
    farm = result.scalars().first()
    if farm is None:
        raise http_not_found("Farm")

    geom = wkb_to_geojson(farm.geom)
    return GeometryModel(
        type="Feature",
        geometry=geom or {},
        properties={
            "id": farm.id,
            "name": farm.name,
            "area_ha": farm.area_ha,
            "land_use": farm.land_use.value if hasattr(farm.land_use, "value") else farm.land_use,
        },
    )


@router.get("/nearby/", response_model=list[FarmResponse])
async def get_nearby_farms(
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_km: float = Query(10, ge=0.1, le=100),
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[FarmResponse]:
    point_wkb = geojson_to_wkb({"type": "Point", "coordinates": [lng, lat]})
    q = select(Farm).where(
        Farm.is_deleted == False,
        Farm.geom.ST_DWithin(point_wkb, radius_km * 1000),
    ).limit(50)
    result = await db.execute(q)
    farms = result.scalars().all()
    return [FarmResponse.model_validate(f) for f in farms]
