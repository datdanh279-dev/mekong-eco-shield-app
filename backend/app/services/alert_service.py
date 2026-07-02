from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.geospatial import (
    Alert,
    AlertSubscription,
    FloodPrediction,
    SalinityPrediction,
)
from app.models.fintech import User


class AlertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_alert(
        self,
        alert_type: str,
        severity: str,
        title: str,
        message: str,
        user_id: str | None = None,
        farm_id: str | None = None,
        admin_zone_id: str | None = None,
        flood_prediction_id: str | None = None,
        salinity_prediction_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> Alert:
        alert = Alert(
            alert_type=alert_type,
            severity=severity,
            title=title,
            message=message,
            user_id=user_id,
            farm_id=farm_id,
            admin_zone_id=admin_zone_id,
            flood_prediction_id=flood_prediction_id,
            salinity_prediction_id=salinity_prediction_id,
            metadata=metadata or {},
        )
        self.db.add(alert)
        await self.db.flush()
        await self.db.refresh(alert)
        return alert

    async def get_alerts_for_user(
        self,
        user_id: str,
        limit: int = 20,
        offset: int = 0,
        alert_type: str | None = None,
        severity: str | None = None,
        is_read: bool | None = None,
    ) -> tuple[list[Alert], int]:
        conditions = [Alert.user_id == user_id]

        if alert_type:
            conditions.append(Alert.alert_type == alert_type)
        if severity:
            conditions.append(Alert.severity == severity)
        if is_read is not None:
            conditions.append(Alert.is_read == is_read)

        count_q = select(func.count(Alert.id)).where(and_(*conditions))
        count_result = await self.db.execute(count_q)
        total = count_result.scalar() or 0

        q = (
            select(Alert)
            .where(and_(*conditions))
            .order_by(Alert.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(q)
        alerts = result.scalars().all()

        return alerts, total

    async def mark_as_read(self, alert_id: str, user_id: str) -> Alert | None:
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id)
        )
        alert = result.scalars().first()
        if alert:
            alert.is_read = True
            await self.db.flush()
            await self.db.refresh(alert)
        return alert

    async def acknowledge_alert(self, alert_id: str, user_id: str) -> Alert | None:
        result = await self.db.execute(
            select(Alert).where(Alert.id == alert_id, Alert.user_id == user_id)
        )
        alert = result.scalars().first()
        if alert:
            alert.is_acknowledged = True
            alert.acknowledged_at = datetime.now(timezone.utc)
            await self.db.flush()
            await self.db.refresh(alert)
        return alert

    async def generate_flood_alerts(
        self,
        prediction_id: str,
    ) -> list[Alert]:
        pred_result = await self.db.execute(
            select(FloodPrediction).where(FloodPrediction.id == prediction_id)
        )
        prediction = pred_result.scalars().first()
        if prediction is None:
            return []

        sub_result = await self.db.execute(
            select(AlertSubscription)
            .where(
                AlertSubscription.is_active == True,
                AlertSubscription.alert_types.contains(["flood"]),
            )
            .options(selectinload(AlertSubscription.user))
        )
        subscriptions = sub_result.scalars().all()

        alerts: list[Alert] = []
        for sub in subscriptions:
            alert = await self.create_alert(
                alert_type="flood",
                severity="high" if prediction.confidence > 0.7 else "medium",
                title=f"Flood Warning - {prediction.valid_from.date()}",
                message=f"Flood depth up to {prediction.max_depth_m}m, "
                        f"affecting {prediction.affected_area_ha}ha. "
                        f"Confidence: {prediction.confidence:.0%}",
                user_id=sub.user_id,
                admin_zone_id=sub.admin_zone_id,
                flood_prediction_id=prediction.id,
                metadata={
                    "max_depth_m": prediction.max_depth_m,
                    "affected_area_ha": prediction.affected_area_ha,
                    "confidence": prediction.confidence,
                    "valid_from": prediction.valid_from.isoformat(),
                    "valid_to": prediction.valid_to.isoformat(),
                },
            )
            alerts.append(alert)

        return alerts

    async def generate_salinity_alerts(
        self,
        prediction_id: str,
    ) -> list[Alert]:
        pred_result = await self.db.execute(
            select(SalinityPrediction).where(SalinityPrediction.id == prediction_id)
        )
        prediction = pred_result.scalars().first()
        if prediction is None:
            return []

        sub_result = await self.db.execute(
            select(AlertSubscription)
            .where(
                AlertSubscription.is_active == True,
                AlertSubscription.alert_types.contains(["salinity"]),
            )
            .options(selectinload(AlertSubscription.user))
        )
        subscriptions = sub_result.scalars().all()

        alerts: list[Alert] = []
        for sub in subscriptions:
            alert = await self.create_alert(
                alert_type="salinity",
                severity="high" if prediction.confidence > 0.7 else "medium",
                title=f"Salinity Warning - {prediction.valid_from.date()}",
                message=f"Salinity up to {prediction.max_salinity_ppt}ppt, "
                        f"intrusion {prediction.intrusion_km}km. "
                        f"Confidence: {prediction.confidence:.0%}",
                user_id=sub.user_id,
                admin_zone_id=sub.admin_zone_id,
                salinity_prediction_id=prediction.id,
                metadata={
                    "max_salinity_ppt": prediction.max_salinity_ppt,
                    "intrusion_km": prediction.intrusion_km,
                    "confidence": prediction.confidence,
                    "valid_from": prediction.valid_from.isoformat(),
                    "valid_to": prediction.valid_to.isoformat(),
                },
            )
            alerts.append(alert)

        return alerts

    async def subscribe(self, user_id: str, data: dict[str, Any]) -> AlertSubscription:
        sub = AlertSubscription(
            user_id=user_id,
            alert_types=data["alert_types"],
            channels=data["channels"],
            admin_zone_id=data.get("admin_zone_id"),
            farm_id=data.get("farm_id"),
            min_severity=data.get("min_severity", "info"),
            max_frequency_minutes=data.get("max_frequency_minutes", 60),
        )
        self.db.add(sub)
        await self.db.flush()
        await self.db.refresh(sub)
        return sub

    async def unsubscribe(self, subscription_id: str, user_id: str) -> bool:
        result = await self.db.execute(
            select(AlertSubscription).where(
                AlertSubscription.id == subscription_id,
                AlertSubscription.user_id == user_id,
            )
        )
        sub = result.scalars().first()
        if sub is None:
            return False
        sub.is_active = False
        await self.db.flush()
        return True

    async def get_subscriptions(self, user_id: str) -> list[AlertSubscription]:
        result = await self.db.execute(
            select(AlertSubscription)
            .where(AlertSubscription.user_id == user_id, AlertSubscription.is_active == True)
        )
        return list(result.scalars().all())
