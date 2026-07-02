from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services import mesh_service

router = APIRouter()


class RegisterNodeRequest(BaseModel):
    device_id: str = Field(..., min_length=1, max_length=64)
    public_key: str = Field(..., min_length=1)
    location: dict[str, float] | None = None


class RelayMessageRequest(BaseModel):
    encoded_frame: str = Field(..., description="Hex-encoded 64-byte mesh frame")
    from_device: str = Field(..., min_length=1)


class BroadcastAlertRequest(BaseModel):
    alert_type: int = Field(..., ge=1, le=4)
    severity: int = Field(..., ge=1, le=10)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    radius: int = Field(..., ge=0, le=10000)
    source_device: str = Field(..., min_length=1)


class MeshStatsResponse(BaseModel):
    active_nodes: int
    total_nodes: int
    messages_relayed: int
    messages_logged: int
    coverage_area_km2: float
    avg_hops: float
    protocol_version: str


class NetworkGraphResponse(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    message_count: int


class RelayResponse(BaseModel):
    success: bool
    error: str | None = None
    parsed: dict[str, Any] | None = None


class BroadcastResponse(BaseModel):
    success: bool
    frame_hex: str
    parsed: dict[str, Any] | None = None


class RegisterNodeResponse(BaseModel):
    device_id: str
    public_key: str
    location: dict[str, float]
    registered_at: str
    last_seen: str
    messages_relayed: int
    is_active: bool


@router.post("/register", response_model=RegisterNodeResponse)
async def register_node(req: RegisterNodeRequest):
    node = await mesh_service.register_node(req.device_id, req.public_key, req.location)
    return node


@router.post("/relay", response_model=RelayResponse)
async def relay_message(req: RelayMessageRequest):
    try:
        frame_bytes = bytes.fromhex(req.encoded_frame)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid hex encoding")

    result = await mesh_service.relay_message(frame_bytes, req.from_device)
    return result


@router.get("/network", response_model=NetworkGraphResponse)
async def get_network():
    graph = await mesh_service.get_network_graph()
    return graph


@router.get("/stats", response_model=MeshStatsResponse)
async def get_stats():
    stats = await mesh_service.get_network_stats()
    return stats


@router.get("/nodes")
async def list_active_nodes():
    nodes = await mesh_service.get_active_nodes()
    return {"nodes": nodes, "count": len(nodes)}


@router.post("/broadcast", response_model=BroadcastResponse)
async def broadcast_alert(req: BroadcastAlertRequest):
    result = await mesh_service.broadcast_alert(
        alert_type=req.alert_type,
        severity=req.severity,
        latitude=req.latitude,
        longitude=req.longitude,
        radius=req.radius,
        source_device=req.source_device,
    )
    return result
