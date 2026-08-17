from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

INPUT_CSV = (
    PROJECT_ROOT
    / "outputs"
    / "room_dataset_full_v3.csv"
)

OUTPUT_CSV = (
    PROJECT_ROOT
    / "outputs"
    / "room_training_dataset_v3.csv"
)

REPORT_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_training_dataset_v3_report.txt"
)


EPSILON = 1e-9


def load_dataset() -> pd.DataFrame:
    if not INPUT_CSV.exists():
        raise FileNotFoundError(
            f"Training dataset not found: {INPUT_CSV}"
        )

    dataframe = pd.read_csv(
        INPUT_CSV,
        low_memory=False,
    )

    if dataframe.empty:
        raise ValueError(
            "The training dataset is empty."
        )

    return dataframe

def prepare_training_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Create the target label and building-group columns required
    for grouped model training and evaluation.
    """

    dataframe = dataframe.copy()

    if "original_room_type" not in dataframe.columns:
        raise KeyError(
            "Required column 'original_room_type' was not found."
        )

    dataframe["target_room_type"] = (
        dataframe["original_room_type"]
        .fillna("")
        .astype(str)
        .str.strip()
    )

    dataframe = dataframe[
        dataframe["target_room_type"] != ""
    ].copy()

    if "building_id" in dataframe.columns:
        dataframe["group_id"] = (
            dataframe["building_id"]
            .fillna("unknown_building")
            .astype(str)
        )

    elif "source_svg" in dataframe.columns:
        dataframe["group_id"] = (
            dataframe["source_svg"]
            .fillna("unknown_building")
            .astype(str)
        )

    else:
        dataframe["group_id"] = (
            "building_"
            + dataframe.index.astype(str)
        )

    return dataframe


def get_existing_columns(
    dataframe: pd.DataFrame,
    column_names: list[str],
) -> list[str]:
    return [
        column
        for column in column_names
        if column in dataframe.columns
    ]


def sum_columns(
    dataframe: pd.DataFrame,
    columns: list[str],
) -> pd.Series:
    existing_columns = get_existing_columns(
        dataframe,
        columns,
    )

    if not existing_columns:
        return pd.Series(
            0.0,
            index=dataframe.index,
        )

    return (
        dataframe[existing_columns]
        .fillna(0)
        .sum(axis=1)
    )


def prepare_numeric_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Convert every numeric feature column to numeric.

    Metadata columns are ignored automatically.
    """

    dataframe = dataframe.copy()

    metadata_columns = {
        "source_svg",
        "building_id",
        "group_id",
        "room_id",
        "original_room_type",
        "target_room_type",
        "predicted_room_type",
        "confidence",
    }

    numeric_columns = [
        column
        for column in dataframe.columns
        if (
            column not in metadata_columns
            and pd.api.types.is_numeric_dtype(
                dataframe[column]
            )
        )
    ]

    for column in numeric_columns:
        dataframe[column] = pd.to_numeric(
            dataframe[column],
            errors="coerce",
        ).fillna(0)

    return dataframe


def add_geometry_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    dataframe = dataframe.copy()

    safe_area = dataframe["area"].clip(
        lower=EPSILON
    )

    safe_perimeter = dataframe["perimeter"].clip(
        lower=EPSILON
    )

    dataframe["compactness"] = (
        4.0
        * math.pi
        * safe_area
        / (safe_perimeter ** 2)
    )

    dataframe["shape_complexity"] = (
        dataframe["vertex_count"]
        / np.sqrt(safe_area)
    )

    dataframe["perimeter_area_ratio"] = (
        safe_perimeter
        / safe_area
    )

    dataframe["area_per_vertex"] = (
        safe_area
        / dataframe["vertex_count"].clip(
            lower=1
        )
    )

    dataframe["perimeter_per_vertex"] = (
        safe_perimeter
        / dataframe["vertex_count"].clip(
            lower=1
        )
    )

    dataframe["log_area"] = np.log1p(
        safe_area
    )

    dataframe["log_perimeter"] = np.log1p(
        safe_perimeter
    )

    dataframe["is_simple_polygon"] = (
        dataframe["vertex_count"] <= 4
    ).astype(int)

    dataframe["is_complex_polygon"] = (
        dataframe["vertex_count"] >= 8
    ).astype(int)

    return dataframe


