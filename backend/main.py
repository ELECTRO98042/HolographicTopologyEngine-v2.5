# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import numpy as np

app = FastAPI(title="Holographic Topology Compute Engine", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class NodeModel(BaseModel):
    x: float
    y: float
    z: float

class SimulationPayload(BaseModel):
    nodes: List[NodeModel]
    params: Dict[str, Any]

@app.post("/api/compute")
def compute_topology(payload: SimulationPayload):
    try:
        nodes = payload.nodes
        n_count = len(nodes)
        if n_count == 0:
            return {"integrity": 100, "s_ee": 0.0, "phi": 0.0}

        coords = np.array([[n.x, n.y, n.z] for n in nodes])
        dist_matrix = np.linalg.norm(coords[:, np.newaxis, :] - coords[np.newaxis, :, :], axis=2)
        
        s_ee = float(np.sum(np.log1p(dist_matrix + 1e-5)) / (n_count * 2))
        phi = float(np.mean(dist_matrix) * 0.23 * abs(payload.params.get("curvature", -1.0)))

        return {
            "status": "success",
            "integrity": max(0, 100 - int(n_count * 0.5)),
            "s_ee": round(s_ee, 2),
            "phi": round(phi, 2)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)