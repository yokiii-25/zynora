from copy import deepcopy
from typing import Any


def round_value(
    value: float,
) -> float:
    return round(value, 3)


def rotate_point_90(
    x: float,
    y: float,
    original_width: float,
) -> tuple[float, float]:
    new_x = y
    new_y = original_width - x

    return new_x, new_y


def rotate_rectangle_90(
    item: dict[str, Any],
    original_width: float,
) -> dict[str, Any]:
    rotated = deepcopy(item)

    x = float(item.get("x", 0))
    y = float(item.get("y", 0))
    width = float(item.get("width", 0))
    height = float(item.get("height", 0))

    rotated["x"] = y
    rotated["y"] = (
        original_width
        - x
        - width
    )

    rotated["width"] = height
    rotated["height"] = width

    orientation = item.get(
        "orientation"
    )

    if orientation == "horizontal":
        rotated["orientation"] = (
            "vertical"
        )
    elif orientation == "vertical":
        rotated["orientation"] = (
            "horizontal"
        )

    return rotated


def rotate_boundary_90(
    boundary: list[list[float]],
    original_width: float,
) -> list[list[float]]:
    rotated_boundary: list[
        list[float]
    ] = []

    for point in boundary:
        if (
            not isinstance(point, list)
            or len(point) < 2
        ):
            continue

        x = float(point[0])
        y = float(point[1])

        new_x, new_y = rotate_point_90(
            x=x,
            y=y,
            original_width=original_width,
        )

        rotated_boundary.append(
            [
                new_x,
                new_y,
            ]
        )

    return rotated_boundary


def rotate_plan_90(
    plan: dict[str, Any],
) -> dict[str, Any]:
    rotated_plan = deepcopy(plan)

    original_width = float(
        plan.get("width", 0)
    )
    original_height = float(
        plan.get("height", 0)
    )

    rotated_plan["width"] = (
        original_height
    )
    rotated_plan["height"] = (
        original_width
    )

    rotated_plan["rooms"] = [
        rotate_rectangle_90(
            item=room,
            original_width=original_width,
        )
        for room in plan.get(
            "rooms",
            [],
        )
    ]

    rotated_plan["doors"] = [
        rotate_rectangle_90(
            item=door,
            original_width=original_width,
        )
        for door in plan.get(
            "doors",
            [],
        )
    ]

    rotated_plan["windows"] = [
        rotate_rectangle_90(
            item=window,
            original_width=original_width,
        )
        for window in plan.get(
            "windows",
            [],
        )
    ]

    rotated_plan["furniture"] = [
        rotate_rectangle_90(
            item=item,
            original_width=original_width,
        )
        for item in plan.get(
            "furniture",
            [],
        )
    ]

    rotated_plan["boundary"] = (
        rotate_boundary_90(
            boundary=plan.get(
                "boundary",
                [],
            ),
            original_width=original_width,
        )
    )

    return rotated_plan


def scale_rectangle(
    item: dict[str, Any],
    scale: float,
    offset_x: float,
    offset_y: float,
) -> dict[str, Any]:
    scaled = deepcopy(item)

    scaled["x"] = round_value(
        float(item.get("x", 0))
        * scale
        + offset_x
    )

    scaled["y"] = round_value(
        float(item.get("y", 0))
        * scale
        + offset_y
    )

    scaled["width"] = round_value(
        float(item.get("width", 0))
        * scale
    )

    scaled["height"] = round_value(
        float(item.get("height", 0))
        * scale
    )

    if (
        "area" in scaled
        or scaled.get("type")
        in {
            "living",
            "dining",
            "kitchen",
            "bedroom",
            "bathroom",
            "passage",
            "utility",
            "balcony",
            "storage",
        }
    ):
        scaled["area"] = round_value(
            scaled["width"]
            * scaled["height"]
        )

    return scaled


def scale_boundary(
    boundary: list[list[float]],
    scale: float,
    offset_x: float,
    offset_y: float,
) -> list[list[float]]:
    scaled_boundary: list[
        list[float]
    ] = []

    for point in boundary:
        if (
            not isinstance(point, list)
            or len(point) < 2
        ):
            continue

        scaled_boundary.append(
            [
                round_value(
                    float(point[0])
                    * scale
                    + offset_x
                ),
                round_value(
                    float(point[1])
                    * scale
                    + offset_y
                ),
            ]
        )

    return scaled_boundary


def adapt_plan(
    plan: dict[str, Any],
    target_width: float,
    target_height: float,
) -> dict[str, Any]:
    if target_width <= 0:
        raise ValueError(
            "Target width must be greater "
            "than zero."
        )

    if target_height <= 0:
        raise ValueError(
            "Target height must be greater "
            "than zero."
        )

    working_plan = deepcopy(plan)

    rotation = int(
        working_plan.get(
            "rotation",
            0,
        )
    )

    if rotation == 90:
        working_plan = rotate_plan_90(
            working_plan
        )

    plan_width = float(
        working_plan.get("width", 0)
    )

    plan_height = float(
        working_plan.get("height", 0)
    )

    if (
        plan_width <= 0
        or plan_height <= 0
    ):
        raise ValueError(
            "The selected plan contains "
            "invalid dimensions."
        )

    scale = min(
        target_width / plan_width,
        target_height / plan_height,
    )

    scaled_width = (
        plan_width * scale
    )

    scaled_height = (
        plan_height * scale
    )

    offset_x = (
        target_width - scaled_width
    ) / 2

    offset_y = (
        target_height - scaled_height
    ) / 2

    adapted_plan = deepcopy(
        working_plan
    )

    adapted_plan["width"] = (
        round_value(target_width)
    )

    adapted_plan["height"] = (
        round_value(target_height)
    )

    adapted_plan["aspect_ratio"] = (
        round_value(
            target_width
            / target_height
        )
    )

    adapted_plan["rooms"] = [
        scale_rectangle(
            item=room,
            scale=scale,
            offset_x=offset_x,
            offset_y=offset_y,
        )
        for room in working_plan.get(
            "rooms",
            [],
        )
    ]

    adapted_plan["doors"] = [
        scale_rectangle(
            item=door,
            scale=scale,
            offset_x=offset_x,
            offset_y=offset_y,
        )
        for door in working_plan.get(
            "doors",
            [],
        )
    ]

    adapted_plan["windows"] = [
        scale_rectangle(
            item=window,
            scale=scale,
            offset_x=offset_x,
            offset_y=offset_y,
        )
        for window in working_plan.get(
            "windows",
            [],
        )
    ]

    adapted_plan["furniture"] = [
        scale_rectangle(
            item=item,
            scale=scale,
            offset_x=offset_x,
            offset_y=offset_y,
        )
        for item in working_plan.get(
            "furniture",
            [],
        )
    ]

    adapted_plan["boundary"] = (
        scale_boundary(
            boundary=working_plan.get(
                "boundary",
                [],
            ),
            scale=scale,
            offset_x=offset_x,
            offset_y=offset_y,
        )
    )

    adapted_plan["room_count"] = len(
        adapted_plan["rooms"]
    )

    adapted_plan["rotation"] = (
        rotation
    )

    adapted_plan["scale"] = {
        "uniform": round_value(scale),
        "x": round_value(scale),
        "y": round_value(scale),
    }

    adapted_plan["offset"] = {
        "x": round_value(offset_x),
        "y": round_value(offset_y),
    }

    adapted_plan[
        "adapted_plan_dimensions"
    ] = {
        "width": round_value(
            scaled_width
        ),
        "height": round_value(
            scaled_height
        ),
    }

    return adapted_plan