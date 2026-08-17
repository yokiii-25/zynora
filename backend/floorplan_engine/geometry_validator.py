from __future__ import annotations

from collections import Counter, defaultdict, deque
from math import hypot
import re
from typing import Iterable

from .schemas import Floor, FloorPlanDocument, Point2D, Wall


ENDPOINT_TOLERANCE = 0.001
ROOM_CONTAINMENT_TOLERANCE = 0.08
OUTDOOR_ROOM_PATTERN = re.compile(
    r"outdoor|balcony|terrace|patio|porch|deck|garden|yard|veranda|loggia",
    re.IGNORECASE,
)


def _wall_length(wall: Wall) -> float:
    return hypot(
        wall.end.x - wall.start.x,
        wall.end.z - wall.start.z,
    )


def _point_key(point: Point2D) -> tuple[int, int]:
    return (
        round(point.x / ENDPOINT_TOLERANCE),
        round(point.z / ENDPOINT_TOLERANCE),
    )


def _duplicate_ids(values: Iterable[str]) -> list[str]:
    counts = Counter(values)
    return sorted(value for value, count in counts.items() if count > 1)


def _shell_is_closed(walls: list[Wall]) -> tuple[bool, int]:
    adjacency: dict[tuple[int, int], set[tuple[int, int]]] = defaultdict(set)

    for wall in walls:
        start = _point_key(wall.start)
        end = _point_key(wall.end)
        adjacency[start].add(end)
        adjacency[end].add(start)

    if len(walls) < 3 or len(adjacency) < 3:
        return False, len(adjacency)

    open_nodes = sum(1 for neighbors in adjacency.values() if len(neighbors) != 2)
    visited: set[tuple[int, int]] = set()
    queue = deque([next(iter(adjacency))])

    while queue:
        node = queue.popleft()

        if node in visited:
            continue

        visited.add(node)
        queue.extend(adjacency[node] - visited)

    return open_nodes == 0 and len(visited) == len(adjacency), open_nodes


def _distance_to_segment(point: Point2D, start: Point2D, end: Point2D) -> float:
    dx = end.x - start.x
    dz = end.z - start.z
    length_squared = dx * dx + dz * dz

    if length_squared <= 1e-12:
        return hypot(point.x - start.x, point.z - start.z)

    amount = max(
        0.0,
        min(
            1.0,
            ((point.x - start.x) * dx + (point.z - start.z) * dz)
            / length_squared,
        ),
    )
    return hypot(
        point.x - (start.x + dx * amount),
        point.z - (start.z + dz * amount),
    )


def _point_in_polygon(point: Point2D, polygon: list[Point2D]) -> bool:
    inside = False
    previous = len(polygon) - 1

    for current in range(len(polygon)):
        a = polygon[current]
        b = polygon[previous]

        if _distance_to_segment(point, a, b) <= ROOM_CONTAINMENT_TOLERANCE:
            return True

        crosses = (a.z > point.z) != (b.z > point.z)

        if crosses:
            crossing_x = (
                (b.x - a.x) * (point.z - a.z) / (b.z - a.z) + a.x
            )

            if point.x < crossing_x:
                inside = not inside

        previous = current

    return inside


def _room_is_inside(room, outline: list[Point2D]) -> bool:
    return all(_point_in_polygon(point, outline) for point in room.outline)


