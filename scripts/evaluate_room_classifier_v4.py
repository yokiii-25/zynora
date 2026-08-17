from pathlib import Path
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "outputs" / "room_classifier_v4_test_predictions.csv"
OUTDIR = ROOT / "outputs" / "evaluation_v4"

def main():
    if not INPUT.exists():
        raise FileNotFoundError(f"Predictions file not found: {INPUT}")
    OUTDIR.mkdir(parents=True, exist_ok=True)
    df = pd.read_csv(INPUT, low_memory=False)

    required = {"actual_room_type", "predicted_room_type"}
    missing = required - set(df.columns)
    if missing:
        raise KeyError(f"Missing required columns: {sorted(missing)}")

    actual = df["actual_room_type"].astype(str)
    predicted = df["predicted_room_type"].astype(str)

    rows = []
    for class_name in sorted(set(actual) | set(predicted)):
        actual_mask = actual == class_name
        predicted_mask = predicted == class_name
        tp = int((actual_mask & predicted_mask).sum())
        support = int(actual_mask.sum())
        predicted_count = int(predicted_mask.sum())
        precision = tp / predicted_count if predicted_count else 0.0
        recall = tp / support if support else 0.0
        f1_value = (
            2 * precision * recall / (precision + recall)
            if precision + recall else 0.0
        )
        rows.append({
            "target_room_type": class_name,
            "support": support,
            "predicted_count": predicted_count,
            "precision": precision,
            "recall": recall,
            "f1_score": f1_value,
        })

    class_metrics = pd.DataFrame(rows).sort_values(
        ["f1_score", "support"], ascending=[True, False]
    )
    class_metrics.to_csv(OUTDIR / "per_class_metrics.csv", index=False)

    confusion_pairs = (
        df.loc[actual != predicted]
        .groupby(["actual_room_type", "predicted_room_type"])
        .size()
        .reset_index(name="count")
        .sort_values("count", ascending=False)
    )
    confusion_pairs.to_csv(OUTDIR / "top_confusion_pairs.csv", index=False)

    if "group_id" in df.columns:
        temp = df.copy()
        temp["prediction_correct"] = actual == predicted
        (
            temp.groupby("group_id")["prediction_correct"]
            .mean()
            .reset_index(name="accuracy")
            .sort_values("accuracy")
            .to_csv(OUTDIR / "per_building_accuracy.csv", index=False)
        )

    accuracy = accuracy_score(actual, predicted)
    macro_precision = precision_score(
        actual, predicted, average="macro", zero_division=0
    )
    macro_recall = recall_score(
        actual, predicted, average="macro", zero_division=0
    )
    macro_f1 = f1_score(actual, predicted, average="macro", zero_division=0)
    weighted_f1 = f1_score(
        actual, predicted, average="weighted", zero_division=0
    )

    lines = [
        "=" * 80,
        "ZYNORA V4 ERROR ANALYSIS",
        "=" * 80,
        f"Test records: {len(df)}",
        f"Accuracy: {accuracy:.4f}",
        f"Macro precision: {macro_precision:.4f}",
        f"Macro recall: {macro_recall:.4f}",
        f"Macro F1: {macro_f1:.4f}",
        f"Weighted F1: {weighted_f1:.4f}",
        "",
        "Top confusion pairs",
        "-" * 80,
        confusion_pairs.head(20).to_string(index=False),
    ]
    text = "\n".join(lines)
    (OUTDIR / "evaluation_report.txt").write_text(text, encoding="utf-8")
    print(text)

if __name__ == "__main__":
    main()
