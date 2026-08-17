import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

HOUSE_JSON = ROOT / "outputs" / "house_10052.json"
WALL_MODEL_JSON = ROOT / "outputs" / "wall_model_10052.json"
OUTPUT_JSON = ROOT / "outputs" / "house_graph_10052.json"


def load_json(path: Path) -> dict:
    if not path.exists():
        raise FileNotFoundError(f"File not found: {path}")

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def clean_object(item: dict, object_id: str) -> dict:
    return {
        "id": object_id,
        "source_id": item.get("id"),
        "class": item.get("class", ""),
        "geometry": item.get("geometry", {}),
    }


def main() -> None:
    house_data = load_json(HOUSE_JSON)
    wall_model = load_json(WALL_MODEL_JSON)

    walls = wall_model.get("wall_segments", [])

    doors = [
        clean_object(item, f"door_{index:04d}")
        for index, item in enumerate(
            house_data.get("doors", []),
            start=1,
        )
    ]

    windows = [
        clean_object(item, f"window_{index:04d}")
        for index, item in enumerate(
            house_data.get("windows", []),
            start=1,
        )
    ]

    rooms = [
        clean_object(item, f"room_{index:04d}")
        for index, item in enumerate(
            house_data.get("spaces", []),
            start=1,
        )
    ]

    furniture = [
        clean_object(item, f"furniture_{index:04d}")
        for index, item in enumerate(
            house_data.get("furniture", []),
            start=1,
        )
    ]

    house_graph = {
        "metadata": {
            "name": "CubiCasa House 10052",
            "source": house_data.get("source"),
            "version": "0.1.0",
        },
        "summary": {
            "walls": len(walls),
            "doors": len(doors),
            "windows": len(windows),
            "rooms": len(rooms),
            "furniture": len(furniture),
        },
        "house": {
            "walls": walls,
            "doors": doors,
            "windows": windows,
            "rooms": rooms,
            "furniture": furniture,
        },
        "relationships": {
            "door_to_wall": [],
            "window_to_wall": [],
            "room_to_wall": [],
            "furniture_to_room": [],
        },
    }

    OUTPUT_JSON.parent.mkdir(parents=True, exist_ok=True)

    with OUTPUT_JSON.open("w", encoding="utf-8") as file:
        json.dump(house_graph, file, indent=2)

    print("=" * 52)
    print("House Graph created successfully")
    print("=" * 52)
    print(f"Output     : {OUTPUT_JSON}")
    print(f"Walls      : {len(walls)}")
    print(f"Doors      : {len(doors)}")
    print(f"Windows    : {len(windows)}")
    print(f"Rooms      : {len(rooms)}")
    print(f"Furniture  : {len(furniture)}")


if __name__ == "__main__":
    main()