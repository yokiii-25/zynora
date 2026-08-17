from pathlib import Path
from xml.etree import ElementTree as ET

PROJECT_ROOT = Path(__file__).resolve().parents[1]

svg_path = Path(
    (PROJECT_ROOT / "outputs" / "selected_svg.txt").read_text().strip()
)

tree = ET.parse(svg_path)
root = tree.getroot()


def has_class(element, class_name):
    return class_name in element.attrib.get("class", "").split()


count = 0

for element in root.iter():
    if has_class(element, "Space"):
        count += 1

        print("=" * 80)
        print("SPACE", count)
        print("=" * 80)

        print("Attributes:")
        print(element.attrib)

        print("\nChildren:")

        for child in element:
            print(
                child.tag.split("}")[-1],
                child.attrib.get("class", ""),
                child.attrib.get("id", "")
            )

        print()