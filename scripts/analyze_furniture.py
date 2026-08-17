from __future__ import annotations

from collections import Counter
from pathlib import Path
import xml.etree.ElementTree as ET

from zynora_ai.core.geometry.polygon_metrics import (
    polygon_centroid,
)
from zynora_ai.core.parser.furniture_parser import (
    FurnitureParser,
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SELECTED_SVG_FILE = (
    PROJECT_ROOT / "outputs" / "selected_svg.txt"
)


def load_selected_svg() -> Path:
    if not SELECTED_SVG_FILE.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt was not found."
        )

    svg_text = SELECTED_SVG_FILE.read_text(
        encoding="utf-8",
    ).strip()

    if not svg_text:
        raise ValueError(
            "outputs/selected_svg.txt is empty."
        )

    svg_path = Path(svg_text)

    if not svg_path.is_absolute():
        svg_path = PROJECT_ROOT / svg_path

    svg_path = svg_path.resolve()

    if not svg_path.exists():
        raise FileNotFoundError(
            f"SVG file does not exist: {svg_path}"
        )

    return svg_path


def get_centroid_text(
    polygon,
) -> str:
    if not polygon:
        return "N/A"

    centroid = polygon_centroid(polygon)

    # Supports polygon_centroid returning a Point object.
    if hasattr(centroid, "x") and hasattr(centroid, "y"):
        return (
            f"({centroid.x:.2f}, "
            f"{centroid.y:.2f})"
        )

    # Supports polygon_centroid returning a tuple.
    if (
        isinstance(centroid, tuple)
        and len(centroid) == 2
    ):
        centroid_x, centroid_y = centroid

        return (
            f"({centroid_x:.2f}, "
            f"{centroid_y:.2f})"
        )

    return "Unknown"


def main() -> None:
    svg_path = load_selected_svg()

    tree = ET.parse(svg_path)
    root = tree.getroot()

    furniture_items = FurnitureParser().parse(root)

    print("=" * 100)
    print("ZYNORA FURNITURE ANALYSIS")
    print("=" * 100)
    print(f"SVG file        : {svg_path}")
    print(f"Furniture count : {len(furniture_items)}")
    print()

    counts = Counter(
        item.furniture_type
        for item in furniture_items
    )

    print("FURNITURE TYPE COUNTS")
    print("-" * 100)

    for furniture_type, count in counts.most_common():
        print(
            f"{furniture_type:<30} "
            f"{count}"
        )

    print()
    print("FURNITURE DETAILS")
    print("-" * 100)

    for index, item in enumerate(
        furniture_items,
        start=1,
    ):
        centroid_text = get_centroid_text(
            item.polygon
        )

        print(
            f"{index:02d}. "
            f"ID={item.id} | "
            f"TYPE={item.furniture_type} | "
            f"LOCAL_POINTS={len(item.local_polygon)} | "
            f"WORLD_POINTS={len(item.polygon)} | "
            f"CENTROID={centroid_text}"
        )

        print(
            f"    TRANSFORM={item.transform}"
        )

    print()
    print("=" * 100)
    print("TRANSFORM VERIFICATION")
    print("=" * 100)

    important_types = {
        "Refrigerator",
        "IntegratedStove",
        "Toilet",
        "Shower",
        "Jacuzzi",
        "Sink",
        "DoubleSink",
        "Closet",
    }

    for item in furniture_items:
        if item.furniture_type not in important_types:
            continue

        centroid_text = get_centroid_text(
            item.polygon
        )

        print(
            f"{item.furniture_type:<20} "
            f"CENTROID={centroid_text} | "
            f"TRANSFORM={item.transform}"
        )


if __name__ == "__main__":
    main()