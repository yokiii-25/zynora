from pathlib import Path
import xml.etree.ElementTree as ET
from zynora_ai.geometry.svg_geometry import SVGGeometry


class CubiCasaParser:
    def __init__(self, svg_path):
        self.svg_path = Path(svg_path)

        if not self.svg_path.exists():
            raise FileNotFoundError(
                f"SVG file not found: {self.svg_path}"
            )

        self.tree = ET.parse(self.svg_path)
        self.root = self.tree.getroot()

    def extract_groups(self):
        groups = []

        for element in self.root.iter():
            if element.tag.split("}")[-1] != "g":
                continue

            groups.append({
                "id": element.attrib.get("id"),
                "class": element.attrib.get("class"),
                "children": len(list(element))
            })

        return groups

    def extract_objects(self):
        objects = {
            "walls": [],
            "doors": [],
            "windows": [],
            "spaces": [],
            "furniture": [],
            "other": []
        }

        for element in self.root.iter():
            if element.tag.split("}")[-1] != "g":
                continue

            cls = element.attrib.get("class", "")

            obj = {
                "id": element.attrib.get("id"),
                "class": cls,
                "children": len(list(element)),
                "geometry": SVGGeometry.extract_geometry(element)
            }

            if "Wall" in cls:
                objects["walls"].append(obj)

            elif "Door" in cls:
                objects["doors"].append(obj)

            elif "Window" in cls:
                objects["windows"].append(obj)

            elif cls.startswith("Space"):
                objects["spaces"].append(obj)

            elif "Furniture" in cls or "Appliance" in cls:
                objects["furniture"].append(obj)

            else:
                objects["other"].append(obj)

        return objects