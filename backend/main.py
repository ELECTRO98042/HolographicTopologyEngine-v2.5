# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import jax.numpy as jnp

app = FastAPI(title="Holographic Topology Compute Engine", version="2.5.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import jax.numpy as jnp
class NodeModel(BaseModel):
    id: str
    x: float
    y: float
    z: float
    isCore: bool
    isSevered: bool
    health: int

class SimulationPayload(BaseModel):
    version: str
    timestamp: str
    canvas: Dict[str, Any]
    nodes: List[NodeModel]
    params: Dict[str, Any]

@app.post("/api/compute")
def compute_topology(payload: SimulationPayload):
    nodes_data = payload.nodes
    params = payload.params
    
    if not nodes_data:
        return {"status": "success", "integrity": 0, "s_ee": 0.0, "phi": 0.0}

    # Extract coordinates into a JAX array (N x 3)
    coords = jnp.array([[n.x, n.y, n.z] for n in nodes_data], dtype=jnp.float32)
    
    # Extract health and weights
    healths = jnp.array([n.health for n in nodes_data], dtype=jnp.float32)
    is_core = jnp.array([1.0 if n.isCore else 0.5 for n in nodes_data], dtype=jnp.float32)
    is_severed = jnp.array([0.0 if n.isSevered else 1.0 for n in nodes_data], dtype=jnp.float32)

    # Compute pairwise Euclidean distance matrix
    diff = coords[:, None, :] - coords[None, :, :]
    dist_matrix = jnp.sqrt(jnp.sum(diff ** 2, axis=-1) + 1e-8)

    # QFT Entanglement Entropy ($S_{ee}$) approximation via boundary correlation
    coupling = params.get("coupling_constant", 0.1)
    s_ee = float(jnp.sum(jnp.exp(-dist_matrix * coupling) * is_core[:, None] * is_severed[:, None]))

    # IIT Phi ($\Phi$) approximation based on active integrated connectivity repertoires
    connectivity_weights = 1.0 / (1.0 + dist_matrix)
    effective_network = connectivity_weights * healths[:, None] * healths[None, :]
    phi = float(jnp.sum(effective_network) * (coupling / max(len(nodes_data), 1)))

    # System Integrity percentage
    active_nodes_weight = jnp.sum(healths * is_severed * is_core)
    max_weight = float(len(nodes_data)) if len(nodes_data) > 0 else 1.0
    integrity = int(jnp.clip((active_nodes_weight / max_weight) * 100.0, 0, 100))

    return {
    "status": "success",
    "integrity": integrity,
    "s_ee": round(s_ee, 4),
    "phi": round(phi, 4)
}