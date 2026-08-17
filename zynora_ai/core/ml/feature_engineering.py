from __future__ import annotations

import math

import numpy as np
import pandas as pd


EPSILON = 1e-9


def prepare_training_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Create target and grouping columns.

    During inference, target_room_type is retained only as metadata
    and is not passed to the ML model.
    """

    dataframe = dataframe.copy()

    if "original_room_type" not in dataframe.columns:
        dataframe["original_room_type"] = "UNDEFINED"

    dataframe["target_room_type"] = (
        dataframe["original_room_type"]
        .fillna("UNDEFINED")
        .astype(str)
        .str.strip()
        .replace("", "UNDEFINED")
    )

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
    """
    Return only the requested columns that exist in the DataFrame.
    """

    return [
        column
        for column in column_names
        if column in dataframe.columns
    ]


def sum_columns(
    dataframe: pd.DataFrame,
    columns: list[str],
) -> pd.Series:
    """
    Sum the specified columns safely.

    If none of the columns exist, return a zero-valued Series.
    """

    existing_columns = get_existing_columns(
        dataframe=dataframe,
        column_names=columns,
    )

    if not existing_columns:
        return pd.Series(
            0.0,
            index=dataframe.index,
            dtype=float,
        )

    return (
        dataframe[existing_columns]
        .apply(
            pd.to_numeric,
            errors="coerce",
        )
        .fillna(0)
        .sum(axis=1)
    )


def prepare_numeric_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Convert all non-metadata columns to numeric where possible.
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
        "status",
    }

    for column in dataframe.columns:
        if column in metadata_columns:
            continue

        dataframe[column] = pd.to_numeric(
            dataframe[column],
            errors="coerce",
        ).fillna(0)

    return dataframe


def ensure_required_base_columns(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Guarantee that the base columns needed for feature engineering exist.
    """

    dataframe = dataframe.copy()

    default_values: dict[str, float] = {
        "area": 0.0,
        "perimeter": 0.0,
        "vertex_count": 0.0,
        "furniture_count": 0.0,
    }

    for column, default_value in default_values.items():
        if column not in dataframe.columns:
            dataframe[column] = default_value

        dataframe[column] = pd.to_numeric(
            dataframe[column],
            errors="coerce",
        ).fillna(default_value)

    return dataframe


def add_geometry_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Add geometry-derived numerical and binary features.
    """

    dataframe = dataframe.copy()

    safe_area = dataframe["area"].clip(
        lower=EPSILON,
    )

    safe_perimeter = dataframe["perimeter"].clip(
        lower=EPSILON,
    )

    safe_vertex_count = dataframe[
        "vertex_count"
    ].clip(lower=1)

    dataframe["compactness"] = (
        4.0
        * math.pi
        * safe_area
        / (safe_perimeter**2)
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
        / safe_vertex_count
    )

    dataframe["perimeter_per_vertex"] = (
        safe_perimeter
        / safe_vertex_count
    )

    dataframe["log_area"] = np.log1p(
        safe_area,
    )

    dataframe["log_perimeter"] = np.log1p(
        safe_perimeter,
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
    """
    Add furniture-density and furniture-diversity features.
    """

    dataframe = dataframe.copy()

    furniture_columns = [
        column
        for column in dataframe.columns
        if column.startswith("furniture_type_")
    ]

    safe_area = dataframe["area"].clip(
        lower=EPSILON,
    )

    safe_vertex_count = dataframe[
        "vertex_count"
    ].clip(lower=1)

    dataframe["furniture_density"] = (
        dataframe["furniture_count"]
        / safe_area
    )

    dataframe["furniture_density_10000"] = (
        dataframe["furniture_density"]
        * 10000
    )

    if furniture_columns:
        furniture_values = (
            dataframe[furniture_columns]
            .apply(
                pd.to_numeric,
                errors="coerce",
            )
            .fillna(0)
        )

        dataframe["furniture_diversity"] = (
            furniture_values
            .gt(0)
            .sum(axis=1)
        )

    else:
        dataframe["furniture_diversity"] = 0

    dataframe["furniture_per_vertex"] = (
        dataframe["furniture_count"]
        / safe_vertex_count
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
    """
    Calculate semantic room scores from detected furniture.
    """

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
    """
    Add binary semantic flags and semantic summary features.
    """

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
        if column not in dataframe.columns:
            dataframe[column] = 0.0

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
    """
    Replace NaN and infinite numerical values with zero.
    """

    dataframe = dataframe.copy()

    numeric_columns = dataframe.select_dtypes(
        include=[np.number],
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


def engineer_features(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    """
    Apply the complete V3/V5-compatible feature-engineering pipeline.

    Parameters
    ----------
    dataframe:
        Raw room-feature DataFrame containing geometry and furniture
        information.

    Returns
    -------
    pd.DataFrame
        DataFrame containing the original columns and all engineered
        ML features.
    """

    if not isinstance(dataframe, pd.DataFrame):
        raise TypeError(
            "engineer_features expects a pandas DataFrame."
        )

    if dataframe.empty:
        return dataframe.copy()

    engineered_dataframe = prepare_training_columns(
        dataframe,
    )

    engineered_dataframe = prepare_numeric_columns(
        engineered_dataframe,
    )

    engineered_dataframe = ensure_required_base_columns(
        engineered_dataframe,
    )

    engineered_dataframe = add_geometry_features(
        engineered_dataframe,
    )

    engineered_dataframe = add_furniture_features(
        engineered_dataframe,
    )

    engineered_dataframe = add_semantic_scores(
        engineered_dataframe,
    )

    engineered_dataframe = add_semantic_flags(
        engineered_dataframe,
    )

    engineered_dataframe = remove_invalid_values(
        engineered_dataframe,
    )

    return engineered_dataframe