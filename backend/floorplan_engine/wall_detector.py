from __future__ import annotations

import math
from typing import TypedDict

import cv2
import numpy as np


class PixelWall(TypedDict):
    x1: int
    y1: int
    x2: int
    y2: int
    orientation: str


def wall_length(wall: PixelWall) -> float:
    return math.hypot(
        wall["x2"] - wall["x1"],
        wall["y2"] - wall["y1"],
    )


def normalize_detected_line(
    x1: int,
    y1: int,
    x2: int,
    y2: int,
    tolerance: int,
) -> PixelWall | None:
    delta_x = abs(x2 - x1)
    delta_y = abs(y2 - y1)

    if delta_y <= tolerance:
        average_y = round((y1 + y2) / 2)

        return {
            "x1": min(x1, x2),
            "y1": average_y,
            "x2": max(x1, x2),
            "y2": average_y,
            "orientation": "horizontal",
        }

    if delta_x <= tolerance:
        average_x = round((x1 + x2) / 2)

        return {
            "x1": average_x,
            "y1": min(y1, y2),
            "x2": average_x,
            "y2": max(y1, y2),
            "orientation": "vertical",
        }

    return None


def detect_candidate_walls(
    skeleton: np.ndarray,
) -> list[PixelWall]:
    height, width = skeleton.shape[:2]
    minimum_dimension = min(width, height)

    minimum_length = max(
        45,
        int(minimum_dimension * 0.04),
    )

    maximum_gap = max(
        14,
        int(minimum_dimension * 0.014),
    )

    detected = cv2.HoughLinesP(
        skeleton,
        rho=1,
        theta=np.pi / 180,
        threshold=40,
        minLineLength=minimum_length,
        maxLineGap=maximum_gap,
    )

    if detected is None:
        return []

    detected_lines = np.asarray(
        detected,
        dtype=np.int32,
    ).reshape(-1, 4)

    direction_tolerance = max(
        4,
        int(minimum_dimension * 0.004),
    )

    walls: list[PixelWall] = []

    for x1, y1, x2, y2 in detected_lines:
        wall = normalize_detected_line(
            int(x1),
            int(y1),
            int(x2),
            int(y2),
            direction_tolerance,
        )

        if wall is None:
            continue

        if wall_length(wall) >= minimum_length:
            walls.append(wall)

    return walls


def ranges_overlap_or_touch(
    start_a: int,
    end_a: int,
    start_b: int,
    end_b: int,
    gap_tolerance: int,
) -> bool:
    return not (
        end_a < start_b - gap_tolerance
        or end_b < start_a - gap_tolerance
    )


def merge_horizontal_walls(
    walls: list[PixelWall],
    coordinate_tolerance: int,
    gap_tolerance: int,
) -> list[PixelWall]:
    horizontal_walls = sorted(
        (
            wall
            for wall in walls
            if wall["orientation"] == "horizontal"
        ),
        key=lambda wall: (
            wall["y1"],
            wall["x1"],
        ),
    )

    merged: list[PixelWall] = []

    for wall in horizontal_walls:
        merge_index: int | None = None

        for index, existing in enumerate(merged):
            same_axis = (
                abs(existing["y1"] - wall["y1"])
                <= coordinate_tolerance
            )

            overlapping = ranges_overlap_or_touch(
                existing["x1"],
                existing["x2"],
                wall["x1"],
                wall["x2"],
                gap_tolerance,
            )

            if same_axis and overlapping:
                merge_index = index
                break

        if merge_index is None:
            merged.append(wall.copy())
            continue

        existing = merged[merge_index]

        average_y = round(
            (existing["y1"] + wall["y1"]) / 2
        )

        merged[merge_index] = {
            "x1": min(existing["x1"], wall["x1"]),
            "y1": average_y,
            "x2": max(existing["x2"], wall["x2"]),
            "y2": average_y,
            "orientation": "horizontal",
        }

    return merged


def merge_vertical_walls(
    walls: list[PixelWall],
    coordinate_tolerance: int,
    gap_tolerance: int,
) -> list[PixelWall]:
    vertical_walls = sorted(
        (
            wall
            for wall in walls
            if wall["orientation"] == "vertical"
        ),
        key=lambda wall: (
            wall["x1"],
            wall["y1"],
        ),
    )

    merged: list[PixelWall] = []

    for wall in vertical_walls:
        merge_index: int | None = None

        for index, existing in enumerate(merged):
            same_axis = (
                abs(existing["x1"] - wall["x1"])
                <= coordinate_tolerance
            )

            overlapping = ranges_overlap_or_touch(
                existing["y1"],
                existing["y2"],
                wall["y1"],
                wall["y2"],
                gap_tolerance,
            )

            if same_axis and overlapping:
                merge_index = index
                break

        if merge_index is None:
            merged.append(wall.copy())
            continue

        existing = merged[merge_index]

        average_x = round(
            (existing["x1"] + wall["x1"]) / 2
        )

        merged[merge_index] = {
            "x1": average_x,
            "y1": min(existing["y1"], wall["y1"]),
            "x2": average_x,
            "y2": max(existing["y2"], wall["y2"]),
            "orientation": "vertical",
        }

    return merged


def point_near_wall(
    point_x: int,
    point_y: int,
    wall: PixelWall,
    tolerance: int,
) -> bool:
    if wall["orientation"] == "horizontal":
        near_y = abs(point_y - wall["y1"]) <= tolerance

        inside_x = (
            wall["x1"] - tolerance
            <= point_x
            <= wall["x2"] + tolerance
        )

        return near_y and inside_x

    near_x = abs(point_x - wall["x1"]) <= tolerance

    inside_y = (
        wall["y1"] - tolerance
        <= point_y
        <= wall["y2"] + tolerance
    )

    return near_x and inside_y


