from zynora_ai.core.geometry.intersections import (
    distance_between_polygons,
    point_in_polygon,
    shared_polygon_edge_length,
)
from zynora_ai.core.models.point import Point


def rectangle(
    min_x: float,
    min_y: float,
    max_x: float,
    max_y: float,
) -> list[Point]:
    return [
        Point(min_x, min_y),
        Point(max_x, min_y),
        Point(max_x, max_y),
        Point(min_x, max_y),
    ]


def main() -> None:
    room_a = rectangle(
        0.0,
        0.0,
        100.0,
        100.0,
    )

    room_b = rectangle(
        100.0,
        20.0,
        200.0,
        80.0,
    )

    room_c = rectangle(
        250.0,
        0.0,
        350.0,
        100.0,
    )

    shared_a_b = shared_polygon_edge_length(
        room_a,
        room_b,
    )

    distance_a_b = distance_between_polygons(
        room_a,
        room_b,
    )

    distance_a_c = distance_between_polygons(
        room_a,
        room_c,
    )

    inside = point_in_polygon(
        Point(50.0, 50.0),
        room_a,
    )

    outside = point_in_polygon(
        Point(150.0, 50.0),
        room_a,
    )

    print("=" * 60)
    print("ZYNORA GEOMETRY INTERSECTION TEST")
    print("=" * 60)

    print(
        f"Room A and B shared edge : "
        f"{shared_a_b:.2f}"
    )

    print(
        f"Room A and B distance    : "
        f"{distance_a_b:.2f}"
    )

    print(
        f"Room A and C distance    : "
        f"{distance_a_c:.2f}"
    )

    print(
        f"Point inside Room A      : "
        f"{inside}"
    )

    print(
        f"Point outside Room A     : "
        f"{outside}"
    )

    print("=" * 60)


if __name__ == "__main__":
    main()