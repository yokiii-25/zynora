from __future__ import annotations

from pathlib import Path

import joblib
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    ConfusionMatrixDisplay,
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GroupShuffleSplit
from sklearn.preprocessing import LabelEncoder


PROJECT_ROOT = Path(__file__).resolve().parents[1]

DATASET_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_training_dataset_v2.csv"
)

MODEL_DIRECTORY = (
    PROJECT_ROOT
    / "outputs"
    / "models"
)

CHART_DIRECTORY = (
    PROJECT_ROOT
    / "outputs"
    / "model_charts"
)

REPORT_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_classifier_v2_report.txt"
)

MODEL_PATH = (
    MODEL_DIRECTORY
    / "room_classifier_v2.pkl"
)

LABEL_ENCODER_PATH = (
    MODEL_DIRECTORY
    / "room_label_encoder_v2.pkl"
)

FEATURE_COLUMNS_PATH = (
    MODEL_DIRECTORY
    / "room_feature_columns_v2.pkl"
)

TEST_PREDICTIONS_PATH = (
    PROJECT_ROOT
    / "outputs"
    / "room_classifier_v2_test_predictions.csv"
)

RANDOM_STATE = 42
TEST_SIZE = 0.20


def load_dataset() -> pd.DataFrame:
    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Training dataset not found: {DATASET_PATH}"
        )

    dataframe = pd.read_csv(
        DATASET_PATH,
        low_memory=False,
    )

    if dataframe.empty:
        raise ValueError(
            "The training dataset is empty."
        )

    required_columns = {
        "group_id",
        "target_room_type",
        "source_svg",
        "building_id",
        "room_id",
    }

    missing_columns = (
        required_columns
        - set(dataframe.columns)
    )

    if missing_columns:
        raise ValueError(
            "Required columns are missing: "
            + ", ".join(
                sorted(missing_columns)
            )
        )

    return dataframe


def get_feature_columns(
    dataframe: pd.DataFrame,
) -> list[str]:
    excluded_columns = {
        "source_svg",
        "building_id",
        "group_id",
        "room_id",
        "original_room_type",
        "target_room_type",
    }

    feature_columns = [
        column
        for column in dataframe.columns
        if column not in excluded_columns
        and pd.api.types.is_numeric_dtype(
            dataframe[column]
        )
    ]

    if not feature_columns:
        raise ValueError(
            "No numerical ML features were found."
        )

    feature_columns = sorted(
        feature_columns
    )

    print()
    print(
        f"Detected {len(feature_columns)} numerical ML features."
    )

    return feature_columns


def prepare_features(
    dataframe: pd.DataFrame,
    feature_columns: list[str],
) -> pd.DataFrame:
    features = dataframe[
        feature_columns
    ].copy()

    for column in feature_columns:
        features[column] = pd.to_numeric(
            features[column],
            errors="coerce",
        ).fillna(0)

    return features


