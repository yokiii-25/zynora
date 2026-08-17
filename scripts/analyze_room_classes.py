from __future__ import annotations

from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


DATASET_ROOT = Path(
    "datasets/raw/cubicasa5k/cubicasa5k"
)


def strip_namespace(tag: str) -> str:
    return tag.split("}")[-1]


def main() -> None:
    svg_files = list(DATASET_ROOT.rglob("model.svg"))

    if not svg_files:
        raise FileNotFoundError(
            f"No model.svg files found under: {DATASET_ROOT.resolve()}"
        )

    room_classes: Counter[str] = Counter()
    total_spaces = 0
    failed_files = 0

    for index, svg_path in enumerate(svg_files, start=1):
        try:
            root = ET.parse(svg_path).getroot()

            for element in root.iter():
                classes = element.attrib.get("class", "").split()

                if "Space" not in classes:
                    continue

                total_spaces += 1

                semantic_classes = [
                    class_name
                    for class_name in classes
                    if class_name != "Space"
                ]

                if semantic_classes:
                    room_type = " ".join(semantic_classes)
                else:
                    room_type = "Missing"

                room_classes[room_type] += 1

        except ET.ParseError:
            failed_files += 1

        if index % 500 == 0:
            print(
                f"Processed {index}/{len(svg_files)} SVG files..."
            )

    print("\n" + "=" * 65)
    print("CUBICASA ROOM CLASS ANALYSIS")
    print("=" * 65)

    print(f"SVG files found : {len(svg_files)}")
    print(f"Failed files    : {failed_files}")
    print(f"Total spaces    : {total_spaces}")
    print(f"Unique classes  : {len(room_classes)}")

    print("\nRoom classes:\n")

    for room_type, count in room_classes.most_common():
        percentage = (
            count / total_spaces * 100
            if total_spaces
            else 0
        )

        print(
            f"{room_type:<35}"
            f"{count:>8} "
            f"({percentage:6.2f}%)"
        )


if __name__ == "__main__":
    main()