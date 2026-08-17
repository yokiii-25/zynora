from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path
from xml.etree import ElementTree as ET


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SELECTED_FILE_PATH = PROJECT_ROOT / "outputs" / "selected_svg.txt"


def strip_namespace(tag: str) -> str:
    return tag.split("}")[-1]


def normalize_text(value: str | None) -> str:
    if not value:
        return ""

    return re.sub(r"\s+", " ", value).strip()


def collect_element_info(root: ET.Element) -> dict:
    tag_counts: Counter[str] = Counter()
    class_counts: Counter[str] = Counter()
    id_examples: list[str] = []
    text_examples: list[str] = []

    for element in root.iter():
        tag_name = strip_namespace(element.tag)
        tag_counts[tag_name] += 1

        class_name = normalize_text(element.attrib.get("class"))
        if class_name:
            for class_part in class_name.split():
                class_counts[class_part] += 1

        element_id = normalize_text(element.attrib.get("id"))
        if element_id and len(id_examples) < 100:
            id_examples.append(element_id)

        text_value = normalize_text(element.text)
        if text_value and len(text_examples) < 100:
            text_examples.append(text_value)

    return {
        "tag_counts": dict(tag_counts.most_common()),
        "class_counts": dict(class_counts.most_common()),
        "id_examples": id_examples,
        "text_examples": text_examples,
    }


def main() -> None:
    if not SELECTED_FILE_PATH.exists():
        raise FileNotFoundError(
            "Run scripts/find_sample_svg.py first."
        )

    svg_path = Path(
        SELECTED_FILE_PATH.read_text(encoding="utf-8").strip()
    )

    if not svg_path.exists():
        raise FileNotFoundError(f"SVG not found: {svg_path}")

    tree = ET.parse(svg_path)
    root = tree.getroot()

    info = collect_element_info(root)

    report = {
        "svg_path": str(svg_path),
        "root_tag": strip_namespace(root.tag),
        "root_attributes": dict(root.attrib),
        **info,
    }

    output_dir = PROJECT_ROOT / "outputs" / "inspection"
    output_dir.mkdir(parents=True, exist_ok=True)

    output_path = output_dir / "sample_svg_report.json"
    output_path.write_text(
        json.dumps(report, indent=2),
        encoding="utf-8",
    )

    print("=" * 60)
    print("ZYNORA CUBICASA SVG INSPECTOR")
    print("=" * 60)
    print(f"SVG: {svg_path}")
    print(f"Root tag: {report['root_tag']}")

    print("\nTop SVG tags:")
    for name, count in list(info["tag_counts"].items())[:20]:
        print(f"  {name:<25} {count}")

    print("\nTop classes:")
    for name, count in list(info["class_counts"].items())[:40]:
        print(f"  {name:<35} {count}")

    print("\nExample IDs:")
    for value in info["id_examples"][:20]:
        print(f"  {value}")

    print("\nExample text values:")
    for value in info["text_examples"][:30]:
        print(f"  {value}")

    print(f"\nReport saved to: {output_path}")


if __name__ == "__main__":
    main()