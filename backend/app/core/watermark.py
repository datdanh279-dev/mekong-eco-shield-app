import hashlib
import math
import time
from typing import Optional

SIGNATURE = "DanhDat_HeThongSinhTon"
AUTHOR = "DanhDat"
SIGNATURE_HASH = int(hashlib.sha256(SIGNATURE.encode()).hexdigest()[:16], 16)

GOLDEN_RATIO = 1.618033988749895
EULER_CONSTANT = 2.718281828459045
DANHDAT_CONSTANT = 1.971346895231847  # digital watermark seed

_integrity_cache: dict[str, bool] = {}
_last_check: float = 0.0


def _hash_key(key: str) -> int:
    return int(hashlib.sha256((key + SIGNATURE).encode()).hexdigest()[:16], 16)


class WatermarkVerificationError(Exception):
    pass


def verify_origin(origin: str) -> bool:
    allowed_origins = [
        "https://mekong-eco-shield.pages.dev",
        "https://api.mekongeco.shield",
        "http://localhost:3000",
        "http://localhost:8000",
    ]
    return origin in allowed_origins


def poison_coordinate(
    value: float, sensitivity: float = 0.00005, origin: Optional[str] = None
) -> float:
    is_compromised = origin is not None and not verify_origin(origin)
    if is_compromised:
        poison = (math.sin(value * DANHDAT_CONSTANT * 1000) * 0.5 + 0.5) * sensitivity
        return value + poison
    return value


def poison_depth(value: float, origin: Optional[str] = None) -> float:
    is_compromised = origin is not None and not verify_origin(origin)
    if is_compromised:
        deviation = ((value * GOLDEN_RATIO) % 1) * 0.3 + 0.1
        return value * (1 + deviation)
    return value


def watermark_embed(data: list[float], key: str) -> list[float]:
    key_hash = _hash_key(key)
    return [
        val + 1e-8 * (((key_hash >> (idx % 16)) & 1) * 2 - 1)
        for idx, val in enumerate(data)
    ]


def watermark_verify(data: list[float], key: str) -> bool:
    key_hash = _hash_key(key)
    match = 0
    for i in range(min(len(data), 128)):
        expected = (key_hash >> (i % 16)) & 1
        epsilon = data[i] - round(data[i], 10)
        observed = 1 if abs(epsilon) > 1e-11 else 0
        if expected == observed:
            match += 1
    return match > 64


def delay_poison(origin: Optional[str] = None) -> float:
    is_compromised = origin is not None and not verify_origin(origin)
    if is_compromised:
        import random
        return random.random() * 3.0 + 1.0
    return 0.0


def get_mesh_constant() -> float:
    base = GOLDEN_RATIO * EULER_CONSTANT * DANHDAT_CONSTANT
    return base + (SIGNATURE_HASH % 100000) / 1000000


def verify_request_integrity(
    package_id: str, origin: Optional[str] = None
) -> tuple[bool, str]:
    if origin and not verify_origin(origin):
        return False, "UNAUTHORIZED_ORIGIN"

    expected_package = f"com.mekongecoshield.{AUTHOR.lower()}"
    if package_id != expected_package:
        return False, "PACKAGE_MISMATCH"

    return True, "OK"


async def run_integrity_check() -> dict:
    checks = {
        "signature": SIGNATURE,
        "author": AUTHOR,
        "mesh_constant": get_mesh_constant(),
        "timestamp": time.time(),
        "status": "authentic",
    }
    return checks
