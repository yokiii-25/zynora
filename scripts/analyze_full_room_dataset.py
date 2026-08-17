from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_dataset_full.csv"
)

REPORT_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_dataset_analysis.txt"
)

CHART_DIRECTORY = (
    PROJECT_ROOT
    / "outputs"
    / "dataset_charts"
)


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Dataset file not found: {DATASET_PATH}"
        )

    dataframe = pd.read_csv(
        DATASET_PATH,
        low_memory=False,
    )

    if dataframe.empty:
        raise ValueError("The dataset is empty.")

    return dataframe


def normalize_room_type(value: object) -> str:
    text = str(value).strip()

    if text.lower() in {
        "",
        "undefined",
        "unknown",
        "none",
        "nan",
    }:
        return "UNDEFINED"

    return text


def clean_dataset(
    dataframe: pd.DataFrame,
) -> pd.DataFrame:
    dataframe = dataframe.copy()

    text_columns = [
        "source_svg",
        "building_id",
        "room_id",
        "original_room_type",
        "predicted_room_type",
    ]

    for column in text_columns:
        if column in dataframe.columns:
            dataframe[column] = (
                dataframe[column]
                .fillna("UNKNOWN")
                .astype(str)
                .str.strip()
            )

    dataframe["original_room_type"] = (
        dataframe["original_room_type"]
        .apply(normalize_room_type)
    )

    dataframe["predicted_room_type"] = (
        dataframe["predicted_room_type"]
        .apply(normalize_room_type)
    )

    numeric_columns = [
        "confidence",
        "area",
        "perimeter",
        "vertex_count",
        "furniture_count",
    ]

    for column in numeric_columns:
        if column in dataframe.columns:
            dataframe[column] = pd.to_numeric(
                dataframe[column],
                errors="coerce",
            )

    return dataframe


def add_distribution(
    lines: list[str],
    title: str,
    series: pd.Series,
    total_rows: int,
) -> None:
    lines.append("")
    lines.append(title)
    lines.append("-" * 100)

    for label, count in series.items():
        percentage = count / total_rows * 100

        lines.append(
            f"{str(label):<35}"
            f"{int(count):>8} "
            f"({percentage:>6.2f}%)"
        )


def generate_report(
    dataframe: pd.DataFrame,
) -> list[str]:
    lines: list[str] = []

    lines.append("=" * 100)
    lines.append("ZYNORA FULL ROOM DATASET ANALYSIS")
    lines.append("=" * 100)

    lines.append("")
    lines.append("GENERAL DATASET INFORMATION")
    lines.append("-" * 100)

    lines.append(
        f"Rows                    : {len(dataframe)}"
    )
    lines.append(
        f"Columns                 : {len(dataframe.columns)}"
    )

    unique_buildings = (
        dataframe["building_id"].nunique()
        if "building_id" in dataframe.columns
        else 0
    )

    lines.append(
        f"Unique buildings        : {unique_buildings}"
    )

    duplicate_rows = int(
        dataframe.duplicated().sum()
    )

    lines.append(
        f"Duplicate rows          : {duplicate_rows}"
    )

    missing_values = int(
        dataframe.isna().sum().sum()
    )

    lines.append(
        f"Total missing values    : {missing_values}"
    )

    duplicate_columns = (
        dataframe.columns[
            dataframe.columns.duplicated()
        ].tolist()
    )

    lines.append(
        "Duplicate column names  : "
        + (
            ", ".join(duplicate_columns)
            if duplicate_columns
            else "None"
        )
    )

    lines.append("")
    lines.append("LABEL INFORMATION")
    lines.append("-" * 100)

    undefined_mask = (
        dataframe["original_room_type"]
        == "UNDEFINED"
    )

    trusted_count = int(
        (~undefined_mask).sum()
    )

    undefined_count = int(
        undefined_mask.sum()
    )

    lines.append(
        f"Trusted original labels : {trusted_count}"
    )
    lines.append(
        f"Undefined labels        : {undefined_count}"
    )
    lines.append(
        f"Trusted label percent   : "
        f"{trusted_count / len(dataframe) * 100:.2f}%"
    )
    lines.append(
        f"Undefined percent       : "
        f"{undefined_count / len(dataframe) * 100:.2f}%"
    )

    original_counts = (
        dataframe["original_room_type"]
        .value_counts(dropna=False)
    )

    predicted_counts = (
        dataframe["predicted_room_type"]
        .value_counts(dropna=False)
    )

    add_distribution(
        lines=lines,
        title="ORIGINAL ROOM TYPE DISTRIBUTION",
        series=original_counts,
        total_rows=len(dataframe),
    )

    add_distribution(
        lines=lines,
        title="PREDICTED ROOM TYPE DISTRIBUTION",
        series=predicted_counts,
        total_rows=len(dataframe),
    )

    lines.append("")
    lines.append("NUMERICAL FEATURE STATISTICS")
    lines.append("-" * 100)

    numeric_columns = [
        column
        for column in [
            "confidence",
            "area",
            "perimeter",
            "vertex_count",
            "furniture_count",
        ]
        if column in dataframe.columns
    ]

    if numeric_columns:
        statistics = (
            dataframe[numeric_columns]
            .describe()
            .transpose()
        )

        lines.append(
            statistics.to_string()
        )

    furniture_columns = [
        column
        for column in dataframe.columns
        if column.startswith(
            "furniture_type_"
        )
    ]

    lines.append("")
    lines.append("FURNITURE FEATURE INFORMATION")
    lines.append("-" * 100)
    lines.append(
        f"Furniture feature columns: "
        f"{len(furniture_columns)}"
    )

    if furniture_columns:
        furniture_totals = (
            dataframe[furniture_columns]
            .fillna(0)
            .sum()
            .sort_values(
                ascending=False
            )
        )

        lines.append("")
        lines.append("TOP 20 FURNITURE TYPES")

        for column, count in (
            furniture_totals.head(20).items()
        ):
            readable_name = column.replace(
                "furniture_type_",
                "",
            )

            lines.append(
                f"{readable_name:<35}"
                f"{int(count):>10}"
            )

    lines.append("")
    lines.append("CONFIDENCE DISTRIBUTION")
    lines.append("-" * 100)

    confidence_counts = (
        dataframe["confidence"]
        .round(2)
        .value_counts(dropna=False)
        .sort_index()
    )

    for confidence, count in confidence_counts.items():
        lines.append(
            f"{str(confidence):>8} : {int(count)}"
        )

    return lines


