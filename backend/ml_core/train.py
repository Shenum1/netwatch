"""
NetWatch — ML Core Training Script
====================================
Trains the anomaly detector on labelled network flow data.

Usage
-----
  # Train on a CSV file:
  python train.py --data data/labelled_flows.csv --label label

  # Generate synthetic data and train (no CSV needed to get started):
  python train.py --synthetic --n-samples 50000

  # Full options:
  python train.py --data flows.csv --label is_anomaly \\
      --test-size 0.2 --n-estimators 300 --contamination 0.05 \\
      --output models/saved/detector.joblib --report

Output
------
  models/saved/detector.joblib  — trained model bundle (RF + IsoForest + metadata)
  training_report.json          — metrics, feature importances, confusion matrix
"""

import argparse
import json
import os
import sys
import time
import warnings
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedKFold, cross_val_score, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.utils.class_weight import compute_class_weight

warnings.filterwarnings("ignore", category=UserWarning)

# ── Feature names the model will be trained on ─────────────────────────────────
FEATURE_NAMES = [
    "bytes_in",
    "bytes_out",
    "packet_count",
    "duration_ms",
    "src_port",
    "dst_port",
    "protocol",
    "byte_rate",
    "packet_size_avg",
    "ratio_out_in",
    # Derived / engineered features
    "log_bytes_in",
    "log_bytes_out",
    "log_duration",
    "port_entropy",
    "is_known_port",
    "bytes_total",
    "pps",              # packets per second
    "bps",              # bits per second
]

PROTO_MAP = {"tcp": 6, "udp": 17, "icmp": 1}
WELL_KNOWN_PORTS = set(range(1, 1024))


