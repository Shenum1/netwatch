"""
AnomalyDetector — Random Forest + Isolation Forest ensemble.

Loaded from the .joblib bundle produced by train.py.
Inference uses the same feature engineering pipeline as training.
"""
from pathlib import Path
import joblib
import numpy as np

MODEL_PATH = Path(__file__).parent / "saved" / "detector.joblib"


class AnomalyDetector:
    def __init__(self):
        self.model = None
        self.isolation = None
        self.feature_names: list = []
        self.bundle_meta: dict = {}
        self._load()

    def _load(self):
        if MODEL_PATH.exists():
            bundle = joblib.load(MODEL_PATH)
            self.model         = bundle["rf"]
            self.isolation     = bundle["iso"]
            self.feature_names = bundle["feature_names"]
            self.bundle_meta   = bundle.get("meta", {})

    def reload(self):
        """Hot-reload after retraining without restarting the service."""
        self._load()

    def is_trained(self) -> bool:
        return self.model is not None

    def predict(self, features: dict) -> tuple:
        if not self.is_trained():
            return self._rule_based(features)
        X = np.array([[features.get(f, 0.0) for f in self.feature_names]])
        rf_prob  = self.model.predict_proba(X)[0][1]
        iso_raw  = -self.isolation.score_samples(X)[0]
        iso_norm = float(np.clip(iso_raw / 0.6, 0.0, 1.0))
        score    = 0.7 * rf_prob + 0.3 * iso_norm
        return round(float(score), 4), bool(score > 0.5)

    def _rule_based(self, features: dict) -> tuple:
        score = 0.0
        if features.get("pps", 0) > 100_000:            score += 0.5
        if features.get("bytes_out", 0) > 10_000_000:   score += 0.4
        if features.get("duration_ms",1) < 10 and features.get("pps",0) > 100: score += 0.3
        if features.get("bps", 0) > 1_000_000_000:      score += 0.3
        score = min(score, 1.0)
        return round(score, 4), score > 0.5
