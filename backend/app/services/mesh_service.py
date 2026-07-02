import time
import struct
import hashlib
from datetime import datetime, timezone
from typing import Any

from app.core.config import settings

PROTOCOL_VERSION = 0x4444
FRAME_SIZE = 64
FRAME_TYPES = {0x01: "HEARTBEAT", 0x02: "ALERT", 0x03: "COORD", 0x04: "TOKEN", 0x05: "GOV_VOTE"}
ALERT_TYPES = {0x01: "FLOOD", 0x02: "SALINITY", 0x03: "STORM", 0x04: "EARTHQUAKE"}
MAX_HOPS = 15


def _build_crc16_table() -> list[int]:
    table = []
    for i in range(256):
        crc = i
        for _ in range(8):
            if crc & 1:
                crc = (crc >> 1) ^ 0xA001
            else:
                crc >>= 1
        table.append(crc)
    return table


CRC16_TABLE = _build_crc16_table()


def compute_checksum(data: bytes) -> int:
    crc = 0xFFFF
    for byte in data:
        crc = (crc >> 8) ^ CRC16_TABLE[(crc ^ byte) & 0xFF]
    return (crc ^ 0xFFFF) & 0xFFFF


def verify_frame_integrity(frame_data: bytes) -> dict[str, Any]:
    if len(frame_data) != FRAME_SIZE:
        return {"valid": False, "error": f"Invalid frame size: {len(frame_data)}"}

    version = (frame_data[0] << 8) | frame_data[1]
    if version != PROTOCOL_VERSION:
        return {"valid": False, "error": f"Invalid protocol version: {hex(version)}"}

    stored_crc = (frame_data[16] << 8) | frame_data[17]
    temp = bytearray(frame_data)
    temp[16] = 0
    temp[17] = 0
    computed_crc = compute_checksum(bytes(temp))

    if stored_crc != computed_crc:
        return {"valid": False, "error": f"Checksum mismatch: stored={stored_crc:04x} computed={computed_crc:04x}"}

    return {"valid": True, "error": None}


def parse_frame(frame_data: bytes) -> dict[str, Any] | None:
    integrity = verify_frame_integrity(frame_data)
    if not integrity["valid"]:
        return None

    frame_type = frame_data[2]
    hop_count = frame_data[3]
    source_id = struct.unpack(">I", frame_data[4:8])[0]
    dest_id = struct.unpack(">I", frame_data[8:12])[0]
    seq_num = struct.unpack(">I", frame_data[12:16])[0]
    encryption_flag = frame_data[18]
    payload = frame_data[24:64]

    result: dict[str, Any] = {
        "protocol_version": PROTOCOL_VERSION,
        "frame_type": frame_type,
        "frame_type_name": FRAME_TYPES.get(frame_type, "UNKNOWN"),
        "hop_count": hop_count,
        "source_id": f"{source_id:08x}",
        "dest_id": f"{dest_id:08x}",
        "sequence_number": seq_num,
        "encryption_flag": encryption_flag,
        "payload_hex": payload.hex(),
    }

    if frame_type == 0x02 and len(payload) >= 28:
        alert_type = payload[0]
        severity = payload[1]
        lat = struct.unpack(">d", payload[8:16])[0]
        lng = struct.unpack(">d", payload[16:24])[0]
        radius = (payload[24] << 8) | payload[25]
        timestamp = (payload[26] << 8) | payload[27]
        result["alert"] = {
            "alert_type": alert_type,
            "alert_type_name": ALERT_TYPES.get(alert_type, "UNKNOWN"),
            "severity": severity,
            "latitude": lat,
            "longitude": lng,
            "radius_m": radius,
            "timestamp_minutes": timestamp,
        }

    return result


_mesh_nodes: dict[str, dict[str, Any]] = {}
_mesh_message_log: list[dict[str, Any]] = []
_mesh_relay_count = 0


async def register_node(device_id: str, public_key: str, location: dict[str, float] | None = None) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    node = {
        "device_id": device_id,
        "public_key": public_key,
        "location": location or {"lat": 0.0, "lng": 0.0},
        "registered_at": now.isoformat(),
        "last_seen": now.isoformat(),
        "messages_relayed": 0,
        "is_active": True,
    }
    _mesh_nodes[device_id] = node
    return node


async def relay_message(encoded_frame: bytes, from_device: str) -> dict[str, Any]:
    global _mesh_relay_count

    integrity = verify_frame_integrity(encoded_frame)
    if not integrity["valid"]:
        return {"success": False, "error": integrity["error"]}

    parsed = parse_frame(encoded_frame)
    if parsed is None:
        return {"success": False, "error": "Failed to parse frame"}

    _mesh_relay_count += 1

    if from_device in _mesh_nodes:
        _mesh_nodes[from_device]["last_seen"] = datetime.now(timezone.utc).isoformat()
        _mesh_nodes[from_device]["messages_relayed"] += 1

    hop_count = parsed.get("hop_count", 0)
    if hop_count >= MAX_HOPS:
        return {"success": False, "error": "Max hop count exceeded", "parsed": parsed}

    parsed["hop_count"] = hop_count + 1

    return {"success": True, "parsed": parsed}


