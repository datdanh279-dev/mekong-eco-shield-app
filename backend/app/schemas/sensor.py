from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class SensorStationCreate(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=255)
    station_type: str = Field(min_length=1, max_length=50)
    geometry: dict[str, Any]
    elevation_m: float | None = None
    farm_id: str | None = None
    admin_zone_id: str
    sensor_config: dict[str, Any] = {}
    data_frequency_minutes: int = 60


class SensorStationUpdate(BaseModel):
    name: str | None = None
    status: str | None = None
    geometry: dict[str, Any] | None = None
    elevation_m: float | None = None
    sensor_config: dict[str, Any] | None = None
    data_frequency_minutes: int | None = None


class SensorStationResponse(BaseModel):
    id: str
    code: str
    name: str
    station_type: str
    status: str
    elevation_m: float | None = None
    farm_id: str | None = None
    admin_zone_id: str
    data_frequency_minutes: int
    last_data_at: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class SensorReadingCreate(BaseModel):
    station_id: str
    recorded_at: datetime
    temperature_c: float | None = None
    humidity_pct: float | None = None
    soil_moisture_pct: float | None = None
    soil_temp_c: float | None = None
    salinity_ppt: float | None = None
    ph: float | None = None
    water_level_cm: float | None = None
    rainfall_mm: float | None = None
    wind_speed_ms: float | None = None
    wind_direction_deg: float | None = None
    raw_data: dict[str, Any] = {}
    quality_flag: str = "good"


class SensorReadingBulkCreate(BaseModel):
    readings: list[SensorReadingCreate]


class SensorReadingResponse(BaseModel):
    id: str
    station_id: str
    recorded_at: datetime
    temperature_c: float | None = None
    humidity_pct: float | None = None
    soil_moisture_pct: float | None = None
    soil_temp_c: float | None = None
    salinity_ppt: float | None = None
    ph: float | None = None
    water_level_cm: float | None = None
    rainfall_mm: float | None = None
    wind_speed_ms: float | None = None
    wind_direction_deg: float | None = None
    quality_flag: str = "good"
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SensorReadingAggregated(BaseModel):
    station_id: str
    period_start: datetime
    period_end: datetime
    avg_temperature_c: float | None = None
    max_temperature_c: float | None = None
    min_temperature_c: float | None = None
    avg_humidity_pct: float | None = None
    avg_soil_moisture_pct: float | None = None
    avg_salinity_ppt: float | None = None
    total_rainfall_mm: float | None = None
    avg_water_level_cm: float | None = None
    reading_count: int


class PaginatedSensorStations(BaseModel):
    items: list[SensorStationResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedSensorReadings(BaseModel):
    items: list[SensorReadingResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
