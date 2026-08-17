from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SELECTED_SVG = PROJECT_ROOT / "outputs" / "selected_svg.txt"


def load_svg_path() -> Path:
    if not SELECTED_SVG.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt was not found."
        )

    svg_text = SELECTED_SVG.read_text(
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


def local_tag(element: ET.Element) -> str:
    return element.tag.split("}")[-1]


def normalized_text(element: ET.Element) -> str:
    values = []

    for text in element.itertext():
        cleaned = text.strip()

        if cleaned:
            values.append(cleaned)

    return " ".join(values)


def main() -> None:
    svg_path = load_svg_path()

    print("=" * 100)
    print("ZYNORA CUBICASA ROOM LABEL INSPECTION")
    print("=" * 100)

    print()
    print("Loading SVG...")
    print(svg_path)

    tree = ET.parse(svg_path)
    root = tree.getroot()

    possible_room_elements = []

    for element in root.iter():
        element_id = element.attrib.get("id", "")
        element_class = element.attrib.get("class", "")
        text = normalized_text(element)

        searchable_value = (
            f"{element_id} {element_class} {text}"
        ).lower()

        room_keywords = (
            "space",
            "room",
            "kitchen",
            "bedroom",
            "bathroom",
            "living",
            "dining",
            "sauna",
            "hall",
            "closet",
            "outdoor",
        )

        if any(
            keyword in searchable_value
            for keyword in room_keywords
        ):
            possible_room_elements.append(
                (
                    element,
                    element_id,
                    element_class,
                    text,
                )
            )

    print()
    print(
        f"Possible room-related elements: "
        f"{len(possible_room_elements)}"
    )

    print()
    print("=" * 100)
    print("ROOM-RELATED SVG ELEMENTS")
    print("=" * 100)

    for index, (
        element,
        element_id,
        element_class,
        text,
    ) in enumerate(possible_room_elements, start=1):

        print()
        print("-" * 100)
        print(f"NUMBER    : {index}")
        print(f"TAG       : {local_tag(element)}")
        print(f"ID        : {element_id or 'NONE'}")
        print(f"CLASS     : {element_class or 'NONE'}")
        print(f"TEXT      : {text or 'NONE'}")

        print("ATTRIBUTES:")

        if element.attrib:
            for key, value in element.attrib.items():
                print(f"  {key} = {value}")
        else:
            print("  NONE")

        children = list(element)

        print(f"CHILDREN  : {len(children)}")

        for child in children[:10]:
            child_tag = local_tag(child)
            child_id = child.attrib.get("id", "")
            child_class = child.attrib.get("class", "")
            child_text = normalized_text(child)

            print(
                f"  TAG={child_tag:<12} "
                f"ID={child_id or 'NONE':<25} "
                f"CLASS={child_class or 'NONE':<40} "
                f"TEXT={child_text or 'NONE'}"
            )

    print()
    print("=" * 100)
    print("TEXT ELEMENTS")
    print("=" * 100)

    text_count = 0

    for element in root.iter():
        tag = local_tag(element)

        if tag not in {"text", "tspan"}:
            continue

        text = normalized_text(element)

        if not text:
            continue

        text_count += 1

        print()
        print(f"TEXT #{text_count}")
        print(f"TAG        : {tag}")
        print(
            f"ID         : "
            f"{element.attrib.get('id', 'NONE')}"
        )
        print(
            f"CLASS      : "
            f"{element.attrib.get('class', 'NONE')}"
        )
        print(f"VALUE      : {text}")

        if element.attrib:
            print("ATTRIBUTES :")

            for key, value in element.attrib.items():
                print(f"  {key} = {value}")

    print()
    print(f"Total text elements: {text_count}")


if __name__ == "__main__":
    main()