async def get_network_stats() -> dict[str, Any]:
    active_nodes = [n for n in _mesh_nodes.values() if n.get("is_active", False)]

    total_lat = 0.0
    total_lng = 0.0
    count = 0
    min_lat = 90.0
    max_lat = -90.0
    min_lng = 180.0
    max_lng = -180.0

    for node in active_nodes:
        loc = node.get("location", {})
        lat = loc.get("lat", 0)
        lng = loc.get("lng", 0)
        if lat != 0 or lng != 0:
            total_lat += lat
            total_lng += lng
            count += 1
            min_lat = min(min_lat, lat)
            max_lat = max(max_lat, lat)
            min_lng = min(min_lng, lng)
            max_lng = max(max_lng, lng)

    coverage_area = 0
    if count > 1:
        approx_width_km = (max_lng - min_lng) * 111.32 * 0.965
        approx_height_km = (max_lat - min_lat) * 111.32
        coverage_area = approx_width_km * approx_height_km

    avg_hops = 0
    if _mesh_message_log:
        avg_hops = sum(m.get("hop_count", 0) for m in _mesh_message_log) / len(_mesh_message_log)

    return {
        "active_nodes": len(active_nodes),
        "total_nodes": len(_mesh_nodes),
        "messages_relayed": _mesh_relay_count,
        "messages_logged": len(_mesh_message_log),
        "coverage_area_km2": round(coverage_area, 2),
        "avg_hops": round(avg_hops, 2),
        "protocol_version": f"{PROTOCOL_VERSION:04x}",
    }


async def get_network_graph() -> dict[str, Any]:
    nodes_list = []
    for device_id, node in _mesh_nodes.items():
        nodes_list.append({
            "id": device_id,
            "type": node.get("type", "endpoint"),
            "active": node.get("is_active", False),
            "location": node.get("location", {"lat": 0, "lng": 0}),
            "last_seen": node.get("last_seen", ""),
        })

    return {
        "nodes": nodes_list,
        "edges": [],
        "message_count": _mesh_relay_count,
    }


async def store_message_log(frame: dict[str, Any], received_at: str | None = None) -> None:
    _mesh_message_log.append({
        "timestamp": received_at or datetime.now(timezone.utc).isoformat(),
        "frame_type": frame.get("frame_type"),
        "frame_type_name": frame.get("frame_type_name", "UNKNOWN"),
        "source_id": frame.get("source_id", ""),
        "dest_id": frame.get("dest_id", ""),
        "hop_count": frame.get("hop_count", 0),
        "sequence_number": frame.get("sequence_number", 0),
    })


async def get_active_nodes() -> list[dict[str, Any]]:
    return [n for n in _mesh_nodes.values() if n.get("is_active", False)]


async def broadcast_alert(
    alert_type: int,
    severity: int,
    latitude: float,
    longitude: float,
    radius: int,
    source_device: str,
) -> dict[str, Any]:
    import struct

    payload = bytearray(40)
    payload[0] = alert_type
    payload[1] = max(1, min(10, severity))
    struct.pack_into(">d", payload, 8, latitude)
    struct.pack_into(">d", payload, 16, longitude)
    payload[24] = (radius >> 8) & 0xFF
    payload[25] = radius & 0xFF
    ts = int(time.time() / 60)
    payload[26] = (ts >> 8) & 0xFF
    payload[27] = ts & 0xFF

    frame = bytearray(FRAME_SIZE)
    frame[0] = (PROTOCOL_VERSION >> 8) & 0xFF
    frame[1] = PROTOCOL_VERSION & 0xFF
    frame[2] = 0x02
    frame[3] = 0

    src_id = int(hashlib.sha256(source_device.encode()).hexdigest()[:8], 16)
    struct.pack_into(">I", frame, 4, src_id)
    struct.pack_into(">I", frame, 8, 0)
    struct.pack_into(">I", frame, 12, 0)
    frame[18] = 0x00
    frame[24:64] = payload

    crc = compute_checksum(bytes(frame))
    frame[16] = (crc >> 8) & 0xFF
    frame[17] = crc & 0xFF

    parsed = parse_frame(bytes(frame))
    if parsed:
        await store_message_log(parsed, datetime.now(timezone.utc).isoformat())

    return {
        "success": True,
        "frame_hex": frame.hex(),
        "parsed": parsed,
    }
