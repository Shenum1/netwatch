# NetWatch — Network Anomaly Detector

Full-stack anomaly detection with Random Forest, SHAP explainability,
GeoIP visualization, and pluggable script injection.

## Quick start

```bash
cp .env.example .env          # fill in your secrets
docker compose up -d          # Postgres, Redis, ML core, API gateway, frontend
```

| Service    | URL                              |
|------------|----------------------------------|
| Frontend   | http://localhost:3000            |
| API        | http://localhost:4000            |
| ML Core    | http://localhost:8000/docs       |

## Project structure

```
netwatch/
├── backend/
│   ├── ml_core/              # Python / FastAPI — model, SHAP, feature pipeline
│   │   ├── api/              # FastAPI routes (/predict /explain /scripts/reload)
│   │   ├── models/           # AnomalyDetector (Random Forest + Isolation Forest)
│   │   ├── explainers/       # SHAP wrapper
│   │   └── features/         # Feature engineering pipeline (extractor registry)
│   ├── api/                  # Node.js API gateway
│   │   └── src/
│   │       ├── routes/       # REST endpoints
│   │       ├── queue/        # BullMQ worker
│   │       ├── db/           # PostgreSQL (events + alerts tables)
│   │       ├── ws/           # WebSocket live-push server
│   │       └── alerts/       # Slack / email alert engine
│   └── scripts/
│       └── collectors/       # Pluggable collector scripts (hot-reloadable)
├── frontend/                 # React + Vite
│   └── src/
│       ├── pages/            # Dashboard, Alerts, Model
│       ├── components/       # dashboard, map, alerts, charts
│       ├── store/            # Zustand — live event stream
│       └── hooks/
├── infra/                    # SQL migrations
├── docs/
└── docker-compose.yml
```

## Adding a new data source

1. Copy `backend/scripts/collectors/pcap_collector.py`
2. Change `SOURCE_NAME` and implement `extract(raw) -> dict[str, float]`
3. Hot-reload without restart:

```bash
curl -X POST http://localhost:8000/api/scripts/reload
```
