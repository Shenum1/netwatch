"""
Routes: /predict, /explain, /model/status, /scripts/reload
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any
import importlib, os, sys

from models.detector import AnomalyDetector
from explainers.shap_explainer import explain_prediction
from features.pipeline import extract_features

router = APIRouter()
detector = AnomalyDetector()


class FlowPayload(BaseModel):
    raw: dict[str, Any]   # raw event dict from any collector script
    source: str = "unknown"


@router.post("/predict")
def predict(payload: FlowPayload):
    features = extract_features(payload.raw, source=payload.source)
    score, label = detector.predict(features)
    return {"anomaly_score": score, "is_anomaly": label, "features": features}


@router.post("/explain")
def explain(payload: FlowPayload):
    features = extract_features(payload.raw, source=payload.source)
    score, label = detector.predict(features)
    shap_values = explain_prediction(detector.model, features)
    return {
        "anomaly_score": score,
        "is_anomaly": label,
        "shap": shap_values,
        "features": features,
    }


@router.get("/model/status")
def model_status():
    return {
        "trained": detector.is_trained(),
        "n_estimators": detector.model.n_estimators if detector.is_trained() else None,
        "feature_names": detector.feature_names,
    }


@router.post("/scripts/reload")
def reload_scripts():
    """Hot-reload all collector scripts from the scripts/ directory."""
    reloaded = []
    scripts_dir = os.path.join(os.path.dirname(__file__), "..", "scripts", "collectors")
    for fname in os.listdir(scripts_dir):
        if fname.endswith(".py") and not fname.startswith("_"):
            mod_name = f"scripts.collectors.{fname[:-3]}"
            if mod_name in sys.modules:
                importlib.reload(sys.modules[mod_name])
            else:
                importlib.import_module(mod_name)
            reloaded.append(fname)
    return {"reloaded": reloaded}
