import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy import select, func, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.deps import get_current_active_user
from app.core.security import decode_token
from app.models.fintech import User, UserRole
from app.models.geospatial import Alert, AlertSubscription
from app.schemas.alert import (
    AlertResponse,
    AlertSubscriptionCreate,
    AlertSubscriptionResponse,
    PaginatedAlerts,
)
from app.services.alert_service import AlertService
from app.utils.helpers import http_not_found

router = APIRouter()


@router.get("/", response_model=PaginatedAlerts)
async def list_alerts(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
    alert_type: str | None = Query(None),
    severity: str | None = Query(None),
    is_read: bool | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> PaginatedAlerts:
    service = AlertService(db)
    offset = (page - 1) * page_size
    alerts, total = await service.get_alerts_for_user(
        user_id=current_user.id,
        limit=page_size,
        offset=offset,
        alert_type=alert_type,
        severity=severity,
        is_read=is_read,
    )
    return PaginatedAlerts(
        items=[AlertResponse.model_validate(a) for a in alerts],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> AlertResponse:
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalars().first()
    if alert is None:
        raise http_not_found("Alert")
    return AlertResponse.model_validate(alert)


@router.post("/{alert_id}/read", response_model=AlertResponse)
async def mark_alert_read(
    alert_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> AlertResponse:
    service = AlertService(db)
    alert = await service.mark_as_read(alert_id, current_user.id)
    if alert is None:
        raise http_not_found("Alert")
    return AlertResponse.model_validate(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> AlertResponse:
    service = AlertService(db)
    alert = await service.acknowledge_alert(alert_id, current_user.id)
    if alert is None:
        raise http_not_found("Alert")
    return AlertResponse.model_validate(alert)


@router.post("/read-all", status_code=200)
async def mark_all_read(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> dict[str, str]:
    result = await db.execute(
        select(Alert).where(Alert.user_id == current_user.id, Alert.is_read == False)
    )
    alerts = result.scalars().all()
    for alert in alerts:
        alert.is_read = True
    await db.flush()
    return {"status": "ok", "count": str(len(alerts))}


@router.get("/subscriptions/", response_model=list[AlertSubscriptionResponse])
async def list_subscriptions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[AlertSubscriptionResponse]:
    service = AlertService(db)
    subs = await service.get_subscriptions(current_user.id)
    return [AlertSubscriptionResponse.model_validate(s) for s in subs]


@router.post("/subscriptions/", response_model=AlertSubscriptionResponse, status_code=201)
async def create_subscription(
    data: AlertSubscriptionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> AlertSubscriptionResponse:
    service = AlertService(db)
    sub = await service.subscribe(current_user.id, data.model_dump())
    return AlertSubscriptionResponse.model_validate(sub)


@router.delete("/subscriptions/{subscription_id}", status_code=204)
async def delete_subscription(
    subscription_id: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> None:
    service = AlertService(db)
    success = await service.unsubscribe(subscription_id, current_user.id)
    if not success:
        raise http_not_found("Subscription")


@router.websocket("/ws")
async def alert_websocket(
    websocket: WebSocket,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await websocket.accept()

    try:
        token_data = await websocket.receive_text()
        payload = decode_token(token_data)
        user_id = payload.get("sub")
        if user_id is None:
            await websocket.send_json({"error": "Invalid token"})
            await websocket.close()
            return

        service = AlertService(db)
        last_check = None

        while True:
            try:
                data = await websocket.receive_text()
                msg = json.loads(data)

                if msg.get("action") == "ping":
                    await websocket.send_json({"action": "pong"})
                elif msg.get("action") == "get_alerts":
                    limit = msg.get("limit", 10)
                    alerts, _ = await service.get_alerts_for_user(
                        user_id=user_id, limit=limit
                    )
                    await websocket.send_json({
                        "action": "alerts",
                        "alerts": [AlertResponse.model_validate(a).model_dump(mode="json") for a in alerts],
                    })

            except WebSocketDisconnect:
                break
            except Exception:
                await websocket.send_json({"error": "Internal error"})

    except Exception:
        await websocket.close()
