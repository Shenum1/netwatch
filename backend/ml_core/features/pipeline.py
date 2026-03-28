"""
Feature engineering pipeline — mirrors train.py's engineer_features().
Collector scripts register custom extractors via register_extractor().
"""
from typing import Any, Callable
import numpy as np

_EXTRACTORS: dict = {}
WELL_KNOWN_PORTS = set(range(1, 1024))
PROTO_MAP = {"tcp": 6.0, "udp": 17.0, "icmp": 1.0}


def register_extractor(source: str, fn: Callable):
    _EXTRACTORS[source] = fn


def extract_features(raw: dict[str, Any], source: str = "unknown") -> dict[str, float]:
    base = _EXTRACTORS[source](raw) if source in _EXTRACTORS else _default_extractor(raw)
    return _engineer(base)


def _default_extractor(raw: dict) -> dict[str, float]:
    proto = raw.get("protocol", "tcp")
    proto_num = PROTO_MAP.get(str(proto).lower(), float(proto) if str(proto).isdigit() else 0.0)
    return {
        "bytes_in":     float(raw.get("bytes_in", 0)),
        "bytes_out":    float(raw.get("bytes_out", 0)),
        "packet_count": float(raw.get("packet_count", 1)),
        "duration_ms":  float(raw.get("duration_ms", 1)),
        "src_port":     float(raw.get("src_port", 0)),
        "dst_port":     float(raw.get("dst_port", 0)),
        "protocol":     proto_num,
    }


def _engineer(f: dict) -> dict[str, float]:
    """Add derived features — must match FEATURE_NAMES in train.py."""
    dur  = max(f["duration_ms"], 1)
    pkts = max(f["packet_count"], 1)
    bin_ = f["bytes_in"]
    bout = f["bytes_out"]
    dst  = int(f["dst_port"])

    f["byte_rate"]       = bin_ / dur
    f["packet_size_avg"] = bin_ / pkts
    f["ratio_out_in"]    = bout / max(bin_, 1)
    f["log_bytes_in"]    = float(np.log1p(bin_))
    f["log_bytes_out"]   = float(np.log1p(bout))
    f["log_duration"]    = float(np.log1p(f["duration_ms"]))
    f["bytes_total"]     = bin_ + bout
    f["pps"]             = pkts / dur * 1000
    f["bps"]             = bin_ * 8 / dur * 1000
    f["port_entropy"]    = abs(f["src_port"] - f["dst_port"]) / 65535.0
    f["is_known_port"]   = 1.0 if dst in WELL_KNOWN_PORTS else 0.0
    return f
