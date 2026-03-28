"""
SHAP explainability wrapper.
Returns per-feature importance for a single prediction, sorted by |shap_value|.
"""
import shap
import numpy as np
from typing import Any


def explain_prediction(model, features: dict[str, Any]) -> list[dict]:
    if model is None:
        return []
    feature_names = list(features.keys())
    X = np.array([[features[f] for f in feature_names]])
    explainer = shap.TreeExplainer(model)
    shap_vals = explainer.shap_values(X)

    # Handle all possible output shapes from different sklearn/shap versions
    if isinstance(shap_vals, list):
        # Old shap: list of arrays per class — take positive class
        vals = np.array(shap_vals[1]).flatten()
    else:
        # New shap: single array, shape (1, n_features) or (1, n_features, n_classes)
        arr = np.array(shap_vals)
        if arr.ndim == 3:
            vals = arr[0, :, 1]   # positive class
        else:
            vals = arr.flatten()

    return sorted(
        [{"feature": name, "shap_value": float(v)} for name, v in zip(feature_names, vals)],
        key=lambda x: abs(x["shap_value"]),
        reverse=True,
    )
