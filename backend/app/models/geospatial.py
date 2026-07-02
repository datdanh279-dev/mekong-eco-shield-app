from datetime import datetime
from typing import Optional, List
from uuid import uuid4

from sqlalchemy import (
    String, Text, Float, Integer, Boolean, DateTime, ForeignKey, Index, Enum as SQLEnum,
    JSON, ARRAY, func
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from geoalchemy2 import Geometry, Geography, Raster
from geoalchemy2.shape import to_shape

from app.models.base import Base, TimestampMixin, UUIDMixin, SoftDeleteMixin
import enum


class ZoneType(str, enum.Enum):
    PROVINCE = "province"
    DISTRICT = "district"
    COMMUNE = "commune"
    FARM = "farm"
    CUSTOM = "custom"


class LandUseType(str, enum.Enum):
    RICE = "rice"
    FRUIT = "fruit"
    AQUACULTURE = "aquaculture"
    FORESTRY = "forestry"
    URBAN = "urban"
    WATER = "water"
    OTHER = "other"


class AdminZone(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "admin_zones"
    __table_args__ = (
        Index("ix_admin_zones_geom", "geom", postgresql_using="gist"),
        Index("ix_admin_zones_type_code", "zone_type", "code"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    name_en: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    zone_type: Mapped[ZoneType] = mapped_column(SQLEnum(ZoneType), nullable=False)
    parent_id: Mapped[Optional[str]] = mapped_column(ForeignKey("admin_zones.id"), nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=0)

    geom: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="MULTIPOLYGON", srid=4326, spatial_index=True), nullable=False
    )
    centroid: Mapped[Geography] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    area_ha: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    properties: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    parent: Mapped[Optional["AdminZone"]] = relationship(back_populates="children", remote_side="AdminZone.id")
    children: Mapped[List["AdminZone"]] = relationship(back_populates="parent")
    farms: Mapped[List["Farm"]] = relationship(back_populates="admin_zone")
    sensor_stations: Mapped[List["SensorStation"]] = relationship(back_populates="admin_zone")


class Farm(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "farms"
    __table_args__ = (
        Index("ix_farms_geom", "geom", postgresql_using="gist"),
        Index("ix_farms_owner_zone", "owner_id", "admin_zone_id"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False)
    admin_zone_id: Mapped[str] = mapped_column(ForeignKey("admin_zones.id"), nullable=False)

    geom: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )
    centroid: Mapped[Geography] = mapped_column(
        Geography(geometry_type="POINT", srid=4326), nullable=True
    )
    area_ha: Mapped[float] = mapped_column(Float, nullable=False)

    land_use: Mapped[LandUseType] = mapped_column(SQLEnum(LandUseType), nullable=False)
    crop_calendar: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    irrigation_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    soil_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    certification: Mapped[Optional[dict]] = mapped_column(JSON, default=dict, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verification_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="farms")
    admin_zone: Mapped["AdminZone"] = relationship(back_populates="farms")
    sensor_stations: Mapped[List["SensorStation"]] = relationship(back_populates="farm")
    credit_scores: Mapped[List["GreenCreditScore"]] = relationship(back_populates="farm")
    climate_risks: Mapped[List["ClimateRiskAssessment"]] = relationship(back_populates="farm")


class SensorStation(Base, UUIDMixin, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "sensor_stations"
    __table_args__ = (
        Index("ix_sensor_stations_geom", "geom", postgresql_using="gist"),
        Index("ix_sensor_stations_type_status", "station_type", "status"),
    )

    code: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    station_type: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="active", nullable=False)

    geom: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326, spatial_index=True), nullable=False
    )
    elevation_m: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    farm_id: Mapped[Optional[str]] = mapped_column(ForeignKey("farms.id"), nullable=True)
    admin_zone_id: Mapped[str] = mapped_column(ForeignKey("admin_zones.id"), nullable=False)

    sensor_config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    data_frequency_minutes: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    last_data_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    farm: Mapped[Optional["Farm"]] = relationship(back_populates="sensor_stations")
    admin_zone: Mapped["AdminZone"] = relationship(back_populates="sensor_stations")
    readings: Mapped[List["SensorReading"]] = relationship(back_populates="station", lazy="dynamic")


class SensorReading(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        Index("ix_sensor_readings_station_time", "station_id", "recorded_at"),
        Index("ix_sensor_readings_time", "recorded_at"),
    )

    station_id: Mapped[str] = mapped_column(ForeignKey("sensor_stations.id"), nullable=False)
    recorded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    temperature_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    humidity_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    soil_moisture_pct: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    soil_temp_c: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    salinity_ppt: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    ph: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    water_level_cm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    rainfall_mm: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_speed_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    wind_direction_deg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    raw_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    quality_flag: Mapped[str] = mapped_column(String(20), default="good", nullable=False)

    station: Mapped["SensorStation"] = relationship(back_populates="readings")


class SatelliteScene(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "satellite_scenes"
    __table_args__ = (
        Index("ix_satellite_scenes_geom", "footprint", postgresql_using="gist"),
        Index("ix_satellite_scenes_datetime", "acquired_at"),
        Index("ix_satellite_scenes_sensor_cloud", "sensor", "cloud_cover_pct"),
    )

    scene_id: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    sensor: Mapped[str] = mapped_column(String(50), nullable=False)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    processing_level: Mapped[str] = mapped_column(String(20), nullable=False)

    footprint: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )
    cloud_cover_pct: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    bands: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    metadata: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    asset_urls: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    is_processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    derived_products: Mapped[List["DerivedProduct"]] = relationship(back_populates="scene")


class DerivedProduct(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "derived_products"
    __table_args__ = (
        Index("ix_derived_products_geom", "footprint", postgresql_using="gist"),
        Index("ix_derived_products_type_time", "product_type", "generated_at"),
    )

    scene_id: Mapped[str] = mapped_column(ForeignKey("satellite_scenes.id"), nullable=False)
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    footprint: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )

    raster_asset_url: Mapped[str] = mapped_column(Text, nullable=False)
    stats: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    processing_params: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    scene: Mapped["SatelliteScene"] = relationship(back_populates="derived_products")
    flood_predictions: Mapped[List["FloodPrediction"]] = relationship(back_populates="product")
    salinity_predictions: Mapped[List["SalinityPrediction"]] = relationship(back_populates="product")


class FloodPrediction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "flood_predictions"
    __table_args__ = (
        Index("ix_flood_predictions_geom", "footprint", postgresql_using="gist"),
        Index("ix_flood_predictions_valid_time", "valid_from", "valid_to"),
        Index("ix_flood_predictions_model_version", "model_version"),
    )

    product_id: Mapped[str] = mapped_column(ForeignKey("derived_products.id"), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    lead_time_hours: Mapped[int] = mapped_column(Integer, nullable=False)

    footprint: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )
    max_depth_m: Mapped[float] = mapped_column(Float, nullable=False)
    mean_depth_m: Mapped[float] = mapped_column(Float, nullable=False)
    affected_area_ha: Mapped[float] = mapped_column(Float, nullable=False)

    probability_raster_url: Mapped[str] = mapped_column(Text, nullable=False)
    depth_raster_url: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    product: Mapped["DerivedProduct"] = relationship(back_populates="flood_predictions")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="flood_prediction")


