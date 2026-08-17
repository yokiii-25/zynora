import xml.etree.ElementTree as ET
from pathlib import Path

SVG_PATH = Path(
    r"Y:\YPS-Labs\zynora-ai\datasets\raw\cubicasa5k\cubicasa5k\colorful\10052\model.svg"
)

tree = ET.parse(SVG_PATH)
root = tree.getroot()

print("=" * 80)
print("ZYNORA BLUEPRINT AI")
print("SVG STRUCTURE INSPECTOR")
print("=" * 80)

for elem in root.iter():
    tag = elem.tag.split("}")[-1]

    if tag == "g":
        print("\nGROUP")
        print("-" * 40)

        if elem.attrib:
            for k, v in elem.attrib.items():
                print(f"{k}: {v}")

        for child in list(elem)[:3]:
            child_tag = child.tag.split("}")[-1]
            print(f"  └── {child_tag}")