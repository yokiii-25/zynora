import json
from pathlib import Path
from typing import Any


ENGINE_DIR = Path(__file__).resolve().parents[1]

RAW_DATASET_DIR = (
    ENGINE_DIR
    / "datasets"
    / "raw"
    / "HouseExpo"
    / "HouseExpo"
)

PROCESSED_DIR = (
    ENGINE_DIR
    / "datasets"
    / "processed"
)

PLANS_OUTPUT_PATH = (
    PROCESSED_DIR
    / "houseexpo_plans.json"
)

INDEX_OUTPUT_PATH = (
    ENGINE_DIR
    / "datasets"
    / "index.json"
)

MAX_PLANS = 100


ROOM_TYPE_MAP = {
    "Bedroom": "bedroom",
    "MasterRoom": "bedroom",
    "Master Room": "bedroom",

    "LivingRoom": "living_room",
    "Living Room": "living_room",
    "Living_Room": "living_room",
    "Room": "living_room",

    "Kitchen": "kitchen",

    "Bathroom": "bathroom",
    "Bath": "bathroom",
    "Toilet": "bathroom",
    "Washroom": "bathroom",

    "Storage": "storage",
    "Store": "storage",

    "DiningRoom": "dining_room",
    "Dining Room": "dining_room",
    "Dining_Room": "dining_room",

    "Balcony": "balcony",
    "Entrance": "entrance",

    "Hallway": "passage",
    "Corridor": "passage",
    "Passage": "passage",

    "Wardrobe": "wardrobe",
    "Office": "office",
    "Hall": "hall",

    "GuestRoom": "guest_room",
    "Guest Room": "guest_room",
    "Guest_Room": "guest_room",

    "Gym": "gym",
    "Utility": "utility",
}


def normalize_room_type(category: str) -> str:
    cleaned_category = str(category).strip()

    if cleaned_category in ROOM_TYPE_MAP:
        return ROOM_TYPE_MAP[cleaned_category]

    return (
        cleaned_category
        .lower()
        .replace(" ", "_")
        .replace("-", "_")
    )


def create_room_id(
    room_type: str,
    room_number: int,
) -> str:
    return f"{room_type}-{room_number}"


def convert_room(
    category: str,
    bounds: list[float],
    room_number: int,
    minimum_x: float,
    minimum_y: float,
    maximum_x: float,
    maximum_y: float,
) -> dict[str, Any] | None:
    if not isinstance(bounds, list):
        return None

    if len(bounds) != 4:
        return None

    try:
        x1, y1, x2, y2 = map(float, bounds)
    except (TypeError, ValueError):
        return None

    # Ensure coordinates are ordered correctly.
    left = min(x1, x2)
    right = max(x1, x2)
    top = min(y1, y2)
    bottom = max(y1, y2)

    # Clip room rectangle to the building bounding box.
    left = max(left, minimum_x)
    top = max(top, minimum_y)
    right = min(right, maximum_x)
    bottom = min(bottom, maximum_y)

    width = right - left
    height = bottom - top

    # Ignore invalid or extremely tiny spaces.
    if width < 0.25 or height < 0.25:
        return None

    room_type = normalize_room_type(category)

    normalized_x = left - minimum_x
    normalized_y = top - minimum_y

    return {
        "id": create_room_id(
            room_type,
            room_number,
        ),
        "type": room_type,
        "name": str(category),
        "x": round(normalized_x, 3),
        "y": round(normalized_y, 3),
        "width": round(width, 3),
        "height": round(height, 3),
        "area": round(width * height, 3),
    }


def rooms_have_same_bounds(
    room_a: dict[str, Any],
    room_b: dict[str, Any],
    tolerance: float = 0.01,
) -> bool:
    return (
        abs(
            float(room_a["x"])
            - float(room_b["x"])
        ) <= tolerance
        and abs(
            float(room_a["y"])
            - float(room_b["y"])
        ) <= tolerance
        and abs(
            float(room_a["width"])
            - float(room_b["width"])
        ) <= tolerance
        and abs(
            float(room_a["height"])
            - float(room_b["height"])
        ) <= tolerance
    )


