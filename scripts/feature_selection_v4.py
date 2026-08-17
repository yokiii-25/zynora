from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs" / "room_training_dataset_v4.csv"
MODEL_DIR = ROOT / "outputs" / "models"
OUTDIR = ROOT / "outputs" / "feature_selection_v4"
SELECTED_PATH = MODEL_DIR / "room_feature_columns_v4_selected.pkl"
IMPORTANCE_PATH = OUTDIR / "all_feature_importance.csv"
SELECTED_CSV = OUTDIR / "selected_feature_importance.csv"
REPORT = OUTDIR / "feature_selection_report.txt"
MAX_FEATURES = 80
EXCLUDE = {
    "source_svg", "building_id", "group_id", "room_id", "original_room_type",
    "target_room_type", "target_room_type_original_v3", "predicted_room_type",
    "confidence",
}

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT}")
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    OUTDIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT, low_memory=False)
    if "target_room_type" not in df.columns:
        raise KeyError("Column 'target_room_type' not found.")

    features = [
        c for c in df.select_dtypes(include="number").columns if c not in EXCLUDE
    ]
    if not features:
        raise ValueError("No numeric features found.")

    x = df[features].replace([np.inf, -np.inf], 0).fillna(0)
    encoder = LabelEncoder()
    y = encoder.fit_transform(df["target_room_type"].astype(str))

    model = RandomForestClassifier(
        n_estimators=300,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
        verbose=1,
    )
    model.fit(x, y)

    importance = pd.DataFrame({
        "feature": features,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    importance.to_csv(IMPORTANCE_PATH, index=False)

    selected_count = min(MAX_FEATURES, len(importance))
    selected = importance.head(selected_count)["feature"].tolist()
    joblib.dump(selected, SELECTED_PATH)
    importance.head(selected_count).to_csv(SELECTED_CSV, index=False)

    lines = [
        "=" * 80,
        "ZYNORA V4 FEATURE SELECTION",
        "=" * 80,
        f"Available features: {len(features)}",
        f"Selected features: {len(selected)}",
        f"Classes: {len(encoder.classes_)}",
        "",
        "Top selected features:",
        *selected[:30],
    ]
    text = "\n".join(lines)
    REPORT.write_text(text, encoding="utf-8")
    print(text)

if __name__ == "__main__":
    main()
