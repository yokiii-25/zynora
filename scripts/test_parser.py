from pathlib import Path

from zynora_ai.parsers.cubicasa_parser import CubiCasaParser


ROOT = Path(__file__).resolve().parents[1]

svg_path = (
    ROOT
    / "datasets"
    / "raw"
    / "cubicasa5k"
    / "cubicasa5k"
    / "colorful"
    / "10052"
    / "model.svg"
)

parser = CubiCasaParser(svg_path)
objects = parser.extract_objects()

print("=" * 40)
print("CubiCasa Object Summary")
print("=" * 40)

print(f"Walls      : {len(objects['walls'])}")
print(f"Doors      : {len(objects['doors'])}")
print(f"Windows    : {len(objects['windows'])}")
print(f"Spaces     : {len(objects['spaces'])}")
print(f"Furniture  : {len(objects['furniture'])}")
print(f"Other      : {len(objects['other'])}")

print("\nSample Walls:")
print("\nSample Wall Geometry:")

for wall in objects["walls"][:2]:
    print("\nClass:", wall["class"])

    geometry = wall["geometry"]

    print("Polygons   :", len(geometry["polygons"]))
    print("Polylines  :", len(geometry["polylines"]))
    print("Lines      :", len(geometry["lines"]))
    print("Rectangles :", len(geometry["rectangles"]))

    for index, polygon in enumerate(geometry["polygons"][:2], start=1):
        print(f"Polygon {index}:")
        print("Vertices:", len(polygon))
        print("First points:", polygon[:5])
print("\nSample Doors:")
for door in objects["doors"][:5]:
    print({
        "id": door["id"],
        "class": door["class"],
        "children": door["children"]
    })

print("\nSample Windows:")
for window in objects["windows"][:5]:
    print({
        "id": window["id"],
        "class": window["class"],
        "children": window["children"]
    })

print("\nSample Furniture:")
for furniture in objects["furniture"][:5]:
    print({
        "id": furniture["id"],
        "class": furniture["class"],
        "children": furniture["children"]
    })