def perform_group_split(
    dataframe: pd.DataFrame,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    splitter = GroupShuffleSplit(
        n_splits=1,
        test_size=TEST_SIZE,
        random_state=RANDOM_STATE,
    )

    train_indices, test_indices = next(
        splitter.split(
            dataframe,
            groups=dataframe["group_id"],
        )
    )

    train_dataframe = (
        dataframe
        .iloc[train_indices]
        .copy()
        .reset_index(drop=True)
    )

    test_dataframe = (
        dataframe
        .iloc[test_indices]
        .copy()
        .reset_index(drop=True)
    )

    train_groups = set(
        train_dataframe["group_id"]
    )

    test_groups = set(
        test_dataframe["group_id"]
    )

    overlapping_groups = (
        train_groups
        & test_groups
    )

    if overlapping_groups:
        raise RuntimeError(
            "Group leakage detected between "
            "training and test sets."
        )

    return train_dataframe, test_dataframe


def train_model(
    x_train: pd.DataFrame,
    y_train: pd.Series,
) -> RandomForestClassifier:
    model = RandomForestClassifier(
        n_estimators=400,
        max_depth=None,
        min_samples_split=2,
        min_samples_leaf=1,
        max_features="sqrt",
        class_weight="balanced_subsample",
        random_state=RANDOM_STATE,
        n_jobs=-1,
        verbose=1,
    )

    model.fit(
        x_train,
        y_train,
    )

    return model


def calculate_metrics(
    y_test: pd.Series,
    predictions,
) -> dict[str, float]:
    return {
        "accuracy": accuracy_score(
            y_test,
            predictions,
        ),
        "macro_precision": precision_score(
            y_test,
            predictions,
            average="macro",
            zero_division=0,
        ),
        "macro_recall": recall_score(
            y_test,
            predictions,
            average="macro",
            zero_division=0,
        ),
        "macro_f1": f1_score(
            y_test,
            predictions,
            average="macro",
            zero_division=0,
        ),
        "weighted_f1": f1_score(
            y_test,
            predictions,
            average="weighted",
            zero_division=0,
        ),
    }


def save_confusion_matrix(
    y_test: pd.Series,
    predictions,
    class_names: list[str],
) -> Path:
    CHART_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    matrix = confusion_matrix(
        y_test,
        predictions,
        labels=range(
            len(class_names)
        ),
    )

    figure, axis = plt.subplots(
        figsize=(14, 12)
    )

    display = ConfusionMatrixDisplay(
        confusion_matrix=matrix,
        display_labels=class_names,
    )

    display.plot(
        ax=axis,
        xticks_rotation=45,
        values_format="d",
        colorbar=False,
    )

    axis.set_title(
        "Random Forest Room Classifier V2\n"
        "Confusion Matrix"
    )

    figure.tight_layout()

    output_path = (
        CHART_DIRECTORY
        / "random_forest_v2_confusion_matrix.png"
    )

    figure.savefig(
        output_path,
        dpi=200,
        bbox_inches="tight",
    )

    plt.close(figure)

    return output_path


def save_feature_importance_chart(
    model: RandomForestClassifier,
    feature_columns: list[str],
) -> tuple[Path, pd.DataFrame]:
    CHART_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    importance_dataframe = pd.DataFrame(
        {
            "feature": feature_columns,
            "importance": (
                model.feature_importances_
            ),
        }
    ).sort_values(
        by="importance",
        ascending=False,
    )

    top_features = (
        importance_dataframe
        .head(25)
        .sort_values(
            by="importance",
            ascending=True,
        )
    )

    figure, axis = plt.subplots(
        figsize=(12, 9)
    )

    axis.barh(
        top_features["feature"],
        top_features["importance"],
    )

    axis.set_title(
        "Top 25 Random Forest V2 "
        "Feature Importances"
    )

    axis.set_xlabel(
        "Importance"
    )

    axis.set_ylabel(
        "Feature"
    )

    figure.tight_layout()

    output_path = (
        CHART_DIRECTORY
        / "random_forest_v2_feature_importance.png"
    )

    importance_csv_path = (
        CHART_DIRECTORY
        / "random_forest_v2_feature_importance.csv"
    )

    figure.savefig(
        output_path,
        dpi=200,
        bbox_inches="tight",
    )

    plt.close(figure)

    importance_dataframe.to_csv(
        importance_csv_path,
        index=False,
    )

    return output_path, importance_dataframe


def save_test_predictions(
    test_dataframe: pd.DataFrame,
    actual_labels,
    predicted_labels,
    probabilities,
    class_names: list[str],
) -> None:
    result = test_dataframe[
        [
            "source_svg",
            "building_id",
            "group_id",
            "room_id",
            "original_room_type",
            "target_room_type",
        ]
    ].copy()

    result["actual_room_type"] = (
        actual_labels
    )

    result["predicted_room_type"] = (
        predicted_labels
    )

    result["prediction_correct"] = (
        result["actual_room_type"]
        == result["predicted_room_type"]
    )

    result["prediction_confidence"] = (
        probabilities.max(axis=1)
    )

    for index, class_name in enumerate(
        class_names
    ):
        result[
            f"probability_{class_name}"
        ] = probabilities[:, index]

    result.to_csv(
        TEST_PREDICTIONS_PATH,
        index=False,
    )


def generate_report(
    dataframe: pd.DataFrame,
    train_dataframe: pd.DataFrame,
    test_dataframe: pd.DataFrame,
    feature_columns: list[str],
    label_encoder: LabelEncoder,
    y_test: pd.Series,
    predictions,
    metrics: dict[str, float],
    importance_dataframe: pd.DataFrame,
) -> str:
    class_names = list(
        label_encoder.classes_
    )

    classification_text = (
        classification_report(
            y_test,
            predictions,
            labels=range(
                len(class_names)
            ),
            target_names=class_names,
            zero_division=0,
        )
    )

    lines: list[str] = []

    lines.append("=" * 100)

    lines.append(
        "ZYNORA RANDOM FOREST "
        "ROOM CLASSIFIER V2 REPORT"
    )

    lines.append("=" * 100)

    lines.append("")
    lines.append("DATASET INFORMATION")
    lines.append("-" * 100)

    lines.append(
        f"Total records             : "
        f"{len(dataframe)}"
    )

    lines.append(
        f"Training records          : "
        f"{len(train_dataframe)}"
    )

    lines.append(
        f"Testing records           : "
        f"{len(test_dataframe)}"
    )

    lines.append(
        f"Training building groups  : "
        f"{train_dataframe['group_id'].nunique()}"
    )

    lines.append(
        f"Testing building groups   : "
        f"{test_dataframe['group_id'].nunique()}"
    )

    lines.append(
        f"Feature count             : "
        f"{len(feature_columns)}"
    )

    lines.append(
        f"Target classes            : "
        f"{len(class_names)}"
    )

    lines.append(
        "Group overlap             : 0"
    )

    lines.append("")
    lines.append("MODEL CONFIGURATION")
    lines.append("-" * 100)

    lines.append(
        "Algorithm                 : "
        "RandomForestClassifier V2"
    )

    lines.append(
        "Number of trees           : 400"
    )

    lines.append(
        "Class weighting           : "
        "balanced_subsample"
    )

    lines.append(
        f"Random state              : "
        f"{RANDOM_STATE}"
    )

    lines.append(
        f"Test size                 : "
        f"{TEST_SIZE:.0%}"
    )

    lines.append("")
    lines.append("EVALUATION METRICS")
    lines.append("-" * 100)

    lines.append(
        f"Accuracy                  : "
        f"{metrics['accuracy']:.4f}"
    )

    lines.append(
        f"Macro precision           : "
        f"{metrics['macro_precision']:.4f}"
    )

    lines.append(
        f"Macro recall              : "
        f"{metrics['macro_recall']:.4f}"
    )

    lines.append(
        f"Macro F1-score            : "
        f"{metrics['macro_f1']:.4f}"
    )

    lines.append(
        f"Weighted F1-score         : "
        f"{metrics['weighted_f1']:.4f}"
    )

    lines.append("")
    lines.append("CLASSIFICATION REPORT")
    lines.append("-" * 100)
    lines.append(classification_text)

    lines.append("")
    lines.append("TOP 25 IMPORTANT FEATURES")
    lines.append("-" * 100)

    for _, row in (
        importance_dataframe
        .head(25)
        .iterrows()
    ):
        lines.append(
            f"{row['feature']:<45}"
            f"{row['importance']:.6f}"
        )

    return "\n".join(lines)


def main() -> None:
    print("=" * 100)

    print(
        "ZYNORA RANDOM FOREST "
        "ROOM CLASSIFIER V2"
    )

    print("=" * 100)

    print()
    print(
        f"Loading dataset: {DATASET_PATH}"
    )

    dataframe = load_dataset()

    feature_columns = get_feature_columns(
        dataframe
    )

    train_dataframe, test_dataframe = (
        perform_group_split(
            dataframe
        )
    )

    print()

    print(
        f"Training records : "
        f"{len(train_dataframe)}"
    )

    print(
        f"Testing records  : "
        f"{len(test_dataframe)}"
    )

    print(
        f"Features         : "
        f"{len(feature_columns)}"
    )

    label_encoder = LabelEncoder()

    label_encoder.fit(
        dataframe[
            "target_room_type"
        ]
    )

    x_train = prepare_features(
        train_dataframe,
        feature_columns,
    )

    x_test = prepare_features(
        test_dataframe,
        feature_columns,
    )

    y_train = pd.Series(
        label_encoder.transform(
            train_dataframe[
                "target_room_type"
            ]
        ),
        index=train_dataframe.index,
    )

    y_test = pd.Series(
        label_encoder.transform(
            test_dataframe[
                "target_room_type"
            ]
        ),
        index=test_dataframe.index,
    )

    print()
    print(
        "Training Random Forest V2..."
    )

    print(
        "This can take several minutes."
    )

    model = train_model(
        x_train,
        y_train,
    )

    print()
    print(
        "Evaluating model..."
    )

    predictions = model.predict(
        x_test
    )

    probabilities = model.predict_proba(
        x_test
    )

    metrics = calculate_metrics(
        y_test,
        predictions,
    )

    class_names = list(
        label_encoder.classes_
    )

    actual_labels = (
        label_encoder.inverse_transform(
            y_test
        )
    )

    predicted_labels = (
        label_encoder.inverse_transform(
            predictions
        )
    )

    confusion_matrix_path = (
        save_confusion_matrix(
            y_test=y_test,
            predictions=predictions,
            class_names=class_names,
        )
    )

    (
        importance_chart_path,
        importance_dataframe,
    ) = save_feature_importance_chart(
        model=model,
        feature_columns=feature_columns,
    )

    save_test_predictions(
        test_dataframe=test_dataframe,
        actual_labels=actual_labels,
        predicted_labels=predicted_labels,
        probabilities=probabilities,
        class_names=class_names,
    )

    report = generate_report(
        dataframe=dataframe,
        train_dataframe=train_dataframe,
        test_dataframe=test_dataframe,
        feature_columns=feature_columns,
        label_encoder=label_encoder,
        y_test=y_test,
        predictions=predictions,
        metrics=metrics,
        importance_dataframe=importance_dataframe,
    )

    MODEL_DIRECTORY.mkdir(
        parents=True,
        exist_ok=True,
    )

    REPORT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    joblib.dump(
        model,
        MODEL_PATH,
    )

    joblib.dump(
        label_encoder,
        LABEL_ENCODER_PATH,
    )

    joblib.dump(
        feature_columns,
        FEATURE_COLUMNS_PATH,
    )

    REPORT_PATH.write_text(
        report,
        encoding="utf-8",
    )

    print()
    print(report)

    print()
    print("=" * 100)

    print(
        "MODEL TRAINING V2 COMPLETED"
    )

    print("=" * 100)

    print(
        f"Model              : "
        f"{MODEL_PATH}"
    )

    print(
        f"Label encoder      : "
        f"{LABEL_ENCODER_PATH}"
    )

    print(
        f"Feature columns    : "
        f"{FEATURE_COLUMNS_PATH}"
    )

    print(
        f"Evaluation report  : "
        f"{REPORT_PATH}"
    )

    print(
        f"Test predictions   : "
        f"{TEST_PREDICTIONS_PATH}"
    )

    print(
        f"Confusion matrix   : "
        f"{confusion_matrix_path}"
    )

    print(
        f"Feature importance : "
        f"{importance_chart_path}"
    )


if __name__ == "__main__":
    main()