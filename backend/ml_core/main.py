"""
NetWatch ML Core — FastAPI entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import router
from api.train_routes import router as train_router
from api.scripts_routes import router as scripts_router

app = FastAPI(title="NetWatch ML Core", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")
app.include_router(train_router, prefix="/api")
app.include_router(scripts_router, prefix="/api")

@app.get("/health")
def health():
    return {"status": "ok"}