def choose_preferred_room(
    existing_room: dict[str, Any],
    new_room: dict[str, Any],
) -> dict[str, Any]:
    """
    HouseExpo sometimes gives the same rectangle multiple labels.

    Example:
    - Toilet and Bathroom
    - Living_Room and Dining_Room

    This function selects the more useful label.
    """

    priority = {
        "bedroom": 100,
        "bathroom": 95,
        "kitchen": 90,
        "living_room": 85,
        "dining_room": 80,
        "guest_room": 75,
        "office": 70,
        "storage": 65,
        "utility": 60,
        "passage": 50,
        "hall": 45,
        "wardrobe": 40,
        "balcony": 35,
        "entrance": 30,
    }

    existing_priority = priority.get(
        existing_room.get("type", ""),
        0,
    )

    new_priority = priority.get(
        new_room.get("type", ""),
        0,
    )

    if new_priority > existing_priority:
        new_room["id"] = existing_room["id"]
        return new_room

    return existing_room


def remove_duplicate_rooms(
    rooms: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    unique_rooms: list[dict[str, Any]] = []

    for room in rooms:
        duplicate_index = None

        for index, existing_room in enumerate(
            unique_rooms
        ):
            if rooms_have_same_bounds(
                existing_room,
                room,
            ):
                duplicate_index = index
                break

        if duplicate_index is None:
            unique_rooms.append(room)
            continue

        preferred_room = choose_preferred_room(
            unique_rooms[duplicate_index],
            room,
        )

        unique_rooms[duplicate_index] = preferred_room

    # Rebuild IDs so they remain sequential.
    rebuilt_rooms: list[dict[str, Any]] = []

    for room_number, room in enumerate(
        unique_rooms,
        start=1,
    ):
        rebuilt_room = room.copy()

        rebuilt_room["id"] = create_room_id(
            rebuilt_room["type"],
            room_number,
        )

        rebuilt_rooms.append(rebuilt_room)

    return rebuilt_rooms


def count_room_type(
    rooms: list[dict[str, Any]],
    room_type: str,
) -> int:
    return sum(
        1
        for room in rooms
        if room.get("type") == room_type
    )


def normalize_boundary(
    vertices: list[Any],
    minimum_x: float,
    minimum_y: float,
    maximum_x: float,
    maximum_y: float,
) -> list[list[float]]:
    normalized_vertices: list[list[float]] = []

    if not isinstance(vertices, list):
        return normalized_vertices

    for vertex in vertices:
        if not isinstance(vertex, list):
            continue

        if len(vertex) != 2:
            continue

        try:
            vertex_x = float(vertex[0])
            vertex_y = float(vertex[1])
        except (TypeError, ValueError):
            continue

        # Clip the boundary vertex to the building bbox.
        vertex_x = min(
            max(vertex_x, minimum_x),
            maximum_x,
        )

        vertex_y = min(
            max(vertex_y, minimum_y),
            maximum_y,
        )

        normalized_vertices.append(
            [
                round(
                    vertex_x - minimum_x,
                    3,
                ),
                round(
                    vertex_y - minimum_y,
                    3,
                ),
            ]
        )

    return normalized_vertices


def convert_houseexpo_plan(
    raw_plan: dict[str, Any],
) -> dict[str, Any] | None:
    plan_id = raw_plan.get("id")
    bounding_box = raw_plan.get("bbox")
    room_categories = raw_plan.get(
        "room_category",
        {},
    )

    if not plan_id:
        return None

    if not isinstance(bounding_box, dict):
        return None

    if not isinstance(room_categories, dict):
        return None

    minimum = bounding_box.get("min")
    maximum = bounding_box.get("max")

    if not isinstance(minimum, list):
        return None

    if not isinstance(maximum, list):
        return None

    if len(minimum) < 2 or len(maximum) < 2:
        return None

    try:
        minimum_x = float(minimum[0])
        minimum_y = float(minimum[1])
        maximum_x = float(maximum[0])
        maximum_y = float(maximum[1])
    except (TypeError, ValueError):
        return None

    plan_width = maximum_x - minimum_x
    plan_height = maximum_y - minimum_y

    if plan_width <= 0 or plan_height <= 0:
        return None

    imported_rooms: list[dict[str, Any]] = []
    room_counter = 1

    for category, category_rooms in (
        room_categories.items()
    ):
        if not isinstance(category_rooms, list):
            continue

        for room_bounds in category_rooms:
            room = convert_room(
                category=category,
                bounds=room_bounds,
                room_number=room_counter,
                minimum_x=minimum_x,
                minimum_y=minimum_y,
                maximum_x=maximum_x,
                maximum_y=maximum_y,
            )

            if room is None:
                continue

            imported_rooms.append(room)
            room_counter += 1

    rooms = remove_duplicate_rooms(
        imported_rooms
    )

    if not rooms:
        return None

    normalized_vertices = normalize_boundary(
        vertices=raw_plan.get("verts", []),
        minimum_x=minimum_x,
        minimum_y=minimum_y,
        maximum_x=maximum_x,
        maximum_y=maximum_y,
    )

    bedrooms = count_room_type(
        rooms,
        "bedroom",
    )

    bathrooms = count_room_type(
        rooms,
        "bathroom",
    )

    return {
        "id": f"houseexpo-{plan_id}",
        "source": "HouseExpo",
        "source_plan_id": str(plan_id),
        "name": (
            f"HouseExpo Plan "
            f"{str(plan_id)[:8]}"
        ),
        "width": round(plan_width, 3),
        "height": round(plan_height, 3),
        "aspect_ratio": round(
            plan_width / plan_height,
            4,
        ),
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "floors": 1,
        "room_count": len(rooms),
        "rooms": rooms,
        "boundary": normalized_vertices,
        "doors": [],
        "windows": [],
        "furniture": [],
    }


def find_json_files() -> list[Path]:
    excluded_names = {
        "empty.json",
        "config.json",
        "index.json",
        "houseexpo_plans.json",
    }

    json_files: list[Path] = []

    for path in RAW_DATASET_DIR.rglob("*.json"):
        if path.name.lower() in excluded_names:
            continue

        json_files.append(path)

    return sorted(json_files)


def build_index() -> None:
    PROCESSED_DIR.mkdir(
        parents=True,
        exist_ok=True,
    )

    json_files = find_json_files()

    if not json_files:
        raise FileNotFoundError(
            "No HouseExpo JSON files were found under "
            f"{RAW_DATASET_DIR}"
        )

    converted_plans: list[dict[str, Any]] = []
    skipped_count = 0

    print(
        f"Found {len(json_files)} "
        "HouseExpo JSON files."
    )

    for json_path in json_files:
        if len(converted_plans) >= MAX_PLANS:
            break

        try:
            with json_path.open(
                "r",
                encoding="utf-8",
            ) as file:
                raw_plan = json.load(file)

            if not isinstance(raw_plan, dict):
                skipped_count += 1
                continue

            converted_plan = convert_houseexpo_plan(
                raw_plan
            )

            if converted_plan is None:
                skipped_count += 1
                continue

            converted_plans.append(
                converted_plan
            )

        except (
            json.JSONDecodeError,
            OSError,
            TypeError,
            ValueError,
        ) as error:
            skipped_count += 1

            print(
                f"Skipped {json_path.name}: "
                f"{error}"
            )

    if not converted_plans:
        raise RuntimeError(
            "No valid HouseExpo plans "
            "were converted."
        )

    with PLANS_OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            converted_plans,
            file,
            indent=2,
        )

    index_entries = [
        {
            "id": plan["id"],
            "source": plan["source"],
            "source_plan_id": plan[
                "source_plan_id"
            ],
            "width": plan["width"],
            "height": plan["height"],
            "aspect_ratio": plan[
                "aspect_ratio"
            ],
            "bedrooms": plan["bedrooms"],
            "bathrooms": plan["bathrooms"],
            "floors": plan["floors"],
            "room_count": plan["room_count"],
        }
        for plan in converted_plans
    ]

    with INDEX_OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            index_entries,
            file,
            indent=2,
        )

    print()
    print(
        f"Converted {len(converted_plans)} plans."
    )
    print(
        f"Skipped {skipped_count} invalid plans."
    )
    print(
        f"Plans saved to: {PLANS_OUTPUT_PATH}"
    )
    print(
        f"Index saved to: {INDEX_OUTPUT_PATH}"
    )


if __name__ == "__main__":
    build_index()