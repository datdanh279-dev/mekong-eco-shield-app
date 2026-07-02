from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func, and_, between, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.geospatial import SensorStation, SensorReading
from app.utils.geo import geojson_to_wkb


class SensorService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_station(self, data: dict[str, Any], owner_id: str) -> SensorStation:
        station = SensorStation(
            code=data["code"],
            name=data["name"],
            station_type=data["station_type"],
            geom=geojson_to_wkb(data["geometry"]),
            elevation_m=data.get("elevation_m"),
            farm_id=data.get("farm_id"),
            admin_zone_id=data["admin_zone_id"],
            sensor_config=data.get("sensor_config", {}),
            data_frequency_minutes=data.get("data_frequency_minutes", 60),
        )
        self.db.add(station)
        await self.db.flush()
        await self.db.refresh(station)
        return station

    async def update_station(self, station_id: str, data: dict[str, Any]) -> SensorStation | None:
        result = await self.db.execute(
            select(SensorStation).where(SensorStation.id == station_id, SensorStation.is_deleted == False)
        )
        station = result.scalars().first()
        if station is None:
            return None

        for field, value in data.items():
            if value is not None:
                if field == "geometry":
                    setattr(station, "geom", geojson_to_wkb(value))
                else:
                    setattr(station, field, value)

        await self.db.flush()
        await self.db.refresh(station)
        return station

    async def get_station(self, station_id: str) -> SensorStation | None:
        result = await self.db.execute(
            select(SensorStation).where(SensorStation.id == station_id, SensorStation.is_deleted == False)
        )
        return result.scalars().first()

    async def get_stations(
        self,
        admin_zone_id: str | None = None,
        farm_id: str | None = None,
        station_type: str | None = None,
        status: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> tuple[list[SensorStation], int]:
        conditions = [SensorStation.is_deleted == False]

        if admin_zone_id:
            conditions.append(SensorStation.admin_zone_id == admin_zone_id)
        if farm_id:
            conditions.append(SensorStation.farm_id == farm_id)
        if station_type:
            conditions.append(SensorStation.station_type == station_type)
        if status:
            conditions.append(SensorStation.status == status)

        count_q = select(func.count(SensorStation.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_q)
        total = count_result.scalar() or 0

        q = (
            select(SensorStation)
            .where(and_(*conditions))
            .order_by(SensorStation.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(q)
        stations = result.scalars().all()

        return stations, total

    async def ingest_reading(self, data: dict[str, Any]) -> SensorReading:
        reading = SensorReading(
            station_id=data["station_id"],
            recorded_at=data["recorded_at"],
            temperature_c=data.get("temperature_c"),
            humidity_pct=data.get("humidity_pct"),
            soil_moisture_pct=data.get("soil_moisture_pct"),
            soil_temp_c=data.get("soil_temp_c"),
            salinity_ppt=data.get("salinity_ppt"),
            ph=data.get("ph"),
            water_level_cm=data.get("water_level_cm"),
            rainfall_mm=data.get("rainfall_mm"),
            wind_speed_ms=data.get("wind_speed_ms"),
            wind_direction_deg=data.get("wind_direction_deg"),
            raw_data=data.get("raw_data", {}),
            quality_flag=data.get("quality_flag", "good"),
        )
        self.db.add(reading)

        station_result = await self.db.execute(
            select(SensorStation).where(SensorStation.id == data["station_id"])
        )
        station = station_result.scalars().first()
        if station:
            station.last_data_at = datetime.now(timezone.utc)

        await self.db.flush()
        await self.db.refresh(reading)
        return reading

    async def bulk_ingest_readings(self, readings_data: list[dict[str, Any]]) -> list[SensorReading]:
        readings: list[SensorReading] = []
        station_ids = set()
        for item in readings_data:
            reading = SensorReading(
                station_id=item["station_id"],
                recorded_at=item["recorded_at"],
                temperature_c=item.get("temperature_c"),
                humidity_pct=item.get("humidity_pct"),
                soil_moisture_pct=item.get("soil_moisture_pct"),
                soil_temp_c=item.get("soil_temp_c"),
                salinity_ppt=item.get("salinity_ppt"),
                ph=item.get("ph"),
                water_level_cm=item.get("water_level_cm"),
                rainfall_mm=item.get("rainfall_mm"),
                wind_speed_ms=item.get("wind_speed_ms"),
                wind_direction_deg=item.get("wind_direction_deg"),
                raw_data=item.get("raw_data", {}),
                quality_flag=item.get("quality_flag", "good"),
            )
            self.db.add(reading)
            readings.append(reading)
            station_ids.add(item["station_id"])

        for sid in station_ids:
            st_result = await self.db.execute(
                select(SensorStation).where(SensorStation.id == sid)
            )
            st = st_result.scalars().first()
            if st:
                st.last_data_at = datetime.now(timezone.utc)

        await self.db.flush()
        for r in readings:
            await self.db.refresh(r)
        return readings

    async def get_readings(
        self,
        station_id: str,
        start_time: datetime | None = None,
        end_time: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[SensorReading], int]:
        conditions = [SensorReading.station_id == station_id]

        if start_time:
            conditions.append(SensorReading.recorded_at >= start_time)
        if end_time:
            conditions.append(SensorReading.recorded_at <= end_time)

        count_q = select(func.count(SensorReading.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_q)
        total = count_result.scalar() or 0

        q = (
            select(SensorReading)
            .where(and_(*conditions))
            .order_by(SensorReading.recorded_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(q)
        readings = result.scalars().all()

        return readings, total

    async def get_aggregated_readings(
        self,
        station_id: str,
        start_time: datetime,
        end_time: datetime,
        interval_minutes: int = 60,
    ) -> list[dict[str, Any]]:
        stmt = text("""
            SELECT
                date_trunc('hour', recorded_at) + INTERVAL ':interval_minutes minutes' *
                    (EXTRACT(MINUTE FROM recorded_at)::integer / :interval_minutes) AS period_start,
                date_trunc('hour', recorded_at) + INTERVAL ':interval_minutes minutes' *
                    (EXTRACT(MINUTE FROM recorded_at)::integer / :interval_minutes) + INTERVAL ':interval_minutes minutes' AS period_end,
                COUNT(*) AS reading_count,
                AVG(temperature_c) AS avg_temperature_c,
                MAX(temperature_c) AS max_temperature_c,
                MIN(temperature_c) AS min_temperature_c,
                AVG(humidity_pct) AS avg_humidity_pct,
                AVG(soil_moisture_pct) AS avg_soil_moisture_pct,
                AVG(salinity_ppt) AS avg_salinity_ppt,
                SUM(rainfall_mm) AS total_rainfall_mm,
                AVG(water_level_cm) AS avg_water_level_cm
            FROM sensor_readings
            WHERE station_id = :station_id
                AND recorded_at BETWEEN :start_time AND :end_time
            GROUP BY period_start, period_end
            ORDER BY period_start
        """).bindparams(
            station_id=station_id,
            start_time=start_time,
            end_time=end_time,
            interval_minutes=interval_minutes,
        )

        result = await self.db.execute(stmt)
        rows = result.fetchall()
        aggregated = []
        for row in rows:
            aggregated.append({
                "station_id": station_id,
                "period_start": row[0],
                "period_end": row[1],
                "reading_count": row[2],
                "avg_temperature_c": row[3],
                "max_temperature_c": row[4],
                "min_temperature_c": row[5],
                "avg_humidity_pct": row[6],
                "avg_soil_moisture_pct": row[7],
                "avg_salinity_ppt": row[8],
                "total_rainfall_mm": row[9],
                "avg_water_level_cm": row[10],
            })
        return aggregated

    async def get_latest_readings_for_farm(
        self,
        farm_id: str,
        limit_per_station: int = 1,
    ) -> list[SensorReading]:
        stations_result = await self.db.execute(
            select(SensorStation.id).where(
                SensorStation.farm_id == farm_id,
                SensorStation.is_deleted == False,
                SensorStation.status == "active",
            )
        )
        station_ids = [row[0] for row in stations_result.fetchall()]

        all_readings: list[SensorReading] = []
        for sid in station_ids:
            q = (
                select(SensorReading)
                .where(SensorReading.station_id == sid)
                .order_by(SensorReading.recorded_at.desc())
                .limit(limit_per_station)
            )
            result = await self.db.execute(q)
            all_readings.extend(result.scalars().all())

        return all_readings
