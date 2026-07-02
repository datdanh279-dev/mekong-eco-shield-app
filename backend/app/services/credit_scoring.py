from datetime import datetime, timezone, timedelta
from typing import Any
from decimal import Decimal

from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.fintech import GreenCreditScore, CreditScoreModel, User
from app.models.geospatial import Farm, SensorReading, FloodPrediction, SalinityPrediction


class CreditScoringService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def calculate_score(
        self,
        farm_id: str,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        farm_result = await self.db.execute(
            select(Farm).where(Farm.id == farm_id, Farm.is_deleted == False)
        )
        farm = farm_result.scalars().first()
        if farm is None:
            raise ValueError("Farm not found")

        farm_area = farm.area_ha
        land_use = farm.land_use.value if hasattr(farm.land_use, "value") else farm.land_use
        is_verified = farm.is_verified

        readings_result = await self.db.execute(
            select(func.avg(SensorReading.soil_moisture_pct).label("avg_moisture"),
                   func.avg(SensorReading.salinity_ppt).label("avg_salinity"),
                   func.avg(SensorReading.ph).label("avg_ph"))
            .where(SensorReading.station.has(farm_id=farm_id))
        )
        readings_agg = readings_result.one()
        avg_moisture = readings_agg.avg_moisture or 50.0
        avg_salinity = readings_agg.avg_salinity or 0.0
        avg_ph = readings_agg.avg_ph or 7.0

        flood_result = await self.db.execute(
            select(FloodPrediction)
            .where(FloodPrediction.footprint.ST_Intersects(farm.geom))
            .order_by(desc(FloodPrediction.created_at))
            .limit(1)
        )
        flood_pred = flood_result.scalars().first()

        flood_risk = flood_pred.confidence if flood_pred else 0.0

        salinity_result = await self.db.execute(
            select(SalinityPrediction)
            .where(SalinityPrediction.footprint.ST_Intersects(farm.geom))
            .order_by(desc(SalinityPrediction.created_at))
            .limit(1)
        )
        salinity_pred = salinity_result.scalars().first()
        salinity_risk = salinity_pred.confidence if salinity_pred else 0.0

        base_score = 50.0
        land_use_bonus = {"rice": 5, "forestry": 15, "fruit": 10, "aquaculture": 5, "other": 0}.get(land_use, 0)
        verification_bonus = 10 if is_verified else 0
        moisture_score = max(0, 10 - abs(avg_moisture - 50) * 0.2)
        ph_score = max(0, 5 - abs(avg_ph - 6.5) * 2)
        salinity_penalty = max(0, avg_salinity * 2)
        flood_penalty = flood_risk * 10
        salinity_risk_penalty = salinity_risk * 10
        area_factor = min(farm_area * 0.01, 5)

        final_score = base_score + land_use_bonus + verification_bonus + moisture_score + ph_score + area_factor - salinity_penalty - flood_penalty - salinity_risk_penalty
        final_score = max(0, min(100, final_score))

        factors = {
            "base_score": base_score,
            "land_use_bonus": land_use_bonus,
            "verification_bonus": verification_bonus,
            "moisture_score": round(moisture_score, 2),
            "ph_score": round(ph_score, 2),
            "area_factor": round(area_factor, 2),
            "salinity_penalty": round(salinity_penalty, 2),
            "flood_penalty": round(flood_penalty, 2),
            "salinity_risk_penalty": round(salinity_risk_penalty, 2),
            "avg_soil_moisture": round(avg_moisture, 2) if avg_moisture else None,
            "avg_salinity_ppt": round(avg_salinity, 2) if avg_salinity else None,
            "avg_ph": round(avg_ph, 2) if avg_ph else None,
            "farm_area_ha": farm_area,
            "land_use": land_use,
            "is_verified": is_verified,
        }

        score_record = GreenCreditScore(
            user_id=user_id,
            farm_id=farm_id,
            score=round(final_score, 2),
            score_model=CreditScoreModel.XGBOOST_V1.value,
            model_version="v1.0.0",
            factors=factors,
            valid_from=datetime.now(timezone.utc),
            valid_until=datetime.now(timezone.utc) + timedelta(days=90),
        )
        self.db.add(score_record)
        await self.db.flush()
        await self.db.refresh(score_record)

        return {
            "id": score_record.id,
            "score": score_record.score,
            "score_model": score_record.score_model,
            "model_version": score_record.model_version,
            "factors": factors,
            "valid_from": score_record.valid_from,
            "valid_until": score_record.valid_until,
            "created_at": score_record.created_at,
        }

    async def get_score_history(
        self,
        farm_id: str,
        limit: int = 10,
        offset: int = 0,
    ) -> tuple[list[GreenCreditScore], int]:
        count_q = select(func.count(GreenCreditScore.id)).where(
            GreenCreditScore.farm_id == farm_id
        )
        count_result = await self.db.execute(count_q)
        total = count_result.scalar() or 0

        q = (
            select(GreenCreditScore)
            .where(GreenCreditScore.farm_id == farm_id)
            .order_by(desc(GreenCreditScore.created_at))
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(q)
        scores = result.scalars().all()

        return scores, total

    async def get_latest_score(
        self,
        farm_id: str,
    ) -> GreenCreditScore | None:
        result = await self.db.execute(
            select(GreenCreditScore)
            .where(GreenCreditScore.farm_id == farm_id)
            .order_by(desc(GreenCreditScore.created_at))
            .limit(1)
        )
        return result.scalars().first()
