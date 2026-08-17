from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs" / "room_training_dataset_v3.csv"
OUTDIR = ROOT / "outputs" / "analysis_v3"

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT}")
    OUTDIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT, low_memory=False)
    required = {"target_room_type", "group_id"}
    missing = required - set(df.columns)
    if missing:
        raise KeyError(f"Missing required columns: {sorted(missing)}")

    df["target_room_type"] = df["target_room_type"].fillna("").astype(str).str.strip()
    df["group_id"] = df["group_id"].fillna("unknown").astype(str)
    df = df[df["target_room_type"] != ""].copy()

    counts = (
        df["target_room_type"].value_counts()
        .rename_axis("target_room_type")
        .reset_index(name="sample_count")
    )
    groups = (
        df.groupby("target_room_type")["group_id"].nunique()
        .reset_index(name="building_count")
    )
    report = counts.merge(groups, on="target_room_type", how="left")
    report["sample_percentage"] = report["sample_count"] / len(df) * 100
    report.to_csv(OUTDIR / "class_distribution.csv", index=False)

    rare_parts = []
    for threshold in (5, 10, 20, 50, 100):
        part = report[report["sample_count"] < threshold].copy()
        part.insert(0, "threshold", threshold)
        rare_parts.append(part)
    pd.concat(rare_parts, ignore_index=True).to_csv(
        OUTDIR / "rare_classes_by_threshold.csv", index=False
    )

    numeric = df.select_dtypes(include="number")
    if not numeric.empty:
        summary = numeric.describe().T
        summary["missing_count"] = numeric.isna().sum()
        summary["zero_count"] = numeric.eq(0).sum()
        summary["unique_count"] = numeric.nunique()
        summary.to_csv(OUTDIR / "numeric_feature_summary.csv")

    lines = [
        "=" * 80,
        "ZYNORA ROOM DATASET V3 ANALYSIS",
        "=" * 80,
        f"Rows: {len(df)}",
        f"Columns: {len(df.columns)}",
        f"Classes: {df['target_room_type'].nunique()}",
        f"Groups: {df['group_id'].nunique()}",
        "",
        "Rare classes:",
    ]
    for threshold in (5, 10, 20, 50, 100):
        lines.append(f"Below {threshold}: {int((report['sample_count'] < threshold).sum())}")

    text = "\n".join(lines)
    (OUTDIR / "analysis_report.txt").write_text(text, encoding="utf-8")
    print(text)

if __name__ == "__main__":
    main()