class SalinityPrediction(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "salinity_predictions"
    __table_args__ = (
        Index("ix_salinity_predictions_geom", "footprint", postgresql_using="gist"),
        Index("ix_salinity_predictions_valid_time", "valid_from", "valid_to"),
    )

    product_id: Mapped[str] = mapped_column(ForeignKey("derived_products.id"), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    valid_from: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    valid_to: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    lead_time_days: Mapped[int] = mapped_column(Integer, nullable=False)

    footprint: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )
    max_salinity_ppt: Mapped[float] = mapped_column(Float, nullable=False)
    mean_salinity_ppt: Mapped[float] = mapped_column(Float, nullable=False)
    intrusion_km: Mapped[float] = mapped_column(Float, nullable=False)

    salinity_raster_url: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)

    product: Mapped["DerivedProduct"] = relationship(back_populates="salinity_predictions")
    alerts: Mapped[List["Alert"]] = relationship(back_populates="salinity_prediction")


class SoilHealthAssessment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "soil_health_assessments"
    __table_args__ = (
        Index("ix_soil_health_geom", "footprint", postgresql_using="gist"),
        Index("ix_soil_health_farm_date", "farm_id", "assessed_at"),
    )

    farm_id: Mapped[str] = mapped_column(ForeignKey("farms.id"), nullable=False)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    model_version: Mapped[str] = mapped_column(String(50), nullable=False)

    footprint: Mapped[Geometry] = mapped_column(
        Geometry(geometry_type="POLYGON", srid=4326, spatial_index=True), nullable=False
    )

    organic_matter_pct: Mapped[float] = mapped_column(Float, nullable=False)
    ph: Mapped[float] = mapped_column(Float, nullable=False)
    nitrogen_kg_ha: Mapped[float] = mapped_column(Float, nullable=False)
    phosphorus_kg_ha: Mapped[float] = mapped_column(Float, nullable=False)
    potassium_kg_ha: Mapped[float] = mapped_column(Float, nullable=False)
    salinity_ec_ds_m: Mapped[float] = mapped_column(Float, nullable=False)
    compaction_index: Mapped[float] = mapped_column(Float, nullable=False)
    health_score: Mapped[float] = mapped_column(Float, nullable=False)

    recommendations: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    raster_urls: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    farm: Mapped["Farm"] = relationship(back_populates="soil_assessments")


class ClimateRiskAssessment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "climate_risk_assessments"
    __table_args__ = (
        Index("ix_climate_risk_farm_date", "farm_id", "assessed_at"),
        Index("ix_climate_risk_zone_date", "admin_zone_id", "assessed_at"),
    )

    farm_id: Mapped[Optional[str]] = mapped_column(ForeignKey("farms.id"), nullable=True)
    admin_zone_id: Mapped[Optional[str]] = mapped_column(ForeignKey("admin_zones.id"), nullable=True)
    assessed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period: Mapped[str] = mapped_column(String(20), nullable=False)

    flood_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    salinity_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    drought_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    erosion_risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    composite_risk_score: Mapped[float] = mapped_column(Float, nullable=False)

    risk_factors: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    projected_losses_vnd: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    adaptation_recommendations: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    farm: Mapped[Optional["Farm"]] = relationship(back_populates="climate_risks")
    admin_zone: Mapped[Optional["AdminZone"]] = relationship()