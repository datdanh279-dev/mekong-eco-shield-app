from typing import Any

from geoalchemy2 import WKBElement
from geoalchemy2.shape import to_shape, from_shape
from shapely.geometry import shape, mapping
from shapely import wkb
import shapely


def wkb_to_geojson(wkb_element: WKBElement) -> dict[str, Any] | None:
    if wkb_element is None:
        return None
    try:
        geom = to_shape(wkb_element)
        return mapping(geom)
    except Exception:
        return None


def geojson_to_wkb(geojson_dict: dict[str, Any], srid: int = 4326) -> WKBElement:
    geom = shape(geojson_dict)
    return from_shape(geom, srid=srid)


def validate_coordinates(geojson_dict: dict[str, Any]) -> bool:
    try:
        geom = shape(geojson_dict)
        return geom.is_valid
    except Exception:
        return False


def calculate_area_ha(geojson_dict: dict[str, Any]) -> float:
    geom = shape(geojson_dict)
    if geom.is_empty:
        return 0.0
    geom_mercator = shapely.transform(
        geom,
        lambda x, y, z=None: _to_mercator(x, y),
        include_z=False,
    )
    area_sq_m = geom_mercator.area  # type: ignore
    return area_sq_m / 10000.0


def _to_mercator(x: float, y: float) -> tuple[float, float]:
    import math

    lon_rad = math.radians(x)
    lat_rad = math.radians(y)
    merc_x = 6378137.0 * lon_rad
    merc_y = 6378137.0 * math.log(math.tan(math.pi / 4.0 + lat_rad / 2.0))
    return merc_x, merc_y


def compute_centroid(geojson_dict: dict[str, Any]) -> dict[str, Any]:
    geom = shape(geojson_dict)
    centroid = geom.centroid
    return mapping(centroid)
