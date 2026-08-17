from __future__ import annotations

from zynora_ai.core.geometry.intersections import (
    distance_between_polygons,
    nearby_polygon_edge_length,
    shared_polygon_edge_length,
)
from zynora_ai.core.models.room import Room


class RoomGraphBuilder:
    """
    Build room adjacency relationships.

    Rooms may be separated by the thickness of a wall, so adjacency
    is determined using both direct shared boundaries and nearby
    parallel boundaries.
    """

    def build(
        self,
        rooms: list[Room],
        minimum_boundary_length: float = 10.0,
        maximum_wall_gap: float = 30.0,
    ) -> None:
        for room in rooms:
            room.adjacent_rooms.clear()

        for first_index in range(len(rooms)):
            room_a = rooms[first_index]

            for second_index in range(
                first_index + 1,
                len(rooms),
            ):
                room_b = rooms[second_index]

                shared_length = shared_polygon_edge_length(
                    room_a.polygon,
                    room_b.polygon,
                )

                nearby_length = nearby_polygon_edge_length(
                    room_a.polygon,
                    room_b.polygon,
                    maximum_gap=maximum_wall_gap,
                )

                polygon_distance = distance_between_polygons(
                    room_a.polygon,
                    room_b.polygon,
                )

                directly_touching = (
                    shared_length >= minimum_boundary_length
                )

                separated_by_wall = (
                    polygon_distance <= maximum_wall_gap
                    and nearby_length >= minimum_boundary_length
                )

                if not directly_touching and not separated_by_wall:
                    continue

                room_a.adjacent_rooms.append(room_b.id)
                room_b.adjacent_rooms.append(room_a.id)