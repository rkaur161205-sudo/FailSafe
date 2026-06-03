import os
import joblib
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import seaborn as sns
import shap
from xgboost import XGBClassifier
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OrdinalEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, precision_recall_curve, f1_score

DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "student-mat.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "features.pkl")
THRESHOLD_PATH = os.path.join(os.path.dirname(__file__), "threshold.pkl")
FEAT_IMPORTANCE_PATH = os.path.join(os.path.dirname(__file__), "feature_importance.png")
RISK_DIST_PATH = os.path.join(os.path.dirname(__file__), "risk_distribution.png")

NUMERIC_FEATURES = [
    "age", "traveltime", "studytime", "failures",
    "famrel", "freetime", "goout", "Dalc", "Walc",
    "health", "absences", "G1", "G2",
]

CATEGORICAL_FEATURES = [
    "school", "sex", "address", "famsize", "Pstatus",
    "Mjob", "Fjob", "reason", "guardian",
    "schoolsup", "famsup", "paid", "activities", "nursery",
    "higher", "internet", "romantic",
]

FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def save_feature_importance_plot(mean_shap: pd.Series) -> None:
    sns.set_theme(style="darkgrid")
    fig, ax = plt.subplots(figsize=(8, 5))
    fig.patch.set_facecolor("#111827")
    ax.set_facecolor("#1f2937")

    sorted_shap = mean_shap.sort_values(ascending=True)
    colors = ["#6366f1" if v == sorted_shap.max() else "#4f46e5" for v in sorted_shap]
    ax.barh(sorted_shap.index, sorted_shap.values, color=colors, edgecolor="none")

    ax.set_xlabel("Mean |SHAP Value|", color="#9ca3af", fontsize=10)
    ax.set_title("Feature Importance (SHAP)", color="#f9fafb", fontsize=13, fontweight="bold", pad=14)
    ax.tick_params(colors="#9ca3af", labelsize=9)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.xaxis.label.set_color("#9ca3af")
    ax.yaxis.label.set_color("#9ca3af")
    ax.grid(axis="x", color="#374151", linewidth=0.7)
    ax.set_axisbelow(True)

    ax.set_xlim(0, sorted_shap.max() * 1.1)

    plt.tight_layout()
    fig.savefig(FEAT_IMPORTANCE_PATH, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Feature importance plot saved to {FEAT_IMPORTANCE_PATH}")


def save_risk_distribution_plot(y: pd.Series) -> None:
    at_risk = int(y.sum())
    not_at_risk = int(len(y) - at_risk)

    fig, ax = plt.subplots(figsize=(5, 5))
    fig.patch.set_facecolor("#111827")
    ax.set_facecolor("#111827")

    wedges, texts, autotexts = ax.pie(
        [at_risk, not_at_risk],
        labels=["At Risk", "Not At Risk"],
        colors=["#ef4444", "#22c55e"],
        autopct="%1.1f%%",
        startangle=140,
        wedgeprops={"edgecolor": "#111827", "linewidth": 2},
        textprops={"color": "#f9fafb", "fontsize": 11},
    )
    for at in autotexts:
        at.set_color("#111827")
        at.set_fontweight("bold")
        at.set_fontsize(10)

    ax.set_title("Risk Distribution (Training Data)", color="#f9fafb",
                 fontsize=13, fontweight="bold", pad=16)

    plt.tight_layout()
    fig.savefig(RISK_DIST_PATH, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"Risk distribution plot saved to {RISK_DIST_PATH}")


def build_pipeline(scale_pos_weight: float) -> Pipeline:
    numeric_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
    ])

    categorical_transformer = Pipeline([
        ("imputer", SimpleImputer(strategy="most_frequent")),
        (
            "encoder",
            OrdinalEncoder(handle_unknown="use_encoded_value", unknown_value=-1),
        ),
    ])

    preprocessor = ColumnTransformer([
        ("num", numeric_transformer, NUMERIC_FEATURES),
        ("cat", categorical_transformer, CATEGORICAL_FEATURES),
    ], remainder="drop")

    model = XGBClassifier(
        n_estimators=200,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        scale_pos_weight=scale_pos_weight,
        eval_metric="logloss",
    )

    return Pipeline([
        ("preprocessor", preprocessor),
        ("model", model),
    ])


def train():
    df = pd.read_csv(DATA_PATH, sep=";")
    df["at_risk"] = (df["G3"] < 10).astype(int)

    X = df[FEATURES]
    y = df["at_risk"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        stratify=y,
        random_state=42,
    )

    scale_pos_weight = (len(y_train) - y_train.sum()) / max(y_train.sum(), 1)
    pipeline = build_pipeline(scale_pos_weight=scale_pos_weight)
    pipeline.fit(X_train, y_train)

    y_pred = pipeline.predict(X_test)
    y_proba = pipeline.predict_proba(X_test)[:, 1]

    print(f"Accuracy (threshold 0.5): {accuracy_score(y_test, y_pred):.4f}\n")
    print(classification_report(y_test, y_pred, target_names=["not at risk", "at risk"]))

    precisions, recalls, thresholds = precision_recall_curve(y_test, y_proba)
    f1_scores = (2 * precisions * recalls) / np.maximum(precisions + recalls, 1e-8)
    best_idx = int(np.nanargmax(f1_scores[:-1]))
    best_threshold = float(thresholds[best_idx])

    print(f"\nBest validation threshold by F1: {best_threshold:.3f}\n")
    y_pred_threshold = (y_proba >= best_threshold).astype(int)
    print(f"Accuracy (threshold {best_threshold:.3f}): {accuracy_score(y_test, y_pred_threshold):.4f}\n")
    print(classification_report(y_test, y_pred_threshold, target_names=["not at risk", "at risk"]))

    explainer = shap.TreeExplainer(pipeline.named_steps["model"])
    transformed_X_test = pipeline.named_steps["preprocessor"].transform(X_test)
    shap_values = explainer.shap_values(transformed_X_test)
    mean_shap = pd.Series(np.abs(shap_values).mean(axis=0), index=FEATURES).sort_values(ascending=False)

    print("Mean absolute SHAP values per feature:")
    print(mean_shap.to_string())

    joblib.dump(pipeline, MODEL_PATH)
    joblib.dump(FEATURES, FEATURES_PATH)
    joblib.dump(best_threshold, THRESHOLD_PATH)
    print(f"\nPipeline saved to {MODEL_PATH}")
    print(f"Features saved to {FEATURES_PATH}")
    print(f"Threshold saved to {THRESHOLD_PATH}")

    save_feature_importance_plot(mean_shap)
    save_risk_distribution_plot(y)


if __name__ == "__main__":
    train()
