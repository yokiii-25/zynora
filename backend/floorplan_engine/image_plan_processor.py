from __future__ import annotations

from pathlib import Path
from typing import Any

from floorplan_engine.image_loader import (
    load_floor_plan_image,
    resize_for_processing,
)
from floorplan_engine.preprocessing import (
    preprocess_floor_plan,
    save_debug_images,
)
from floorplan_engine.wall_detector import (
    PixelWall,
    detect_and_merge_walls,
)


DEBUG_DIRECTORY = Path(
    "debug/floor_plan"
)


def get_wall_bounds(
    walls: list[PixelWall],
) -> tuple[int, int, int, int]:
    all_x: list[int] = []
    all_y: list[int] = []

    for wall in walls:
        all_x.extend(
            [
                wall["x1"],
                wall["x2"],
            ]
        )

        all_y.extend(
            [
                wall["y1"],
                wall["y2"],
            ]
        )

    return (
        min(all_x),
        min(all_y),
        max(all_x),
        max(all_y),
    )


def convert_walls_to_json(
    walls: list[PixelWall],
    target_width: float = 40.0,
) -> dict[str, Any]:
    if not walls:
        raise ValueError(
            "No structural walls were detected."
        )

    (
        minimum_x,
        minimum_y,
        maximum_x,
        maximum_y,
    ) = get_wall_bounds(walls)

    pixel_width = max(
        1,
        maximum_x - minimum_x,
    )

    pixel_height = max(
        1,
        maximum_y - minimum_y,
    )

    coordinate_scale = (
        target_width / pixel_width
    )

    target_height = (
        pixel_height
        * coordinate_scale
    )

    converted_walls: list[
        dict[str, Any]
    ] = []

    for wall_id, wall in enumerate(
        walls,
        start=1,
    ):
        converted_walls.append(
            {
                "id": wall_id,
                "x1": round(
                    (
                        wall["x1"]
                        - minimum_x
                    )
                    * coordinate_scale,
                    3,
                ),
                "y1": round(
                    (
                        wall["y1"]
                        - minimum_y
                    )
                    * coordinate_scale,
                    3,
                ),
                "x2": round(
                    (
                        wall["x2"]
                        - minimum_x
                    )
                    * coordinate_scale,
                    3,
                ),
                "y2": round(
                    (
                        wall["y2"]
                        - minimum_y
                    )
                    * coordinate_scale,
                    3,
                ),
                "orientation": wall[
                    "orientation"
                ],
                "height": 3.0,
                "thickness": 0.18,
            }
        )

    return {
        "source": "uploaded_floor_plan",
        "width": round(
            target_width,
            3,
        ),
        "height": round(
            target_height,
            3,
        ),
        "wall_count": len(
            converted_walls
        ),
        "walls": converted_walls,
        "rooms": [],
        "doors": [],
        "windows": [],
        "furniture": [],
    }


def process_uploaded_floor_plan(
    file_path: Path,
    target_width: float = 40.0,
) -> dict[str, Any]:
    if not file_path.exists():
        raise ValueError(
            "The uploaded file does not exist."
        )

    original_image = load_floor_plan_image(
        file_path
    )

    processing_image, processing_scale = (
        resize_for_processing(
            original_image,
            maximum_dimension=2000,
        )
    )

    stages = preprocess_floor_plan(
        processing_image
    )

    # These files help us inspect every processing stage.
    save_debug_images(
        stages,
        DEBUG_DIRECTORY,
    )

    detected_walls = detect_and_merge_walls(
        stages["skeleton"]
    )

    if not detected_walls:
        raise ValueError(
            "No clear structural walls were detected. "
            "Upload a top-view floor plan with visible dark walls."
        )

    result = convert_walls_to_json(
        detected_walls,
        target_width=target_width,
    )

    result["original_filename"] = (
        file_path.name
    )

    result["image_width"] = int(
        original_image.shape[1]
    )

    result["image_height"] = int(
        original_image.shape[0]
    )

    result["processing_width"] = int(
        processing_image.shape[1]
    )

    result["processing_height"] = int(
        processing_image.shape[0]
    )

    result["processing_scale"] = round(
        processing_scale,
        4,
    )

    result["debug_directory"] = str(
        DEBUG_DIRECTORY
    )

    return result
