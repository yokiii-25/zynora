from __future__ import annotations

import csv
from dataclasses import asdict
from pathlib import Path

from zynora_ai.core.features.room_features import RoomFeatureExtractor
from zynora_ai.core.graph.house_graph import HouseGraphBuilder
from zynora_ai.core.graph.wall_room_relationships import (
    WallRoomRelationshipBuilder,
)
from zynora_ai.core.parser.svg_house_parser import SvgHouseParser


PROJECT_ROOT = Path(__file__).resolve().parents[1]

OUTPUT_DIRECTORY = PROJECT_ROOT / "outputs"
OUTPUT_CSV = OUTPUT_DIRECTORY / "room_features.csv"


CSV_COLUMNS = [
    "source_svg",
    "floor_name",
    "room_id",
    "room_type",
    "area",
    "perimeter",
    "aspect_ratio",
    "wall_count",
    "door_count",
    "window_count",
    "external_wall_count",
    "connected_room_count",
    "distance_from_entrance",
    "is_outdoor",
]


def load_selected_svg() -> Path:
    """
    Load the SVG path stored in outputs/selected_svg.txt.
    """

    selected_file = OUTPUT_DIRECTORY / "selected_svg.txt"

    if not selected_file.exists():
        raise FileNotFoundError(
            "outputs/selected_svg.txt was not found."
        )

    svg_text = selected_file.read_text(
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
            f"SVG file was not found: {svg_path}"
        )

    if svg_path.suffix.lower() != ".svg":
        raise ValueError(
            f"The selected file is not an SVG: {svg_path}"
        )

    return svg_path


def extract_feature_rows(
    svg_path: Path,
) -> list[dict[str, object]]:
    """
    Parse one SVG and convert all room features into CSV rows.
    """

    house = SvgHouseParser().parse(svg_path)

    relationship_builder = WallRoomRelationshipBuilder()
    graph_builder = HouseGraphBuilder()

    rows: list[dict[str, object]] = []

    for floor in house.floors:
        relationships = relationship_builder.build(
            rooms=floor.rooms,
            walls=floor.walls,
            maximum_gap=20.0,
            minimum_boundary_length=5.0,
            maximum_rooms_per_wall=2,
        )

        graph = graph_builder.build(
            rooms=floor.rooms,
            walls=floor.walls,
            relationships=relationships,
        )

        extractor = RoomFeatureExtractor(graph)
        features = extractor.extract_all()

        for feature in features:
            feature_data = asdict(feature)

            row: dict[str, object] = {
                "source_svg": str(svg_path),
                "floor_name": floor.name,
            }

            row.update(feature_data)
            rows.append(row)

    return rows


def write_csv(
    rows: list[dict[str, object]],
    output_path: Path,
) -> None:
    """
    Write extracted room-feature rows to a CSV file.
    """

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        mode="w",
        newline="",
        encoding="utf-8",
    ) as csv_file:
        writer = csv.DictWriter(
            csv_file,
            fieldnames=CSV_COLUMNS,
            extrasaction="ignore",
        )

        writer.writeheader()
        writer.writerows(rows)


def print_summary(
    rows: list[dict[str, object]],
    output_path: Path,
) -> None:
    indoor_rows = [
        row
        for row in rows
        if not bool(row["is_outdoor"])
    ]

    outdoor_rows = [
        row
        for row in rows
        if bool(row["is_outdoor"])
    ]

    defined_rows = [
        row
        for row in indoor_rows
        if str(row["room_type"]).strip().upper()
        not in {"", "UNDEFINED", "UNKNOWN"}
    ]

    undefined_rows = [
        row
        for row in indoor_rows
        if str(row["room_type"]).strip().upper()
        in {"", "UNDEFINED", "UNKNOWN"}
    ]

    print()
    print("=" * 80)
    print("ROOM FEATURE CSV EXPORT COMPLETE")
    print("=" * 80)
    print(f"Output CSV              : {output_path}")
    print(f"Total room rows         : {len(rows)}")
    print(f"Indoor room rows        : {len(indoor_rows)}")
    print(f"Outdoor room rows       : {len(outdoor_rows)}")
    print(f"Defined indoor labels   : {len(defined_rows)}")
    print(f"Undefined indoor labels : {len(undefined_rows)}")


def main() -> None:
    svg_path = load_selected_svg()

    print("=" * 80)
    print("ZYNORA ROOM FEATURE EXPORTER")
    print("=" * 80)
    print(f"Input SVG: {svg_path}")

    rows = extract_feature_rows(svg_path)

    if not rows:
        raise ValueError(
            "No room features were extracted from the selected SVG."
        )

    write_csv(
        rows=rows,
        output_path=OUTPUT_CSV,
    )

    print_summary(
        rows=rows,
        output_path=OUTPUT_CSV,
    )


if __name__ == "__main__":
    main()