def _validate_floor(floor: Floor) -> tuple[list[str], list[str], dict[str, int | bool]]:
    errors: list[str] = []
    warnings: list[str] = []
    wall_ids = {wall.id for wall in floor.walls}
    duplicate_wall_ids = _duplicate_ids(wall.id for wall in floor.walls)
    duplicate_room_ids = _duplicate_ids(room.id for room in floor.rooms)

    if duplicate_wall_ids:
        errors.append(
            f"{floor.id} contains duplicate wall IDs: "
            + ", ".join(duplicate_wall_ids)
        )

    if duplicate_room_ids:
        errors.append(
            f"{floor.id} contains duplicate room IDs: "
            + ", ".join(duplicate_room_ids)
        )

    opening_ids: list[str] = []

    for wall in floor.walls:
        length = _wall_length(wall)
        ordered = sorted(wall.openings, key=lambda opening: opening.offset)

        for index, opening in enumerate(ordered):
            opening_ids.append(opening.id)

            if opening.wallId != wall.id:
                errors.append(
                    f"{opening.id} references {opening.wallId}, but is nested in {wall.id}."
                )

            if opening.wallId not in wall_ids:
                errors.append(f"{opening.id} references an unknown wall.")

            if opening.offset + opening.width > length + 0.01:
                errors.append(f"{opening.id} extends beyond {wall.id}.")

            if opening.bottom + opening.height > wall.height + 0.01:
                errors.append(f"{opening.id} extends above {wall.id}.")

            if index and opening.offset < (
                ordered[index - 1].offset + ordered[index - 1].width - 0.03
            ):
                warnings.append(
                    f"{ordered[index - 1].id} overlaps {opening.id}."
                )

    duplicate_opening_ids = _duplicate_ids(opening_ids)

    if duplicate_opening_ids:
        errors.append(
            f"{floor.id} contains duplicate opening IDs: "
            + ", ".join(duplicate_opening_ids)
        )

    shell_closed, open_nodes = _shell_is_closed(floor.exteriorWalls)

    if not shell_closed:
        errors.append(
            f"{floor.id} exterior shell is open ({open_nodes} non-loop endpoints)."
        )

    indoor_rooms = [
        room for room in floor.rooms if not OUTDOOR_ROOM_PATTERN.search(room.type)
    ]
    outside_rooms = [
        room for room in indoor_rooms if not _room_is_inside(room, floor.outline)
    ]

    if outside_rooms:
        errors.append(
            f"{floor.id} has {len(outside_rooms)} indoor room(s) outside its "
            "exterior shell: " + ", ".join(room.id for room in outside_rooms)
        )

    classified_rooms = sum(
        1 for room in floor.rooms if room.classification is not None
    )
    low_confidence_rooms = sum(
        1
        for room in floor.rooms
        if room.classification is not None and room.classification.confidence < 0.5
    )

    if classified_rooms < len(floor.rooms):
        warnings.append(
            f"{len(floor.rooms) - classified_rooms} room(s) have no classifier result."
        )

    if low_confidence_rooms:
        warnings.append(
            f"{low_confidence_rooms} room classifier result(s) are below 50% confidence."
        )

    stats: dict[str, int | bool] = {
        "rooms": len(floor.rooms),
        "classifiedRooms": classified_rooms,
        "walls": len(floor.walls),
        "exteriorWalls": len(floor.exteriorWalls),
        "openings": len(opening_ids),
        "shellClosed": shell_closed,
        "indoorRooms": len(indoor_rooms),
        "roomsOutsideShell": len(outside_rooms),
    }

    return errors, warnings, stats


def validate_floor_plan_document(document: FloorPlanDocument) -> dict:
    errors: list[str] = []
    warnings: list[str] = []
    floor_stats: dict[str, dict[str, int | bool]] = {}
    duplicate_floor_ids = _duplicate_ids(floor.id for floor in document.floors)

    if duplicate_floor_ids:
        errors.append(
            "Duplicate floor IDs: " + ", ".join(duplicate_floor_ids)
        )

    for floor in document.floors:
        floor_errors, floor_warnings, stats = _validate_floor(floor)
        errors.extend(floor_errors)
        warnings.extend(floor_warnings)
        floor_stats[floor.id] = stats

    if document.metadata.floorCount != len(document.floors):
        errors.append(
            "metadata.floorCount does not match the number of supplied floors."
        )

    floor_ids = {floor.id for floor in document.floors}

    if document.metadata.activeFloorId not in floor_ids:
        errors.append("metadata.activeFloorId does not reference a supplied floor.")

    return {
        "valid": not errors,
        "errors": errors,
        "warnings": warnings,
        "stats": {
            "floors": len(document.floors),
            "floorStats": floor_stats,
        },
    }
