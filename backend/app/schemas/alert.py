from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    title: str
    message: str
    user_id: str | None = None
    farm_id: str | None = None
    admin_zone_id: str | None = None
    flood_prediction_id: str | None = None
    salinity_prediction_id: str | None = None
    is_read: bool = False
    is_acknowledged: bool = False
    acknowledged_at: datetime | None = None
    metadata: dict[str, Any] = {}
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class AlertSubscriptionCreate(BaseModel):
    alert_types: list[str] = Field(min_length=1)
    channels: list[str] = Field(min_length=1)
    admin_zone_id: str | None = None
    farm_id: str | None = None
    min_severity: str = "info"
    max_frequency_minutes: int = 60


class AlertSubscriptionResponse(BaseModel):
    id: str
    user_id: str
    alert_types: list[str]
    channels: list[str]
    admin_zone_id: str | None = None
    farm_id: str | None = None
    min_severity: str
    max_frequency_minutes: int
    is_active: bool = True
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class FloodPredictionResponse(BaseModel):
    id: str
    product_id: str
    model_version: str
    valid_from: datetime
    valid_to: datetime
    lead_time_hours: int
    max_depth_m: float
    mean_depth_m: float
    affected_area_ha: float
    probability_raster_url: str
    depth_raster_url: str
    confidence: float
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class SalinityPredictionResponse(BaseModel):
    id: str
    product_id: str
    model_version: str
    valid_from: datetime
    valid_to: datetime
    lead_time_days: int
    max_salinity_ppt: float
    mean_salinity_ppt: float
    intrusion_km: float
    salinity_raster_url: str
    confidence: float
    created_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaginatedAlerts(BaseModel):
    items: list[AlertResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedPredictions(BaseModel):
    items: list[FloodPredictionResponse] | list[SalinityPredictionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
