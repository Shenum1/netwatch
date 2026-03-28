"""
POST /api/model/train   — trigger a training run (async, streams progress via SSE)
GET  /api/model/status  — model metadata
GET  /api/model/report  — last training_report.json
GET  /api/scripts/list  — list loaded collector scripts
"""
import asyncio
import json
import os
import subprocess
import sys
from pathlib import Path
from typing import AsyncGenerator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

router = APIRouter()

REPORT_PATH = Path(__file__).parent.parent / "training_report.json"
MODEL_PATH  = Path(__file__).parent.parent / "models" / "saved" / "detector.joblib"


class TrainRequest(BaseModel):
    synthetic: bool = True
    n_samples: int = 50_000
    anomaly_ratio: float = 0.08
    n_estimators: int = 200
    contamination: float = 0.05
    data_path: str | None = None    # path to a CSV if not synthetic


@router.post("/model/train")
async def train_model(req: TrainRequest):
    """
    Streams training logs line-by-line as Server-Sent Events.
    The dashboard subscribes and displays progress in real time.
    """
    cmd = [sys.executable, "train.py"]

    if req.synthetic:
        cmd += ["--synthetic", "--n-samples", str(req.n_samples),
                "--anomaly-ratio", str(req.anomaly_ratio)]
    elif req.data_path:
        cmd += ["--data", req.data_path]
    else:
        return {"error": "Provide either synthetic=true or data_path"}

    cmd += [
        "--n-estimators", str(req.n_estimators),
        "--contamination", str(req.contamination),
        "--report",
    ]

    async def event_stream() -> AsyncGenerator[str, None]:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=Path(__file__).parent.parent,
        )
        async for line in proc.stdout:
            text = line.decode().rstrip()
            yield f"data: {json.dumps({'line': text})}\n\n"
        await proc.wait()
        status = "done" if proc.returncode == 0 else "error"
        if proc.returncode == 0:
            from models.detector import AnomalyDetector
            AnomalyDetector()._load()
        yield f"data: {json.dumps({'status': status, 'returncode': proc.returncode})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/model/status")
def model_status():
    from models.detector import AnomalyDetector
    d = AnomalyDetector()
    if not d.is_trained():
        return {"trained": False, "message": "Run POST /api/model/train first"}
    meta = d.bundle_meta or {}
    return {
        "trained":       True,
        "n_estimators":  d.model.n_estimators,
        "feature_names": d.feature_names,
        "trained_at":    meta.get("trained_at"),
        "n_samples":     meta.get("n_samples"),
        "n_anomalous":   meta.get("n_anomalous"),
        "model_size_kb": MODEL_PATH.stat().st_size // 1024 if MODEL_PATH.exists() else 0,
    }


@router.get("/model/report")
def model_report():
    if not REPORT_PATH.exists():
        return {"error": "No report found. Run POST /api/model/train first."}
    with open(REPORT_PATH) as f:
        return json.load(f)


@router.get("/scripts/list")
def list_scripts():
    scripts_dir = Path(__file__).parent.parent / "scripts" / "collectors"
    files = [f.name for f in scripts_dir.glob("*.py") if not f.name.startswith("_")]
    return {"scripts": files}


@router.get("/scripts/list")
def list_scripts():
    from features.pipeline import _EXTRACTORS
    scripts_dir = Path(__file__).parent.parent / "scripts" / "collectors"
    files = [f.name for f in scripts_dir.glob("*.py") if not f.name.startswith("_")]
    return {"scripts": files, "loaded_extractors": list(_EXTRACTORS.keys())}
