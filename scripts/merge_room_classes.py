from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs" / "room_training_dataset_v3.csv"
OUTPUT = ROOT / "outputs" / "room_training_dataset_v4.csv"
REMOVED = ROOT / "outputs" / "room_training_dataset_v4_removed.csv"
COUNTS = ROOT / "outputs" / "room_training_dataset_v4_class_counts.csv"
REPORT = ROOT / "outputs" / "room_training_dataset_v4_merge_report.txt"

MIN_SAMPLES = 20
MERGES = {
    "Outdoor Balcony Covered": "Outdoor Balcony",
    "Outdoor Balcony Glazed": "Outdoor Balcony",
    "Outdoor Patio": "Outdoor",
    "Outdoor Patio Glazed": "Outdoor",
    "Outdoor Terrace": "Outdoor",
    "Outdoor Terrace Covered": "Outdoor",
    "Outdoor Veranda": "Outdoor",
    "Outdoor Veranda Glazed": "Outdoor",
    "Storage Fuel": "Storage",
    "Storage Oil": "Storage",
    "Storage Wood": "Storage",
    "Storage Bike": "Storage",
    "Storage Cold": "Storage",
    "Storage Shed": "Storage",
    "Technical Room Boiler": "Technical Room",
    "Utility Drying": "Utility Laundry",
}

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT}")
    df = pd.read_csv(INPUT, low_memory=False)
    if "target_room_type" not in df.columns:
        raise KeyError("Column 'target_room_type' not found.")

    original_rows = len(df)
    original_classes = df["target_room_type"].nunique(dropna=True)
    df["target_room_type_original_v3"] = df["target_room_type"]
    df["target_room_type"] = (
        df["target_room_type"].fillna("").astype(str).str.strip().replace(MERGES)
    )
    df = df[df["target_room_type"] != ""].copy()

    counts = df["target_room_type"].value_counts()
    rare_classes = set(counts[counts < MIN_SAMPLES].index)
    removed = df[df["target_room_type"].isin(rare_classes)].copy()
    kept = df[~df["target_room_type"].isin(rare_classes)].copy()

    kept.to_csv(OUTPUT, index=False)
    removed.to_csv(REMOVED, index=False)
    (
        kept["target_room_type"].value_counts()
        .rename_axis("target_room_type")
        .reset_index(name="sample_count")
        .to_csv(COUNTS, index=False)
    )

    lines = [
        "=" * 80,
        "ZYNORA ROOM CLASS MERGE REPORT",
        "=" * 80,
        f"Input rows: {original_rows}",
        f"Output rows: {len(kept)}",
        f"Removed rows: {len(removed)}",
        f"Original classes: {original_classes}",
        f"Final classes: {kept['target_room_type'].nunique()}",
        f"Minimum samples: {MIN_SAMPLES}",
        "",
        "Removed rare classes:",
    ]
    lines.extend(sorted(rare_classes) if rare_classes else ["None"])
    text = "\n".join(lines)
    REPORT.write_text(text, encoding="utf-8")
    print(text)

if __name__ == "__main__":
    main()