def add_furniture_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    dataframe = dataframe.copy()

    furniture_columns = [
        column
        for column in dataframe.columns
        if column.startswith("furniture_type_")
    ]

    safe_area = dataframe["area"].clip(
        lower=EPSILON
    )

    dataframe["furniture_density"] = (
        dataframe["furniture_count"]
        / safe_area
    )

    dataframe["furniture_density_10000"] = (
        dataframe["furniture_density"]
        * 10000
    )

    if furniture_columns:
        dataframe["furniture_diversity"] = (
            dataframe[furniture_columns]
            .gt(0)
            .sum(axis=1)
        )
    else:
        dataframe["furniture_diversity"] = 0

    dataframe["furniture_per_vertex"] = (
        dataframe["furniture_count"]
        / dataframe["vertex_count"].clip(
            lower=1
        )
    )

    dataframe["has_furniture"] = (
        dataframe["furniture_count"] > 0
    ).astype(int)

    dataframe["is_empty_room"] = (
        dataframe["furniture_count"] == 0
    ).astype(int)

    dataframe["is_furniture_dense"] = (
        dataframe["furniture_count"] >= 5
    ).astype(int)

    return dataframe


def add_semantic_scores(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    dataframe = dataframe.copy()

    dataframe["kitchen_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_basecabinet",
            "furniture_type_basecabinetround",
            "furniture_type_basecabinettriangle",
            "furniture_type_wallcabinet",
            "furniture_type_countertop",
            "furniture_type_refrigerator",
            "furniture_type_doublerefrigerator",
            "furniture_type_integratedstove",
            "furniture_type_integratedstovesmall",
            "furniture_type_gasstove",
            "furniture_type_stove",
            "furniture_type_dishwasher",
            "furniture_type_sink",
            "furniture_type_roundsink",
            "furniture_type_cornersink",
            "furniture_type_doublesink",
            "furniture_type_doublesinkright",
        ],
    )

    dataframe["bathroom_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_toilet",
            "furniture_type_shower",
            "furniture_type_showercab",
            "furniture_type_showerplatform",
            "furniture_type_showerscreen",
            "furniture_type_showerscreenroundleft",
            "furniture_type_showerscreenroundright",
            "furniture_type_bathtub",
            "furniture_type_bathtubround",
            "furniture_type_jacuzzi",
            "furniture_type_sink",
            "furniture_type_sidesink",
            "furniture_type_roundsink",
            "furniture_type_watertap",
        ],
    )

    dataframe["sauna_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_saunabench",
            "furniture_type_saunabenchhigh",
            "furniture_type_saunabenchlow",
            "furniture_type_saunabenchmid",
            "furniture_type_saunastove",
            "furniture_type_saunastoveround",
        ],
    )

    dataframe["laundry_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_washingmachine",
            "furniture_type_tumbledryer",
            "furniture_type_spaceforappliance",
            "furniture_type_spaceforappliance2",
        ],
    )

    dataframe["storage_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_closet",
            "furniture_type_closetround",
            "furniture_type_closettriangle",
            "furniture_type_coatcloset",
            "furniture_type_coatrack",
            "furniture_type_wallcabinet",
            "furniture_type_housing",
        ],
    )

    dataframe["cabinet_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_basecabinet",
            "furniture_type_basecabinetround",
            "furniture_type_basecabinettriangle",
            "furniture_type_wallcabinet",
            "furniture_type_countertop",
        ],
    )

    dataframe["plumbing_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_sink",
            "furniture_type_sidesink",
            "furniture_type_roundsink",
            "furniture_type_cornersink",
            "furniture_type_doublesink",
            "furniture_type_doublesinkright",
            "furniture_type_toilet",
            "furniture_type_shower",
            "furniture_type_bathtub",
            "furniture_type_watertap",
        ],
    )

    dataframe["appliance_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_refrigerator",
            "furniture_type_doublerefrigerator",
            "furniture_type_dishwasher",
            "furniture_type_washingmachine",
            "furniture_type_tumbledryer",
            "furniture_type_integratedstove",
            "furniture_type_integratedstovesmall",
            "furniture_type_gasstove",
            "furniture_type_stove",
            "furniture_type_generalappliance",
            "furniture_type_spaceforappliance",
            "furniture_type_spaceforappliance2",
        ],
    )

    dataframe["fireplace_score"] = sum_columns(
        dataframe,
        [
            "furniture_type_fireplace",
            "furniture_type_fireplacecorner",
            "furniture_type_fireplaceround",
            "furniture_type_placeforfireplace",
            "furniture_type_placeforfireplacecorner",
            "furniture_type_placeforfireplaceround",
            "furniture_type_woodstove",
            "furniture_type_chimney",
        ],
    )

    return dataframe


