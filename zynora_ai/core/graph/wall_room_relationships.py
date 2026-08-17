from __future__ import annotations

from dataclasses import dataclass, field

from zynora_ai.core.geometry.intersections import (
    distance_between_polygons,
    nearby_polygon_edge_length,
)
from zynora_ai.core.models.room import Room
from zynora_ai.core.models.wall import Wall


@dataclass(frozen=True, slots=True)
class WallRoomMatch:
    """
    Represents the geometric relationship between one wall
    and one room.
    """

    wall_id: str
    room_id: str
    distance: float
    nearby_boundary_length: float
    score: float


@dataclass(slots=True)
class WallRoomRelationships:
    """
    Stores wall-to-room and room-to-wall relationships using IDs.

    IDs are used instead of complete objects to avoid circular
    references and simplify future JSON serialization.
    """

    wall_to_rooms: dict[str, list[str]] = field(
        default_factory=dict
    )

    room_to_walls: dict[str, list[str]] = field(
        default_factory=dict
    )

    matches: list[WallRoomMatch] = field(
        default_factory=list
    )

    def rooms_for_wall(
        self,
        wall_id: str,
    ) -> list[str]:
        return self.wall_to_rooms.get(
            wall_id,
            [],
        )

    def walls_for_room(
        self,
        room_id: str,
    ) -> list[str]:
        return self.room_to_walls.get(
            room_id,
            [],
        )


class WallRoomRelationshipBuilder:
    """
    Match wall polygons with the room polygons that border them.

    Internal walls normally border two rooms.
    External walls normally border one room.
    """

    def build(
        self,
        rooms: list[Room],
        walls: list[Wall],
        maximum_gap: float = 20.0,
        minimum_boundary_length: float = 5.0,
        maximum_rooms_per_wall: int = 2,
    ) -> WallRoomRelationships:
        relationships = WallRoomRelationships()

        for wall in walls:
            relationships.wall_to_rooms[
                wall.id
            ] = []

        for room in rooms:
            relationships.room_to_walls[
                room.id
            ] = []

        for wall in walls:
            candidates = self._find_wall_candidates(
                wall=wall,
                rooms=rooms,
                maximum_gap=maximum_gap,
                minimum_boundary_length=(
                    minimum_boundary_length
                ),
            )

            selected_candidates = candidates[
                :maximum_rooms_per_wall
            ]

            for match in selected_candidates:
                relationships.wall_to_rooms[
                    wall.id
                ].append(match.room_id)

                relationships.room_to_walls[
                    match.room_id
                ].append(wall.id)

                relationships.matches.append(
                    match
                )

        return relationships

    def _find_wall_candidates(
        self,
        wall: Wall,
        rooms: list[Room],
        maximum_gap: float,
        minimum_boundary_length: float,
    ) -> list[WallRoomMatch]:
        candidates: list[WallRoomMatch] = []

        if len(wall.polygon) < 3:
            return candidates

        for room in rooms:
            if len(room.polygon) < 3:
                continue

            distance = distance_between_polygons(
                wall.polygon,
                room.polygon,
            )

            if distance > maximum_gap:
                continue

            nearby_boundary = (
                nearby_polygon_edge_length(
                    wall.polygon,
                    room.polygon,
                    maximum_gap=maximum_gap,
                )
            )

            if (
                nearby_boundary
                < minimum_boundary_length
            ):
                continue

            score = self._calculate_match_score(
                distance=distance,
                nearby_boundary=nearby_boundary,
            )

            candidates.append(
                WallRoomMatch(
                    wall_id=wall.id,
                    room_id=room.id,
                    distance=distance,
                    nearby_boundary_length=(
                        nearby_boundary
                    ),
                    score=score,
                )
            )

        candidates.sort(
            key=lambda match: match.score,
            reverse=True,
        )

        return candidates

    @staticmethod
    def _calculate_match_score(
        distance: float,
        nearby_boundary: float,
    ) -> float:
        """
        Larger boundary overlap produces a stronger match.
        Larger distance reduces the score.
        """

        return nearby_boundary / (1.0 + distance)