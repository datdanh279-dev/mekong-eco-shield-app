from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.models.fintech import User, UserRole
from app.models.geospatial import SensorStation, SensorReading
from app.schemas.sensor import (
    SensorStationCreate,
    SensorStationUpdate,
    SensorStationResponse,
    SensorReadingCreate,
    SensorReadingBulkCreate,
    SensorReadingResponse,
    SensorReadingAggregated,
    PaginatedSensorStations,
    PaginatedSensorReadings,
)
from app.services.sensor_service import SensorService
from app.utils.helpers import http_not_found

router = APIRouter()


@router.get("/stations/", response_model=PaginatedSensorStations)
async def list_stations(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    admin_zone_id: str | None = Query(None),
    farm_id: str | None = Query(None),
    station_type: str | None = Query(None),
    status: str | None = Query(None),
) -> PaginatedSensorStations:
    service = SensorService(db)
    offset = (page - 1) * page_size
    stations, total = await service.get_stations(
        admin_zone_id=admin_zone_id,
        farm_id=farm_id,
        station_type=station_type,
        status=status,
        limit=page_size,
        offset=offset,
    )
    return PaginatedSensorStations(
        items=[SensorStationResponse.model_validate(s) for s in stations],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/stations/{station_id}", response_model=SensorStationResponse)
async def get_station(
    station_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> SensorStationResponse:
    service = SensorService(db)
    station = await service.get_station(station_id)
    if station is None:
        raise http_not_found("Sensor station")
    return SensorStationResponse.model_validate(station)


@router.post("/stations/", response_model=SensorStationResponse, status_code=201)
async def create_station(
    data: SensorStationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> SensorStationResponse:
    service = SensorService(db)
    station = await service.create_station(data.model_dump(), current_user.id)
    return SensorStationResponse.model_validate(station)


@router.patch("/stations/{station_id}", response_model=SensorStationResponse)
async def update_station(
    station_id: str,
    data: SensorStationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> SensorStationResponse:
    service = SensorService(db)
    station = await service.update_station(station_id, data.model_dump(exclude_unset=True))
    if station is None:
        raise http_not_found("Sensor station")
    return SensorStationResponse.model_validate(station)


@router.delete("/stations/{station_id}", status_code=204)
async def delete_station(
    station_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> None:
    service = SensorService(db)
    station = await service.get_station(station_id)
    if station is None:
        raise http_not_found("Sensor station")
    station.soft_delete()
    await db.flush()


@router.get("/readings/", response_model=PaginatedSensorReadings)
async def list_readings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    station_id: str = Query(...),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
) -> PaginatedSensorReadings:
    service = SensorService(db)
    offset = (page - 1) * page_size
    readings, total = await service.get_readings(
        station_id=station_id,
        start_time=start_time,
        end_time=end_time,
        limit=page_size,
        offset=offset,
    )
    return PaginatedSensorReadings(
        items=[SensorReadingResponse.model_validate(r) for r in readings],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.post("/readings/", response_model=SensorReadingResponse, status_code=201)
async def create_reading(
    data: SensorReadingCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> SensorReadingResponse:
    service = SensorService(db)
    reading = await service.ingest_reading(data.model_dump())
    return SensorReadingResponse.model_validate(reading)


@router.post("/readings/bulk", response_model=list[SensorReadingResponse], status_code=201)
async def bulk_create_readings(
    data: SensorReadingBulkCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[SensorReadingResponse]:
    service = SensorService(db)
    readings = await service.bulk_ingest_readings([r.model_dump() for r in data.readings])
    return [SensorReadingResponse.model_validate(r) for r in readings]


@router.get("/readings/aggregated", response_model=list[SensorReadingAggregated])
async def get_aggregated_readings(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    station_id: str = Query(...),
    start_time: datetime = Query(...),
    end_time: datetime = Query(...),
    interval_minutes: int = Query(60, ge=5, le=1440),
) -> list[SensorReadingAggregated]:
    service = SensorService(db)
    aggregated = await service.get_aggregated_readings(
        station_id=station_id,
        start_time=start_time,
        end_time=end_time,
        interval_minutes=interval_minutes,
    )
    return [SensorReadingAggregated(**a) for a in aggregated]