def add_semantic_flags(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    dataframe = dataframe.copy()

    score_columns = [
        "kitchen_score",
        "bathroom_score",
        "sauna_score",
        "laundry_score",
        "storage_score",
        "cabinet_score",
        "plumbing_score",
        "appliance_score",
        "fireplace_score",
    ]

    for column in score_columns:
        flag_name = column.replace(
            "_score",
            "_present",
        )

        dataframe[flag_name] = (
            dataframe[column] > 0
        ).astype(int)

    dataframe["dominant_semantic_score"] = (
        dataframe[score_columns]
        .max(axis=1)
    )

    dataframe["semantic_score_diversity"] = (
        dataframe[score_columns]
        .gt(0)
        .sum(axis=1)
    )

    return dataframe


def remove_invalid_values(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    dataframe = dataframe.copy()

    numeric_columns = dataframe.select_dtypes(
        include=[np.number]
    ).columns

    dataframe[numeric_columns] = (
        dataframe[numeric_columns]
        .replace(
            [np.inf, -np.inf],
            0,
        )
        .fillna(0)
    )

    return dataframe


def generate_report(
    original_dataframe: pd.DataFrame,
    enhanced_dataframe: pd.DataFrame,
) -> str:
    original_features = [
        column
        for column in original_dataframe.columns
        if column in {
            "area",
            "perimeter",
            "vertex_count",
            "furniture_count",
        }
        or column.startswith(
            "furniture_type_"
        )
    ]

    enhanced_features = [
        column
        for column in enhanced_dataframe.columns
        if column in {
            "area",
            "perimeter",
            "vertex_count",
            "furniture_count",
        }
        or column.startswith(
            "furniture_type_"
        )
        or column in {
            "compactness",
            "shape_complexity",
            "perimeter_area_ratio",
            "area_per_vertex",
            "perimeter_per_vertex",
            "log_area",
            "log_perimeter",
            "is_simple_polygon",
            "is_complex_polygon",
            "furniture_density",
            "furniture_density_10000",
            "furniture_diversity",
            "furniture_per_vertex",
            "has_furniture",
            "is_empty_room",
            "is_furniture_dense",
            "kitchen_score",
            "bathroom_score",
            "sauna_score",
            "laundry_score",
            "storage_score",
            "cabinet_score",
            "plumbing_score",
            "appliance_score",
            "fireplace_score",
            "kitchen_present",
            "bathroom_present",
            "sauna_present",
            "laundry_present",
            "storage_present",
            "cabinet_present",
            "plumbing_present",
            "appliance_present",
            "fireplace_present",
            "dominant_semantic_score",
            "semantic_score_diversity",
        }
    ]

    new_features = sorted(
        set(enhanced_features)
        - set(original_features)
    )

    lines = [
        "=" * 100,
        "ZYNORA ROOM TRAINING DATASET V3 REPORT",
        "=" * 100,
        "",
        "DATASET SUMMARY",
        "-" * 100,
        f"Rows                        : {len(enhanced_dataframe)}",
        f"Original ML features        : {len(original_features)}",
        f"New engineered features     : {len(new_features)}",
        f"Total V3 ML features        : {len(enhanced_features)}",
        f"Target classes              : {enhanced_dataframe['target_room_type'].nunique()}",
        f"Building groups             : {enhanced_dataframe['group_id'].nunique()}",
        f"Missing values              : {int(enhanced_dataframe.isna().sum().sum())}",
        "",
        "NEW ENGINEERED FEATURES",
        "-" * 100,
    ]

    lines.extend(new_features)

    lines.extend(
        [
            "",
            "REMAINING LIMITATIONS",
            "-" * 100,
            "Convexity, door/window counts and neighbouring-room graph features",
            "are not included yet.",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    print("=" * 100)
    print("ZYNORA FEATURE ENGINEERING V3")
    print("=" * 100)

    print()
    print(f"Loading dataset: {INPUT_CSV}")

    original_dataframe = load_dataset()

    original_dataframe = prepare_training_columns(
        original_dataframe
    )

    enhanced_dataframe = prepare_numeric_columns(
        original_dataframe
    )

    enhanced_dataframe = add_geometry_features(
        enhanced_dataframe
    )

    enhanced_dataframe = add_furniture_features(
        enhanced_dataframe
    )

    enhanced_dataframe = add_semantic_scores(
        enhanced_dataframe
    )

    enhanced_dataframe = add_semantic_flags(
        enhanced_dataframe
    )

    enhanced_dataframe = remove_invalid_values(
        enhanced_dataframe
    )

    report = generate_report(
        original_dataframe=original_dataframe,
        enhanced_dataframe=enhanced_dataframe,
    )

    OUTPUT_CSV.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    enhanced_dataframe.to_csv(
        OUTPUT_CSV,
        index=False,
    )

    REPORT_PATH.write_text(
        report,
        encoding="utf-8",
    )

    print()
    print(report)

    print()
    print("=" * 100)
    print("FEATURE ENGINEERING V3 COMPLETED")
    print("=" * 100)
    print(f"V3 dataset : {OUTPUT_CSV}")
    print(f"Report     : {REPORT_PATH}")


if __name__ == "__main__":
    main()