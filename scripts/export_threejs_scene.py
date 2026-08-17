import json
from pathlib import Path
from typing import Any

from zynora_ai.renderer.scene_builder import SceneBuilder


ROOT = Path(__file__).resolve().parents[1]

INPUT_PATH = ROOT / "outputs" / "house_graph_10052.json"
OUTPUT_PATH = ROOT / "outputs" / "threejs_scene_10052.json"


def load_json(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(
            f"Input file not found: {path}\n"
            "Run python -m scripts.build_house_graph first."
        )

    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def main() -> None:
    # Load house graph
    graph = load_json(INPUT_PATH)

    # Build structured render scene
    render_scene = SceneBuilder.build(graph)

    # Ensure output directory exists
    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # Save JSON
    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(
            render_scene,
            file,
            indent=2,
        )

    # Scene statistics
    scene = render_scene["scene"]

    exterior_count = len(scene["walls"]["exterior"])
    interior_count = len(scene["walls"]["interior"])
    total_walls = exterior_count + interior_count

    door_count = len(scene["doors"])
    window_count = len(scene["windows"])

    linked_doors = sum(
        1
        for door in scene["doors"]
        if door.get("relationship", {}).get("wall_id")
    )

    linked_windows = sum(
        1
        for window in scene["windows"]
        if window.get("relationship", {}).get("wall_id")
    )

    # Console output
    print("=" * 56)
    print("Structured Three.js scene created successfully")
    print("=" * 56)
    print(f"Input           : {INPUT_PATH}")
    print(f"Output          : {OUTPUT_PATH}")
    print(f"Exterior walls  : {exterior_count}")
    print(f"Interior walls  : {interior_count}")
    print(f"Total walls     : {total_walls}")
    print(f"Doors           : {door_count}")
    print(f"Doors linked    : {linked_doors}/{door_count}")
    print(f"Windows         : {window_count}")
    print(f"Windows linked  : {linked_windows}/{window_count}")


if __name__ == "__main__":
    main()