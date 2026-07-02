from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator


class GeometryModel(BaseModel):
    type: str = "Feature"
    geometry: dict[str, Any]
    properties: dict[str, Any] = {}


class AdminZoneCreate(BaseModel):
    name: str
    name_en: str | None = None
    code: str
    zone_type: str
    parent_id: str | None = None
    level: int = 0
    geometry: dict[str, Any]
    properties: dict[str, Any] = {}


class AdminZoneResponse(BaseModel):
    id: str
    name: str
    name_en: str | None = None
    code: str
    zone_type: str
    parent_id: str | None = None
    level: int
    area_ha: float | None = None
    properties: dict[str, Any] = {}
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class FarmCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    admin_zone_id: str
    geometry: dict[str, Any]
    area_ha: float = Field(gt=0)
    land_use: str
    crop_calendar: dict[str, Any] = {}
    irrigation_type: str | None = None
    soil_type: str | None = None

    @model_validator(mode="after")
    def validate_land_use(self) -> "FarmCreate":
        allowed = {"rice", "fruit", "aquaculture", "forestry", "urban", "water", "other"}
        if self.land_use.lower() not in allowed:
            raise ValueError(f"land_use must be one of: {', '.join(sorted(allowed))}")
        self.land_use = self.land_use.lower()
        return self


class FarmUpdate(BaseModel):
    name: str | None = None
    geometry: dict[str, Any] | None = None
    area_ha: float | None = None
    land_use: str | None = None
    crop_calendar: dict[str, Any] | None = None
    irrigation_type: str | None = None
    soil_type: str | None = None


class FarmResponse(BaseModel):
    id: str
    name: str
    owner_id: str
    admin_zone_id: str
    area_ha: float
    land_use: str
    crop_calendar: dict[str, Any] = {}
    irrigation_type: str | None = None
    soil_type: str | None = None
    is_verified: bool = False
    verification_date: datetime | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None

    model_config = {"from_attributes": True}


class PaginatedFarms(BaseModel):
    items: list[FarmResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class FarmGeoJSON(BaseModel):
    type: str = "FeatureCollection"
    features: list[GeometryModel]
