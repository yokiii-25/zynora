from pathlib import Path
from xml.etree import ElementTree as ET

PROJECT_ROOT = Path(__file__).resolve().parents[1]

svg = (
    PROJECT_ROOT
    / "datasets/raw/cubicasa5k/cubicasa5k/colorful/10052/model.svg"
)

tree = ET.parse(svg)
root = tree.getroot()

for element in root.iter():
    if "Door" in element.attrib.get("class", ""):
        print("=" * 60)
        print("CLASS:", element.attrib.get("class"))
        print("ID:", element.attrib.get("id"))

        for child in element:
            print(
                child.tag.split("}")[-1],
                child.attrib,
            )