def count_wall_connections(
    target: PixelWall,
    walls: list[PixelWall],
    tolerance: int,
) -> int:
    endpoints = [
        (target["x1"], target["y1"]),
        (target["x2"], target["y2"]),
    ]

    connected_indices: set[int] = set()

    for index, other in enumerate(walls):
        if other is target:
            continue

        for point_x, point_y in endpoints:
            if point_near_wall(
                point_x,
                point_y,
                other,
                tolerance,
            ):
                connected_indices.add(index)
                break

    return len(connected_indices)


def remove_dense_parallel_patterns(
    walls: list[PixelWall],
    image_shape: tuple[int, ...],
) -> list[PixelWall]:
    """
    Removes groups such as deck boards, staircase lines and cabinet
    partitions. These usually appear as many parallel walls with similar
    lengths and very small spacing.
    """

    height, width = image_shape[:2]
    minimum_dimension = min(width, height)

    grouping_distance = max(
        18,
        int(minimum_dimension * 0.018),
    )

    dense_group_size = 4
    rejected_indices: set[int] = set()

    for index, wall in enumerate(walls):
        nearby_parallel: list[int] = []

        for other_index, other in enumerate(walls):
            if index == other_index:
                continue

            if wall["orientation"] != other["orientation"]:
                continue

            first_length = wall_length(wall)
            second_length = wall_length(other)

            length_ratio = (
                min(first_length, second_length)
                / max(first_length, second_length)
            )

            if length_ratio < 0.70:
                continue

            if wall["orientation"] == "vertical":
                axis_distance = abs(
                    wall["x1"] - other["x1"]
                )

                overlapping = ranges_overlap_or_touch(
                    wall["y1"],
                    wall["y2"],
                    other["y1"],
                    other["y2"],
                    0,
                )

            else:
                axis_distance = abs(
                    wall["y1"] - other["y1"]
                )

                overlapping = ranges_overlap_or_touch(
                    wall["x1"],
                    wall["x2"],
                    other["x1"],
                    other["x2"],
                    0,
                )

            if (
                axis_distance <= grouping_distance
                and overlapping
            ):
                nearby_parallel.append(other_index)

        if len(nearby_parallel) >= dense_group_size:
            rejected_indices.add(index)
            rejected_indices.update(nearby_parallel)

    return [
        wall
        for index, wall in enumerate(walls)
        if index not in rejected_indices
    ]


def remove_isolated_short_walls(
    walls: list[PixelWall],
    image_shape: tuple[int, ...],
) -> list[PixelWall]:
    height, width = image_shape[:2]
    minimum_dimension = min(width, height)

    connection_tolerance = max(
        16,
        int(minimum_dimension * 0.016),
    )

    short_wall_limit = max(
        110,
        int(minimum_dimension * 0.11),
    )

    retained: list[PixelWall] = []

    for wall in walls:
        length = wall_length(wall)

        connections = count_wall_connections(
            wall,
            walls,
            connection_tolerance,
        )

        # Long walls are kept even if one end is open.
        if length >= short_wall_limit:
            retained.append(wall)
            continue

        # Short lines must connect to at least two structural walls.
        if connections >= 2:
            retained.append(wall)

    return retained


def remove_near_duplicates(
    walls: list[PixelWall],
    coordinate_tolerance: int,
    endpoint_tolerance: int,
) -> list[PixelWall]:
    result: list[PixelWall] = []

    for wall in sorted(
        walls,
        key=wall_length,
        reverse=True,
    ):
        duplicate = False

        for existing in result:
            if (
                wall["orientation"]
                != existing["orientation"]
            ):
                continue

            if wall["orientation"] == "horizontal":
                same_axis = (
                    abs(wall["y1"] - existing["y1"])
                    <= coordinate_tolerance
                )

                same_start = (
                    abs(wall["x1"] - existing["x1"])
                    <= endpoint_tolerance
                )

                same_end = (
                    abs(wall["x2"] - existing["x2"])
                    <= endpoint_tolerance
                )

            else:
                same_axis = (
                    abs(wall["x1"] - existing["x1"])
                    <= coordinate_tolerance
                )

                same_start = (
                    abs(wall["y1"] - existing["y1"])
                    <= endpoint_tolerance
                )

                same_end = (
                    abs(wall["y2"] - existing["y2"])
                    <= endpoint_tolerance
                )

            if same_axis and same_start and same_end:
                duplicate = True
                break

        if not duplicate:
            result.append(wall)

    return result


def detect_and_merge_walls(
    skeleton: np.ndarray,
) -> list[PixelWall]:
    candidates = detect_candidate_walls(
        skeleton
    )

    if not candidates:
        return []

    minimum_dimension = min(
        skeleton.shape[:2]
    )

    coordinate_tolerance = max(
        8,
        int(minimum_dimension * 0.008),
    )

    gap_tolerance = max(
        20,
        int(minimum_dimension * 0.02),
    )

    horizontal = merge_horizontal_walls(
        candidates,
        coordinate_tolerance,
        gap_tolerance,
    )

    vertical = merge_vertical_walls(
        candidates,
        coordinate_tolerance,
        gap_tolerance,
    )

    merged = horizontal + vertical

    merged = remove_near_duplicates(
        merged,
        coordinate_tolerance,
        gap_tolerance,
    )

    merged = remove_dense_parallel_patterns(
        merged,
        skeleton.shape,
    )

    merged = remove_isolated_short_walls(
        merged,
        skeleton.shape,
    )

    return sorted(
        merged,
        key=lambda wall: (
            wall["orientation"],
            wall["y1"],
            wall["x1"],
        ),
    )