def save_bar_chart(
    series: pd.Series,
    title: str,
    x_label: str,
    y_label: str,
    output_path: Path,
    limit: int = 20,
) -> None:
    chart_data = (
        series
        .head(limit)
        .sort_values()
    )

    if chart_data.empty:
        return

    plt.figure(
        figsize=(12, 7)
    )

    chart_data.plot(
        kind="barh"
    )

    plt.title(title)
    plt.xlabel(x_label)
    plt.ylabel(y_label)
    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=200,
        bbox_inches="tight",
    )

    plt.close()


def save_histogram(
    dataframe: pd.DataFrame,
    column: str,
    title: str,
    output_path: Path,
    bins: int = 50,
) -> None:
    if column not in dataframe.columns:
        return

    values = (
        pd.to_numeric(
            dataframe[column],
            errors="coerce",
        )
        .dropna()
    )

    if values.empty:
        return

    plt.figure(
        figsize=(10, 6)
    )

    plt.hist(
        values,
        bins=bins,
    )

    plt.title(title)
    plt.xlabel(column)
    plt.ylabel("Frequency")
    plt.tight_layout()

    plt.savefig(
        output_path,
        dpi=200,
        bbox_inches="tight",
    )

    plt.close()


def generate_charts(
    dataframe: pd.DataFrame,
) -> None:
    CHART_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    original_counts = (
        dataframe["original_room_type"]
        .value_counts()
    )

    save_bar_chart(
        series=original_counts,
        title="Top Original Room Types",
        x_label="Room Count",
        y_label="Original Room Type",
        output_path=(
            CHART_DIRECTORY
            / "original_room_type_distribution.png"
        ),
    )

    predicted_counts = (
        dataframe["predicted_room_type"]
        .value_counts()
    )

    save_bar_chart(
        series=predicted_counts,
        title="Top Predicted Room Types",
        x_label="Room Count",
        y_label="Predicted Room Type",
        output_path=(
            CHART_DIRECTORY
            / "predicted_room_type_distribution.png"
        ),
    )

    save_histogram(
        dataframe=dataframe,
        column="area",
        title="Room Area Distribution",
        output_path=(
            CHART_DIRECTORY
            / "room_area_distribution.png"
        ),
    )

    save_histogram(
        dataframe=dataframe,
        column="perimeter",
        title="Room Perimeter Distribution",
        output_path=(
            CHART_DIRECTORY
            / "room_perimeter_distribution.png"
        ),
    )

    save_histogram(
        dataframe=dataframe,
        column="furniture_count",
        title="Furniture Count Distribution",
        output_path=(
            CHART_DIRECTORY
            / "furniture_count_distribution.png"
        ),
        bins=30,
    )

    furniture_columns = [
        column
        for column in dataframe.columns
        if column.startswith(
            "furniture_type_"
        )
    ]

    if furniture_columns:
        furniture_totals = (
            dataframe[furniture_columns]
            .fillna(0)
            .sum()
            .sort_values(
                ascending=False
            )
        )

        furniture_totals.index = [
            column.replace(
                "furniture_type_",
                "",
            )
            for column in furniture_totals.index
        ]

        save_bar_chart(
            series=furniture_totals,
            title="Top Furniture Types",
            x_label="Total Furniture Count",
            y_label="Furniture Type",
            output_path=(
                CHART_DIRECTORY
                / "top_furniture_types.png"
            ),
        )


def main() -> None:
    print("=" * 100)
    print("ZYNORA FULL ROOM DATASET ANALYSIS")
    print("=" * 100)

    print()
    print(f"Loading dataset: {DATASET_PATH}")

    dataframe = load_dataset()
    dataframe = clean_dataset(
        dataframe
    )

    report_lines = generate_report(
        dataframe
    )

    REPORT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    REPORT_PATH.write_text(
        "\n".join(report_lines),
        encoding="utf-8",
    )

    generate_charts(
        dataframe
    )

    print()
    print("\n".join(report_lines))

    print()
    print("=" * 100)
    print("ANALYSIS COMPLETED")
    print("=" * 100)
    print(f"Report : {REPORT_PATH}")
    print(f"Charts : {CHART_DIRECTORY}")


if __name__ == "__main__":
    main()