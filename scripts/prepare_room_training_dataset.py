from __future__ import annotations

from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_CSV = (
    PROJECT_ROOT
    / "outputs"
    / "room_dataset_full.csv"
)

OUTPUT_CSV = (
    PROJECT_ROOT
    / "outputs"
    / "room_training_dataset.csv"
)

REPORT_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_training_dataset_report.txt"
)


# Raw CubiCasa room labels mapped into broader,
# consistent room categories.
LABEL_MAPPING = {
    # Bedroom
    "Bedroom": "Bedroom",
    "Bedroom Guest": "Bedroom",
    "Alcove": "Bedroom",

    # Bathroom
    "Bath": "Bathroom",
    "Bath Shower": "Bathroom",

    # Kitchen
    "Kitchen": "Kitchen",
    "Kitchen Kitchenette": "Kitchen",
    "Kitchen Open": "Kitchen",
    "Kitchen Scullery": "Kitchen",

    # Living spaces
    "Living Room": "LivingRoom",
    "Den Fireplace": "LivingRoom",
    "Recreation Room": "LivingRoom",
    "Library": "LivingRoom",

    # Dining
    "Dining": "Dining",

    # Entrance and circulation
    "Entry Lobby": "Entry",
    "Draught Lobby": "Entry",
    "Entry": "Entry",
    "Hall": "Entry",
    "Hall Corridor": "Entry",

    # Closet and dressing
    "Closet Walk In": "WalkInCloset",
    "Dressing Room": "WalkInCloset",

    # Storage
    "Storage": "Storage",
    "Storage Oil": "Storage",
    "Storage Cold": "Storage",
    "Storage Wood": "Storage",
    "Storage Fuel": "Storage",
    "Storage Shed": "Storage",
    "Storage Bike": "Storage",
    "Room Cold": "Storage",

    # Laundry and utility
    "Utility Laundry": "Utility",
    "Utility Drying": "Utility",
    "Technical Room": "Utility",
    "Technical Room Boiler": "Utility",

    # Outdoor
    "Outdoor": "Outdoor",
    "Outdoor Balcony": "Outdoor",
    "Outdoor Terrace": "Outdoor",
    "Outdoor Porch": "Outdoor",
    "Outdoor Covered Area": "Outdoor",
    "Outdoor Balcony Glazed": "Outdoor",
    "Outdoor Garden": "Outdoor",
    "Outdoor Terrace Covered": "Outdoor",
    "Outdoor Veranda": "Outdoor",
    "Outdoor Patio Glazed": "Outdoor",
    "Outdoor Veranda Glazed": "Outdoor",
    "Outdoor Patio": "Outdoor",
    "Outdoor Pergola": "Outdoor",
    "Outdoor Terrace Covered Open": "Outdoor",
    "Outdoor Terrace Roof": "Outdoor",
    "Outdoor Balcony Covered": "Outdoor",

    # Garage
    "Garage": "Garage",
    "Car Port": "Garage",

    # Office
    "Office": "Office",

    # Sauna
    "Sauna": "Sauna",
}


# These labels are either ambiguous or too unusual for the first model.
EXCLUDED_LABELS = {
    "UNDEFINED",
    "UNKNOWN",
    "User Defined",
    "Room",
    "Elevated",
    "Attic",
    "Basement",
    "Swimming Pool",
    "Retail Space",
    "Room High Ceiling",
    "Elevator",
    "Garbage",
    "Open To Below",
    "ULKOTILA",
    "Library Archive",
    "Exercise Room Gym",
    "Bar",
    "Outdoor Kitchen",
}


MINIMUM_CLASS_SIZE = 100


def load_dataset() -> pd.DataFrame:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(
            f"Input dataset was not found: {INPUT_CSV}"
        )

    dataframe = pd.read_csv(
        INPUT_CSV,
        low_memory=False,
    )

    if dataframe.empty:
        raise ValueError("The input dataset is empty.")

    required_columns = {
        "source_svg",
        "building_id",
        "room_id",
        "original_room_type",
        "area",
        "perimeter",
        "vertex_count",
        "furniture_count",
    }

    missing_columns = (
        required_columns
        - set(dataframe.columns)
    )

    if missing_columns:
        raise ValueError(
            "Required columns are missing: "
            + ", ".join(sorted(missing_columns))
        )

    return dataframe


def normalize_text(value: object) -> str:
    return str(value).strip()


def create_group_id(source_svg: str) -> str:
    """
    Creates a building-level group identifier.

    Example:
        colorful\\10052\\model.svg
        becomes
        colorful/10052
    """
    normalized_path = (
        str(source_svg)
        .replace("\\", "/")
        .strip("/")
    )

    path = Path(normalized_path)

    return path.parent.as_posix()


