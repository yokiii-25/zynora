from .intersections import (
    DEFAULT_TOLERANCE,
    distance_between_polygons,
    distance_between_segments,
    distance_point_to_segment,
    point_distance,
    point_in_polygon,
    point_on_segment,
    polygon_edges,
    segments_intersect,
    shared_edge_length,
    shared_polygon_edge_length,
)
from .polygon import (
    BoundingBox,
    polygon_area,
    polygon_bounding_box,
    polygon_centroid,
    polygon_perimeter,
)
from .room_math import (
    RoomGeometry,
    calculate_room_geometry,
)

__all__ = [
    "BoundingBox",
    "DEFAULT_TOLERANCE",
    "RoomGeometry",
    "calculate_room_geometry",
    "distance_between_polygons",
    "distance_between_segments",
    "distance_point_to_segment",
    "point_distance",
    "point_in_polygon",
    "point_on_segment",
    "polygon_area",
    "polygon_bounding_box",
    "polygon_centroid",
    "polygon_edges",
    "polygon_perimeter",
    "segments_intersect",
    "shared_edge_length",
    "shared_polygon_edge_length",
]