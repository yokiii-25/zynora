import json
from pathlib import Path
from typing import Any

from zynora_ai.graph.relationship_builder import (
    RelationshipBuilder,
)


ROOT = Path(__file__).resolve().parents[1]

INPUT_PATH = ROOT / "outputs" / "house_graph_10052.json"
OUTPUT_PATH = ROOT / "outputs" / "house_graph_10052.json"


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"House Graph not found: {path}"
        )

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    house_graph = load_json(INPUT_PATH)

    house = house_graph.get("house", {})

    walls = house.get("walls", [])
    doors = house.get("doors", [])
    windows = house.get("windows", [])

    door_relationships = (
        RelationshipBuilder.build_wall_relationships(
            doors,
            walls,
        )
    )

    window_relationships = (
        RelationshipBuilder.build_wall_relationships(
            windows,
            walls,
        )
    )

    house_graph["relationships"]["door_to_wall"] = door_relationships
    house_graph["relationships"]["window_to_wall"] = window_relationships

    house_graph["metadata"]["version"] = "0.2.0"

    with OUTPUT_PATH.open("w", encoding="utf-8") as file:
        json.dump(
            house_graph,
            file,
            indent=2,
        )

    linked_doors = sum(
        relationship.get("status") == "linked"
        for relationship in door_relationships
    )

    linked_windows = sum(
        relationship.get("status") == "linked"
        for relationship in window_relationships
    )

    print("=" * 52)
    print("House relationships created successfully")
    print("=" * 52)
    print(f"House Graph       : {OUTPUT_PATH}")
    print(f"Doors linked      : {linked_doors}/{len(doors)}")
    print(f"Windows linked    : {linked_windows}/{len(windows)}")

    print("\nDoor relationships:")

    for relationship in door_relationships:
        wall_id = relationship.get("wall_id") or "UNMATCHED"

        print(
            f"{relationship['object_id']} -> "
            f"{wall_id} "
            f"[{relationship['status']}] "
            f"(distance: {relationship['distance']})"
        )

    print("\nWindow relationships:")

    for relationship in window_relationships:
        wall_id = relationship.get("wall_id") or "UNMATCHED"

        print(
            f"{relationship['object_id']} -> "
            f"{wall_id} "
            f"[{relationship['status']}] "
            f"(distance: {relationship['distance']})"
        )

if __name__ == "__main__":
    main()