# ── Feature engineering ─────────────────────────────────────────────────────────

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived columns to a raw flow DataFrame."""
    df = df.copy()

    # Map protocol strings → ints if needed
    if df["protocol"].dtype == object:
        df["protocol"] = df["protocol"].map(PROTO_MAP).fillna(0).astype(float)

    dur = df["duration_ms"].clip(lower=1)
    pkts = df["packet_count"].clip(lower=1)

    df["byte_rate"]       = df["bytes_in"] / dur
    df["packet_size_avg"] = df["bytes_in"] / pkts
    df["ratio_out_in"]    = df["bytes_out"] / df["bytes_in"].clip(lower=1)
    df["log_bytes_in"]    = np.log1p(df["bytes_in"])
    df["log_bytes_out"]   = np.log1p(df["bytes_out"])
    df["log_duration"]    = np.log1p(df["duration_ms"])
    df["bytes_total"]     = df["bytes_in"] + df["bytes_out"]
    df["pps"]             = pkts / dur * 1000          # packets / second
    df["bps"]             = df["bytes_in"] * 8 / dur * 1000  # bits / second

    # Port entropy: spread between src_port and dst_port (simple proxy)
    df["port_entropy"] = np.abs(df["src_port"] - df["dst_port"]) / 65535.0
    df["is_known_port"] = df["dst_port"].apply(
        lambda p: 1.0 if int(p) in WELL_KNOWN_PORTS else 0.0
    )

    return df


# ── Synthetic data generation ───────────────────────────────────────────────────

def generate_synthetic(n_samples: int = 50_000, anomaly_ratio: float = 0.08) -> pd.DataFrame:
    """
    Generate realistic synthetic network flow data for bootstrapping.

    Normal traffic: web browsing, streaming, DNS, SSH, small API calls.
    Anomalous traffic: port scans, data exfiltration, DDoS bursts, C2 beacons.
    """
    rng = np.random.default_rng(42)
    n_anom = int(n_samples * anomaly_ratio)
    n_norm = n_samples - n_anom

    def _normal(n):
        proto = rng.choice([6, 17, 1], size=n, p=[0.70, 0.25, 0.05])
        dst_port = rng.choice(
            [80, 443, 53, 22, 21, 25, 110, 8080, 3306],
            size=n,
            p=[0.25, 0.35, 0.15, 0.10, 0.03, 0.03, 0.02, 0.05, 0.02],
        )
        bytes_in  = rng.lognormal(mean=8.5, sigma=2.0, size=n).clip(64, 1_500_000)
        bytes_out = rng.lognormal(mean=6.0, sigma=1.5, size=n).clip(64, 500_000)
        pkts      = rng.lognormal(mean=3.5, sigma=1.5, size=n).clip(1, 50_000).astype(int)
        dur       = rng.lognormal(mean=6.0, sigma=2.0, size=n).clip(1, 600_000)
        src_port  = rng.integers(1024, 65535, size=n)
        return pd.DataFrame({
            "bytes_in": bytes_in, "bytes_out": bytes_out, "packet_count": pkts,
            "duration_ms": dur, "src_port": src_port, "dst_port": dst_port.astype(float),
            "protocol": proto.astype(float), "label": 0,
        })

    def _anomalous(n):
        attack_type = rng.choice(
            ["port_scan", "exfil", "ddos", "c2_beacon", "brute_force"],
            size=n,
            p=[0.25, 0.20, 0.25, 0.15, 0.15],
        )
        rows = []
        for atype in attack_type:
            if atype == "port_scan":
                rows.append({
                    "bytes_in": rng.integers(40, 80), "bytes_out": rng.integers(40, 80),
                    "packet_count": rng.integers(1, 5), "duration_ms": rng.integers(1, 50),
                    "src_port": rng.integers(1024, 65535), "dst_port": rng.integers(1, 65535),
                    "protocol": 6, "label": 1,
                })
            elif atype == "exfil":
                rows.append({
                    "bytes_in": rng.integers(500, 5_000), "bytes_out": rng.integers(5_000_000, 50_000_000),
                    "packet_count": rng.integers(5000, 50000), "duration_ms": rng.integers(10000, 300000),
                    "src_port": rng.integers(1024, 65535), "dst_port": rng.integers(1024, 65535),
                    "protocol": 6, "label": 1,
                })
            elif atype == "ddos":
                rows.append({
                    "bytes_in": rng.integers(60, 1500), "bytes_out": rng.integers(60, 200),
                    "packet_count": rng.integers(100000, 1000000), "duration_ms": rng.integers(100, 5000),
                    "src_port": rng.integers(1024, 65535), "dst_port": rng.choice([80, 443, 53]),
                    "protocol": rng.choice([6, 17]), "label": 1,
                })
            elif atype == "c2_beacon":
                rows.append({
                    "bytes_in": rng.integers(200, 800), "bytes_out": rng.integers(200, 800),
                    "packet_count": rng.integers(2, 10), "duration_ms": rng.integers(29000, 31000),
                    "src_port": rng.integers(1024, 65535), "dst_port": rng.integers(4000, 9999),
                    "protocol": 6, "label": 1,
                })
            else:  # brute_force
                rows.append({
                    "bytes_in": rng.integers(200, 600), "bytes_out": rng.integers(200, 600),
                    "packet_count": rng.integers(3, 15), "duration_ms": rng.integers(500, 3000),
                    "src_port": rng.integers(1024, 65535), "dst_port": rng.choice([22, 23, 3389, 5900]),
                    "protocol": 6, "label": 1,
                })
        return pd.DataFrame(rows).astype(float).assign(label=1)

    norm_df = _normal(n_norm)
    anom_df = _anomalous(n_anom)
    df = pd.concat([norm_df, anom_df], ignore_index=True).sample(frac=1, random_state=42)
    return df


# ── Model training ──────────────────────────────────────────────────────────────

def train(
    df: pd.DataFrame,
    label_col: str = "label",
    test_size: float = 0.2,
    n_estimators: int = 200,
    contamination: float = 0.05,
    output_path: str = "models/saved/detector.joblib",
    verbose: bool = True,
) -> dict:
    """
    Train Random Forest + Isolation Forest ensemble and return a metrics dict.
    """
    def log(msg):
        if verbose:
            print(msg)

    log("\n── Preparing features ─────────────────────────────────────────────────")
    df = engineer_features(df)

    # Drop any rows with NaN after feature engineering
    df = df.dropna(subset=FEATURE_NAMES + [label_col])
    X = df[FEATURE_NAMES].values.astype(np.float64)
    y = df[label_col].values.astype(int)

    n_total   = len(y)
    n_anom    = int(y.sum())
    n_normal  = n_total - n_anom
    anom_pct  = 100 * n_anom / n_total

    log(f"  Samples   : {n_total:,}")
    log(f"  Normal    : {n_normal:,} ({100 - anom_pct:.1f}%)")
    log(f"  Anomalous : {n_anom:,}  ({anom_pct:.1f}%)")
    log(f"  Features  : {len(FEATURE_NAMES)}")

    # ── Train / test split ──────────────────────────────────────────────────────
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, stratify=y, random_state=42
    )

    # ── Class weights (handles imbalance) ──────────────────────────────────────
    classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=classes, y=y_train)
    class_weight = dict(zip(classes, weights))

    # ── Random Forest ───────────────────────────────────────────────────────────
    log("\n── Training Random Forest ─────────────────────────────────────────────")
    t0 = time.time()
    rf = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=14,
        min_samples_leaf=2,
        max_features="sqrt",
        class_weight=class_weight,
        bootstrap=True,
        oob_score=True,
        n_jobs=-1,
        random_state=42,
    )
    rf.fit(X_train, y_train)
    log(f"  Done in {time.time() - t0:.1f}s  |  OOB accuracy: {rf.oob_score_:.4f}")

    # ── Isolation Forest ────────────────────────────────────────────────────────
    log("\n── Training Isolation Forest ──────────────────────────────────────────")
    t0 = time.time()
    iso = IsolationForest(
        n_estimators=200,
        contamination=contamination,
        max_features=0.8,
        bootstrap=True,
        n_jobs=-1,
        random_state=42,
    )
    iso.fit(X_train)
    log(f"  Done in {time.time() - t0:.1f}s")

    # ── Cross-validation (5-fold) ───────────────────────────────────────────────
    log("\n── 5-fold cross-validation ────────────────────────────────────────────")
    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
    cv_scores = cross_val_score(rf, X_train, y_train, cv=cv, scoring="roc_auc", n_jobs=-1)
    log(f"  ROC-AUC: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

    # ── Evaluation on held-out test set ────────────────────────────────────────
    log("\n── Test-set evaluation ────────────────────────────────────────────────")

    # Ensemble score: 70% RF probability + 30% normalised Isolation Forest score
    rf_probs  = rf.predict_proba(X_test)[:, 1]
    iso_raw   = -iso.score_samples(X_test)          # higher = more anomalous
    iso_norm  = (iso_raw - iso_raw.min()) / (iso_raw.max() - iso_raw.min() + 1e-9)
    ens_score = 0.7 * rf_probs + 0.3 * iso_norm
    y_pred    = (ens_score > 0.5).astype(int)

    precision = precision_score(y_test, y_pred, zero_division=0)
    recall    = recall_score(y_test, y_pred, zero_division=0)
    f1        = f1_score(y_test, y_pred, zero_division=0)
    auc       = roc_auc_score(y_test, ens_score)
    cm        = confusion_matrix(y_test, y_pred).tolist()

    log(f"  Precision : {precision:.4f}")
    log(f"  Recall    : {recall:.4f}")
    log(f"  F1        : {f1:.4f}")
    log(f"  ROC-AUC   : {auc:.4f}")
    log(f"\n  Confusion matrix (rows=actual, cols=predicted):")
    log(f"    TN={cm[0][0]}  FP={cm[0][1]}")
    log(f"    FN={cm[1][0]}  TP={cm[1][1]}")

    # ── Feature importances ─────────────────────────────────────────────────────
    importances = sorted(
        zip(FEATURE_NAMES, rf.feature_importances_),
        key=lambda x: x[1],
        reverse=True,
    )
    log("\n── Feature importances ────────────────────────────────────────────────")
    for name, imp in importances:
        bar = "█" * int(imp * 60)
        log(f"  {name:<20} {imp:.4f}  {bar}")

    # ── Save model bundle ───────────────────────────────────────────────────────
    log(f"\n── Saving model → {output_path} ───────────────────────────────────────")
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    bundle = {
        "rf":            rf,
        "iso":           iso,
        "feature_names": FEATURE_NAMES,
        "scaler":        None,   # reserved for future normalisation step
        "meta": {
            "trained_at":    pd.Timestamp.now().isoformat(),
            "n_samples":     n_total,
            "n_anomalous":   n_anom,
            "n_estimators":  n_estimators,
            "contamination": contamination,
            "feature_names": FEATURE_NAMES,
        },
    }
    joblib.dump(bundle, output_path, compress=3)
    size_kb = Path(output_path).stat().st_size // 1024
    log(f"  Saved ({size_kb} KB)")

    # ── Metrics report ──────────────────────────────────────────────────────────
    metrics = {
        "precision":       round(precision, 4),
        "recall":          round(recall, 4),
        "f1":              round(f1, 4),
        "roc_auc":         round(auc, 4),
        "oob_accuracy":    round(rf.oob_score_, 4),
        "cv_auc_mean":     round(float(cv_scores.mean()), 4),
        "cv_auc_std":      round(float(cv_scores.std()), 4),
        "confusion_matrix": cm,
        "n_samples":       n_total,
        "n_anomalous":     n_anom,
        "feature_importances": {name: round(float(imp), 6) for name, imp in importances},
        "model_path":      output_path,
    }
    return metrics


# ── CLI ─────────────────────────────────────────────────────────────────────────

def parse_args():
    p = argparse.ArgumentParser(description="Train NetWatch anomaly detector")
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument("--data",      metavar="CSV",  help="Path to labelled CSV file")
    src.add_argument("--synthetic", action="store_true", help="Generate synthetic training data")

    p.add_argument("--label",         default="label",                          help="Label column name (default: label)")
    p.add_argument("--n-samples",     type=int,   default=50_000,               help="Synthetic sample count (default: 50000)")
    p.add_argument("--anomaly-ratio", type=float, default=0.08,                 help="Anomaly fraction in synthetic data (default: 0.08)")
    p.add_argument("--test-size",     type=float, default=0.2,                  help="Test split fraction (default: 0.2)")
    p.add_argument("--n-estimators",  type=int,   default=200,                  help="RF tree count (default: 200)")
    p.add_argument("--contamination", type=float, default=0.05,                 help="Isolation Forest contamination (default: 0.05)")
    p.add_argument("--output",        default="models/saved/detector.joblib",   help="Output model path")
    p.add_argument("--report",        action="store_true",                       help="Save training_report.json")
    p.add_argument("--quiet",         action="store_true",                       help="Suppress output")
    return p.parse_args()


def main():
    args = parse_args()
    verbose = not args.quiet

    if args.synthetic:
        if verbose:
            print(f"Generating {args.n_samples:,} synthetic flows "
                  f"({args.anomaly_ratio*100:.0f}% anomalous)…")
        df = generate_synthetic(n_samples=args.n_samples, anomaly_ratio=args.anomaly_ratio)
    else:
        if not os.path.exists(args.data):
            print(f"Error: file not found: {args.data}", file=sys.stderr)
            sys.exit(1)
        if verbose:
            print(f"Loading {args.data}…")
        df = pd.read_csv(args.data)
        if args.label not in df.columns:
            print(f"Error: label column '{args.label}' not in CSV.", file=sys.stderr)
            print(f"Available columns: {list(df.columns)}", file=sys.stderr)
            sys.exit(1)
        if args.label != "label":
            df = df.rename(columns={args.label: "label"})

    metrics = train(
        df,
        label_col="label",
        test_size=args.test_size,
        n_estimators=args.n_estimators,
        contamination=args.contamination,
        output_path=args.output,
        verbose=verbose,
    )

    if args.report:
        report_path = "training_report.json"
        with open(report_path, "w") as f:
            json.dump(metrics, f, indent=2)
        if verbose:
            print(f"\nReport saved → {report_path}")

    if verbose:
        print("\n✓ Training complete\n")
        print(f"  F1        {metrics['f1']}")
        print(f"  ROC-AUC   {metrics['roc_auc']}")
        print(f"  Precision {metrics['precision']}")
        print(f"  Recall    {metrics['recall']}")

    return metrics


if __name__ == "__main__":
    main()
