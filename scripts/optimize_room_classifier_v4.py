from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from scipy.stats import randint
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import RandomizedSearchCV, StratifiedGroupKFold
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs" / "room_training_dataset_v4.csv"
MODEL_DIR = ROOT / "outputs" / "models"
OUTDIR = ROOT / "outputs" / "optimization_v4"
FEATURES_PATH = MODEL_DIR / "room_feature_columns_v4_selected.pkl"
PARAMS_PATH = MODEL_DIR / "room_classifier_v4_best_params.json"
RESULTS_PATH = OUTDIR / "randomized_search_results.csv"
REPORT = OUTDIR / "optimization_report.txt"

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT}")
    if not FEATURES_PATH.exists():
        raise FileNotFoundError("Run feature_selection_v4 first.")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    OUTDIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT, low_memory=False)

    required = {"target_room_type", "group_id"}
    missing = required - set(df.columns)
    if missing:
        raise KeyError(f"Missing required columns: {sorted(missing)}")

    features = [c for c in joblib.load(FEATURES_PATH) if c in df.columns]
    if not features:
        raise ValueError("No selected features found in dataset.")

    x = df[features].replace([np.inf, -np.inf], 0).fillna(0)
    encoder = LabelEncoder()
    y = encoder.fit_transform(df["target_room_type"].astype(str))
    groups = df["group_id"].astype(str)

    model = RandomForestClassifier(
        class_weight="balanced_subsample",
        random_state=42,
        n_jobs=-1,
    )
    params = {
        "n_estimators": randint(300, 801),
        "max_depth": [None, 15, 20, 25, 30, 40],
        "min_samples_split": randint(2, 16),
        "min_samples_leaf": randint(1, 8),
        "max_features": ["sqrt", "log2", 0.4, 0.6, 0.8],
        "criterion": ["gini", "entropy", "log_loss"],
        "bootstrap": [True],
        "max_samples": [None, 0.7, 0.85],
    }
    cv = StratifiedGroupKFold(n_splits=4, shuffle=True, random_state=42)
    search = RandomizedSearchCV(
        model,
        param_distributions=params,
        n_iter=20,
        scoring="f1_weighted",
        n_jobs=-1,
        cv=cv,
        verbose=2,
        random_state=42,
        return_train_score=True,
        error_score="raise",
    )
    search.fit(x, y, groups=groups)

    pd.DataFrame(search.cv_results_).sort_values("rank_test_score").to_csv(
        RESULTS_PATH, index=False
    )
    clean_params = {
        k: (v.item() if hasattr(v, "item") else v)
        for k, v in search.best_params_.items()
    }
    PARAMS_PATH.write_text(json.dumps(clean_params, indent=2), encoding="utf-8")

    lines = [
        "=" * 80,
        "ZYNORA V4 OPTIMIZATION",
        "=" * 80,
        f"Rows: {len(df)}",
        f"Features: {len(features)}",
        f"Classes: {len(encoder.classes_)}",
        f"Best weighted F1: {search.best_score_:.6f}",
        "",
        "Best parameters:",
        json.dumps(clean_params, indent=2),
    ]
    text = "\n".join(lines)
    REPORT.write_text(text, encoding="utf-8")
    print(text)

if __name__ == "__main__":
    main()