def prepare_dataset(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, int]]:
    dataframe = dataframe.copy()

    dataframe["original_room_type"] = (
        dataframe["original_room_type"]
        .apply(normalize_text)
    )

    total_rows = len(dataframe)

    trusted_mask = ~dataframe[
        "original_room_type"
    ].isin(
        {
            "UNDEFINED",
            "UNKNOWN",
            "",
            "None",
            "nan",
        }
    )

    trusted_dataframe = dataframe[
        trusted_mask
    ].copy()

    trusted_rows = len(trusted_dataframe)

    excluded_mask = trusted_dataframe[
        "original_room_type"
    ].isin(EXCLUDED_LABELS)

    explicitly_excluded = int(
        excluded_mask.sum()
    )

    trusted_dataframe = trusted_dataframe[
        ~excluded_mask
    ].copy()

    trusted_dataframe["target_room_type"] = (
        trusted_dataframe["original_room_type"]
        .map(LABEL_MAPPING)
    )

    unmapped_mask = trusted_dataframe[
        "target_room_type"
    ].isna()

    unmapped_rows = int(
        unmapped_mask.sum()
    )

    trusted_dataframe = trusted_dataframe[
        ~unmapped_mask
    ].copy()

    trusted_dataframe["group_id"] = (
        trusted_dataframe["source_svg"]
        .apply(create_group_id)
    )

    furniture_columns = sorted(
        column
        for column in trusted_dataframe.columns
        if column.startswith("furniture_type_")
    )

    numeric_feature_columns = [
        "area",
        "perimeter",
        "vertex_count",
        "furniture_count",
        *furniture_columns,
    ]

    for column in numeric_feature_columns:
        trusted_dataframe[column] = pd.to_numeric(
            trusted_dataframe[column],
            errors="coerce",
        ).fillna(0)

    class_counts = (
        trusted_dataframe["target_room_type"]
        .value_counts()
    )

    valid_classes = class_counts[
        class_counts >= MINIMUM_CLASS_SIZE
    ].index

    before_minimum_filter = len(
        trusted_dataframe
    )

    trusted_dataframe = trusted_dataframe[
        trusted_dataframe[
            "target_room_type"
        ].isin(valid_classes)
    ].copy()

    removed_small_classes = (
        before_minimum_filter
        - len(trusted_dataframe)
    )

    output_columns = [
        "source_svg",
        "building_id",
        "group_id",
        "room_id",
        "original_room_type",
        "target_room_type",
        *numeric_feature_columns,
    ]

    training_dataframe = trusted_dataframe[
        output_columns
    ].copy()

    statistics = {
        "total_rows": total_rows,
        "trusted_rows": trusted_rows,
        "explicitly_excluded": explicitly_excluded,
        "unmapped_rows": unmapped_rows,
        "removed_small_classes": removed_small_classes,
        "final_rows": len(training_dataframe),
        "final_classes": (
            training_dataframe[
                "target_room_type"
            ].nunique()
        ),
        "unique_groups": (
            training_dataframe["group_id"]
            .nunique()
        ),
        "feature_count": len(
            numeric_feature_columns
        ),
    }

    return training_dataframe, statistics


def generate_report(
    dataframe: pd.DataFrame,
    statistics: dict[str, int],
) -> list[str]:
    lines: list[str] = []

    lines.append("=" * 100)
    lines.append("ZYNORA ROOM TRAINING DATASET REPORT")
    lines.append("=" * 100)

    lines.append("")
    lines.append("DATA PREPARATION SUMMARY")
    lines.append("-" * 100)

    lines.append(
        f"Original dataset rows       : "
        f"{statistics['total_rows']}"
    )
    lines.append(
        f"Trusted original labels     : "
        f"{statistics['trusted_rows']}"
    )
    lines.append(
        f"Explicitly excluded rows    : "
        f"{statistics['explicitly_excluded']}"
    )
    lines.append(
        f"Unmapped trusted labels     : "
        f"{statistics['unmapped_rows']}"
    )
    lines.append(
        f"Small-class rows removed    : "
        f"{statistics['removed_small_classes']}"
    )
    lines.append(
        f"Final training rows         : "
        f"{statistics['final_rows']}"
    )
    lines.append(
        f"Final target classes        : "
        f"{statistics['final_classes']}"
    )
    lines.append(
        f"Unique building groups      : "
        f"{statistics['unique_groups']}"
    )
    lines.append(
        f"Numerical ML features       : "
        f"{statistics['feature_count']}"
    )

    lines.append("")
    lines.append("NORMALIZED CLASS DISTRIBUTION")
    lines.append("-" * 100)

    class_counts = (
        dataframe["target_room_type"]
        .value_counts()
    )

    total_rows = len(dataframe)

    for room_type, count in class_counts.items():
        percentage = (
            count / total_rows * 100
        )

        lines.append(
            f"{room_type:<25}"
            f"{int(count):>8} "
            f"({percentage:>6.2f}%)"
        )

    lines.append("")
    lines.append("FEATURE POLICY")
    lines.append("-" * 100)
    lines.append(
        "Included: geometry and furniture-count features."
    )
    lines.append(
        "Excluded: predicted_room_type and confidence."
    )
    lines.append(
        "Reason: those fields come from the rule-based classifier "
        "and would cause target leakage."
    )
    lines.append(
        "The future train/test split must use group_id so rooms "
        "from the same building cannot appear in both sets."
    )

    return lines


def save_outputs(
    dataframe: pd.DataFrame,
    report_lines: list[str],
) -> None:
    OUTPUT_CSV.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    dataframe.to_csv(
        OUTPUT_CSV,
        index=False,
    )

    REPORT_PATH.write_text(
        "\n".join(report_lines),
        encoding="utf-8",
    )


def main() -> None:
    print("=" * 100)
    print("ZYNORA ROOM TRAINING DATASET PREPARATION")
    print("=" * 100)

    print()
    print(f"Input dataset : {INPUT_CSV}")

    dataframe = load_dataset()

    training_dataframe, statistics = (
        prepare_dataset(dataframe)
    )

    report_lines = generate_report(
        dataframe=training_dataframe,
        statistics=statistics,
    )

    save_outputs(
        dataframe=training_dataframe,
        report_lines=report_lines,
    )

    print()
    print("\n".join(report_lines))

    print()
    print("=" * 100)
    print("TRAINING DATASET PREPARATION COMPLETED")
    print("=" * 100)
    print(f"Training CSV : {OUTPUT_CSV}")
    print(f"Report       : {REPORT_PATH}")


if __name__ == "__main__":
    main()