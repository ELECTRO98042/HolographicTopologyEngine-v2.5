from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import json
import os

router = APIRouter(prefix="/api/v1/test-suite", tags=["TestSuite"])

CONFIGS_DIR = "test_suite_configs"

class ExportPayloadRequest(BaseModel):
    config: Dict[str, Any]
    telemetryBuffer: List[Dict[str, Any]]
    userObservations: Dict[str, Any]
    testResults: Dict[str, Any]

@router.get("/configs")
def list_test_configs():
    if not os.path.exists(CONFIGS_DIR):
        return {"configs": []}
    files = [f for f in os.listdir(CONFIGS_DIR) if f.endswith(".json")]
    return {"configs": sorted(files)}

@router.get("/configs/{filename}")
def get_test_config(filename: str):
    filepath = os.path.join(CONFIGS_DIR, filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Config file not found")
    with open(filepath, "r") as f:
        data = json.load(f)
    return data

@router.post("/export-validation")
def export_validation_report(payload: ExportPayloadRequest):
    # Simulated generation of formatted markdown report for backend consumption / storage
    title = payload.config.get("title", "Test Experiment")
    suite_id = payload.config.get("suite_id", "CUSTOM")
    
    return {
        "status": "success",
        "message": f"Validation report generated for {suite_id}",
        "export_id": f"VAL-{suite_id}",
        "timestamp": payload.config.get("timestamp", "NOW")
    }