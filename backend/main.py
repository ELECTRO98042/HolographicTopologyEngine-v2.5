# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from fastapi.staticfiles import StaticFiles
import time
import asyncio
import json
import jax
import jax.dlpack
import jax.numpy as jnp
import os

from geometry import compute_curvature_metrics

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TelemetryStreamingPipeline:
    def __init__(self, grid_shape=(1000, 4)):
        self.grid_shape = grid_shape
        # Pre-allocate spatial coordinate evaluation grid
        self.spatial_grid = jax.random.uniform(jax.random.PRNGKey(42), self.grid_shape, minval=-0.5, maxval=0.5)
        
    def step_telemetry(self, node_positions):
        """
        Executes a batched, vectorized evaluation of the bulk geometry 
        across the spatial grid and prepares the zero-copy DLPack capsule.
        """
        batch_compute = jax.vmap(lambda x: compute_curvature_metrics(x, node_positions))
        
        ricci_scalars, ricci_tensors, christoffels = batch_compute(self.spatial_grid)
        
        ricci_scalars.block_until_ready()
        
        dlpack_capsule = jax.dlpack.to_dlpack(ricci_scalars)
        
        telemetry_packet = {
            "timestamp": time.time(),
            "max_ricci_scalar": float(jnp.max(jnp.abs(ricci_scalars))),
            "mean_ricci_scalar": float(jnp.mean(ricci_scalars)),
            "dlpack_capsule": dlpack_capsule
        }
        import time as ptime
        t = ptime.time() * 1.0
        return telemetry_packet

# Instantiate pipeline during application startup
pipeline = TelemetryStreamingPipeline(grid_shape=(1000, 4))

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_text_json(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def send_binary(self, data: bytes, websocket: WebSocket):
        await websocket.send_bytes(data)
manager = ConnectionManager()

# Global state tracking for active simulation nodes per session/server instance
current_active_node_positions = jnp.zeros((5, 4), dtype=jnp.float64)

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
        return {
            "status": "success", 
            "integrity": 100, 
            "s_ee": 0.0, 
            "phi": 0.0,
            "bulk_curvature": 0.0,
            "complexity": 0.0
        }

    base_coords = jnp.array([[n.x, n.y, n.z] for n in nodes_data], dtype=jnp.float64)
    padded_node_positions = jnp.pad(base_coords, ((0, 0), (0, max(0, 4 - base_coords.shape[1]))), constant_values=1.0)
    
    healths = jnp.array([n.health for n in nodes_data], dtype=jnp.float64)
    
    diff = base_coords[:, None, :] - base_coords[None, :, :]
    dist_matrix = jnp.sqrt(jnp.sum(diff ** 2, axis=-1) + 1e-8)

    s_ee = float(jnp.sum(base_coords[:, 0]) * 0.01)
    phi = float(jnp.std(base_coords) * 0.1)
    integrity = int(max(0, min(100, 100 - (base_coords.shape[0] * 2))))

    telemetry = pipeline.step_telemetry(padded_node_positions)
    
    bulk_curvature = telemetry["mean_ricci_scalar"]
    complexity = telemetry["max_ricci_scalar"] * 0.5

    return {
        "status": "success",
        "integrity": integrity,
        "s_ee": round(s_ee, 4),
        "phi": round(phi, 4),
        "bulk_curvature": round(bulk_curvature, 4),
        "complexity": round(complexity, 4)
    }

@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    global current_active_node_positions
    await manager.connect(websocket)
    
    # Initialize a phase accumulator outside the while loop (above try:)
    phase = 0.0

    try:
        while True:
            start_time = time.time()
            # Increment phase smoothly each tick (e.g., 60Hz delta)
            phase += 0.05

            # Compute continuous orbital offset using accumulated phase
            updated_coords = current_active_node_positions.at[:, 0].add(jnp.sin(phase) * 20.0)
            updated_coords = updated_coords.at[:, 1].add(jnp.cos(phase) * 20.0)

            binary_payload = updated_coords.astype(jnp.float32).tobytes()
            await manager.send_binary(binary_payload, websocket)

            # Non-blocking check for incoming client messages (e.g., node drag updates)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                control_packet = json.loads(data)
                if control_packet.get("action") == "update_nodes":
                    nodes = control_packet.get("nodes", [])
                    if nodes:
                    # Safely extract x, y, and default z to prevent KeyError crashes
                        base_coords_in = jnp.array(
                            [[n.get("x", 0.0), n.get("y", 0.0), n.get("z", 0.0)] for n in nodes], 
                            dtype=jnp.float64
                        )
                        current_active_node_positions = jnp.pad(
                            base_coords_in, 
                            ((0, 0), (0, max(0, 4 - base_coords_in.shape[1]))), 
                            constant_values=1.0
                        )
            except asyncio.TimeoutError:
                pass

            # Compute telemetry metrics continuously at 60Hz
            base_coords = current_active_node_positions[:, :3]

            s_ee = float(jnp.sum(base_coords[:, 0]) * 0.01)
            phi = float(jnp.std(base_coords) * 0.1)
            integrity = int(max(0, min(100, 100 - (base_coords.shape[0] * 2))))
            
            telemetry = pipeline.step_telemetry(current_active_node_positions)
            
            hud_metadata = {
                "type": "hud_update",
                "timestamp": telemetry["timestamp"],
                "integrity": integrity,
                "s_ee": round(s_ee, 4),
                "phi": round(phi, 4),
                "max_curvature": telemetry["max_ricci_scalar"],
                "avg_curvature": telemetry["mean_ricci_scalar"]
            }
            await manager.send_text_json(hud_metadata, websocket)
            binary_payload = current_active_node_positions.astype(jnp.float32).tobytes()
            await manager.send_binary(binary_payload, websocket)
            # Maintain a strict 60Hz cadence
            elapsed = time.time() - start_time
            sleep_duration = max(0.0, (1.0 / 60.0) - elapsed)
            await asyncio.sleep(sleep_duration)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# 2. Mount static files last so they don't override custom routes
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../frontend"))
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

