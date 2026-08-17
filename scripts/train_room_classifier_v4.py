from pathlib import Path
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, classification_report, confusion_matrix,
    f1_score, precision_score, recall_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs" / "room_training_dataset_v4.csv"
MODEL_DIR = ROOT / "outputs" / "models"
MODEL_PATH = MODEL_DIR / "room_classifier_v4.pkl"
ENCODER_PATH = MODEL_DIR / "room_label_encoder_v4.pkl"
FEATURES_OUT = MODEL_DIR / "room_feature_columns_v4.pkl"
SELECTED_PATH = MODEL_DIR / "room_feature_columns_v4_selected.pkl"
PARAMS_PATH = MODEL_DIR / "room_classifier_v4_best_params.json"
REPORT = ROOT / "outputs" / "room_classifier_v4_report.txt"
PREDICTIONS = ROOT / "outputs" / "room_classifier_v4_test_predictions.csv"
IMPORTANCE = ROOT / "outputs" / "room_classifier_v4_feature_importance.csv"
CONFUSION = ROOT / "outputs" / "room_classifier_v4_confusion_matrix.csv"

def choose_split(df):
    all_classes = set(df["target_room_type"].astype(str).unique())
    best = None
    for seed in range(42, 242):
        splitter = GroupShuffleSplit(n_splits=1, test_size=0.20, random_state=seed)
        train_idx, test_idx = next(
            splitter.split(df, groups=df["group_id"].astype(str))
        )
        train_classes = set(
            df.iloc[train_idx]["target_room_type"].astype(str).unique()
        )
        missing = all_classes - train_classes
        candidate = (len(missing), seed, train_idx, test_idx, missing)
        if best is None or candidate[0] < best[0]:
            best = candidate
        if not missing:
            return seed, train_idx, test_idx, missing
    return best[1], best[2], best[3], best[4]

def save_predictions(test_df, actual, predicted, probabilities, model, encoder):
    cols = [
        c for c in [
            "source_svg", "building_id", "group_id", "room_id",
            "original_room_type", "target_room_type"
        ] if c in test_df.columns
    ]
    out = test_df[cols].copy()
    out["actual_room_type"] = actual
    out["predicted_room_type"] = predicted
    out["prediction_correct"] = out["actual_room_type"] == out["predicted_room_type"]
    out["prediction_confidence"] = probabilities.max(axis=1)

    trained_ids = {int(v) for v in model.classes_}
    for probability_index, encoded_id in enumerate(model.classes_):
        class_name = encoder.inverse_transform([int(encoded_id)])[0]
        out[f"probability_{class_name}"] = probabilities[:, probability_index]
    for encoded_id, class_name in enumerate(encoder.classes_):
        if encoded_id not in trained_ids:
            out[f"probability_{class_name}"] = 0.0
    out.to_csv(PREDICTIONS, index=False)

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Dataset not found: {INPUT}")
    if not SELECTED_PATH.exists():
        raise FileNotFoundError("Run feature_selection_v4 first.")

    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT, low_memory=False)
    required = {"target_room_type", "group_id"}
    missing = required - set(df.columns)
    if missing:
        raise KeyError(f"Missing required columns: {sorted(missing)}")

    features = [c for c in joblib.load(SELECTED_PATH) if c in df.columns]
    if not features:
        raise ValueError("No selected features found.")

    seed, train_idx, test_idx, missing_train_classes = choose_split(df)
    train_df = df.iloc[train_idx].copy()
    test_df = df.iloc[test_idx].copy()

    encoder = LabelEncoder()
    encoder.fit(df["target_room_type"].astype(str))
    x_train = train_df[features].replace([np.inf, -np.inf], 0).fillna(0)
    x_test = test_df[features].replace([np.inf, -np.inf], 0).fillna(0)
    y_train = encoder.transform(train_df["target_room_type"].astype(str))
    y_test = encoder.transform(test_df["target_room_type"].astype(str))

    params = {
        "n_estimators": 500,
        "max_depth": None,
        "min_samples_split": 4,
        "min_samples_leaf": 2,
        "max_features": "sqrt",
        "criterion": "gini",
        "bootstrap": True,
        "class_weight": "balanced_subsample",
        "random_state": 42,
        "n_jobs": -1,
        "verbose": 1,
    }
    if PARAMS_PATH.exists():
        params.update(json.loads(PARAMS_PATH.read_text(encoding="utf-8")))
        params.update({
            "class_weight": "balanced_subsample",
            "random_state": 42,
            "n_jobs": -1,
            "verbose": 1,
        })

    model = RandomForestClassifier(**params)
    model.fit(x_train, y_train)
    predicted_ids = model.predict(x_test)
    probabilities = model.predict_proba(x_test)
    actual_labels = encoder.inverse_transform(y_test)
    predicted_labels = encoder.inverse_transform(predicted_ids)

    save_predictions(
        test_df, actual_labels, predicted_labels, probabilities, model, encoder
    )

    accuracy = accuracy_score(y_test, predicted_ids)
    macro_precision = precision_score(
        y_test, predicted_ids, average="macro", zero_division=0
    )
    macro_recall = recall_score(
        y_test, predicted_ids, average="macro", zero_division=0
    )
    macro_f1 = f1_score(
        y_test, predicted_ids, average="macro", zero_division=0
    )
    weighted_f1 = f1_score(
        y_test, predicted_ids, average="weighted", zero_division=0
    )

    all_ids = np.arange(len(encoder.classes_))
    class_report = classification_report(
        y_test, predicted_ids, labels=all_ids,
        target_names=encoder.classes_, zero_division=0
    )
    matrix = confusion_matrix(y_test, predicted_ids, labels=all_ids)
    pd.DataFrame(
        matrix, index=encoder.classes_, columns=encoder.classes_
    ).to_csv(CONFUSION)

    importance = pd.DataFrame({
        "feature": features,
        "importance": model.feature_importances_,
    }).sort_values("importance", ascending=False)
    importance.to_csv(IMPORTANCE, index=False)

    joblib.dump(model, MODEL_PATH)
    joblib.dump(encoder, ENCODER_PATH)
    joblib.dump(features, FEATURES_OUT)

    overlap = len(
        set(train_df["group_id"].astype(str))
        & set(test_df["group_id"].astype(str))
    )
    lines = [
        "=" * 80,
        "ZYNORA RANDOM FOREST V4 REPORT",
        "=" * 80,
        f"Total records: {len(df)}",
        f"Training records: {len(train_df)}",
        f"Testing records: {len(test_df)}",
        f"Features: {len(features)}",
        f"Classes: {len(encoder.classes_)}",
        f"Split seed: {seed}",
        f"Missing training classes: {sorted(missing_train_classes)}",
        f"Group overlap: {overlap}",
        "",
        "Metrics",
        "-" * 80,
        f"Accuracy: {accuracy:.4f}",
        f"Macro precision: {macro_precision:.4f}",
        f"Macro recall: {macro_recall:.4f}",
        f"Macro F1: {macro_f1:.4f}",
        f"Weighted F1: {weighted_f1:.4f}",
        "",
        "Classification report",
        "-" * 80,
        class_report,
    ]
    text = "\n".join(lines)
    REPORT.write_text(text, encoding="utf-8")
    print(text)

if __name__ == "__main__":
    main()
