"""
POST /api/scripts/upload  — upload a new .py collector script
GET  /api/scripts/list    — list all scripts + loaded extractors
POST /api/scripts/reload  — hot-reload all scripts
DELETE /api/scripts/{name} — remove a script
"""
import importlib
import os
import sys
from pathlib import Path

from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter()

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts" / "collectors"


@router.get("/scripts/list")
def list_scripts():
    from features.pipeline import _EXTRACTORS
    files = [f.name for f in SCRIPTS_DIR.glob("*.py") if not f.name.startswith("_")]
    return {
        "scripts": files,
        "loaded_extractors": list(_EXTRACTORS.keys()),
        "count": len(files),
    }


@router.post("/scripts/upload")
async def upload_script(file: UploadFile = File(...)):
    if not file.filename.endswith(".py"):
        raise HTTPException(400, "Only .py files are allowed")
    if ".." in file.filename or "/" in file.filename:
        raise HTTPException(400, "Invalid filename")

    content = await file.read()

    # Basic safety check — reject obvious non-Python
    if not content.strip():
        raise HTTPException(400, "File is empty")

    dest = SCRIPTS_DIR / file.filename
    dest.write_bytes(content)

    # Auto-reload the new script
    mod_name = f"scripts.collectors.{file.filename[:-3]}"
    try:
        if mod_name in sys.modules:
            importlib.reload(sys.modules[mod_name])
        else:
            importlib.import_module(mod_name)
        status = "loaded"
    except Exception as e:
        status = f"uploaded but failed to load: {e}"

    return {"filename": file.filename, "status": status, "size": len(content)}


@router.post("/scripts/reload")
def reload_scripts():
    from features.pipeline import _EXTRACTORS
    reloaded = []
    errors = []
    for fname in SCRIPTS_DIR.glob("*.py"):
        if fname.name.startswith("_"):
            continue
        mod_name = f"scripts.collectors.{fname.stem}"
        try:
            if mod_name in sys.modules:
                importlib.reload(sys.modules[mod_name])
            else:
                importlib.import_module(mod_name)
            reloaded.append(fname.name)
        except Exception as e:
            errors.append({"file": fname.name, "error": str(e)})
    return {
        "reloaded": reloaded,
        "errors": errors,
        "loaded_extractors": list(_EXTRACTORS.keys()),
    }


@router.delete("/scripts/{name}")
def delete_script(name: str):
    if not name.endswith(".py") or ".." in name or "/" in name:
        raise HTTPException(400, "Invalid script name")
    path = SCRIPTS_DIR / name
    if not path.exists():
        raise HTTPException(404, "Script not found")
    path.unlink()
    # Remove from sys.modules
    mod_name = f"scripts.collectors.{name[:-3]}"
    sys.modules.pop(mod_name, None)
    return {"deleted": name}
