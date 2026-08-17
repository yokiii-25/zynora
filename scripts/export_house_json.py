import json
from pathlib import Path

from zynora_ai.parsers.cubicasa_parser import CubiCasaParser


ROOT = Path(__file__).resolve().parents[1]

SVG_PATH = (
    ROOT
    / "datasets"
    / "raw"
    / "cubicasa5k"
    / "cubicasa5k"
    / "colorful"
    / "10052"
    / "model.svg"
)

OUTPUT_PATH = ROOT / "outputs" / "house_10052.json"


def main():
    parser = CubiCasaParser(SVG_PATH)
    objects = parser.extract_objects()

    house_data = {
        "source": str(SVG_PATH),
        "walls": objects["walls"],
        "doors": objects["doors"],
        "windows": objects["windows"],
        "spaces": objects["spaces"],
        "furniture": objects["furniture"],
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True
    )

    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            house_data,
            file,
            indent=2
        )

    print("=" * 45)
    print("House JSON exported successfully")
    print("=" * 45)
    print(f"Output file : {OUTPUT_PATH}")
    print(f"Walls      : {len(house_data['walls'])}")
    print(f"Doors      : {len(house_data['doors'])}")
    print(f"Windows    : {len(house_data['windows'])}")
    print(f"Spaces     : {len(house_data['spaces'])}")
    print(f"Furniture  : {len(house_data['furniture'])}")


if __name__ == "__main__":
    main()