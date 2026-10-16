import os
import time
import asyncio
import json
import jax
import jax.dlpack
import jax.numpy as jnp
import random
import numpy as np
# backend/main.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from geometry import compute_curvature_metrics
from compute_engine import serialize_coords_to_binary # include it with your existing compute_engine imports

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(BASE_DIR, "js")
PHYSICS_DIR = os.path.join(BASE_DIR, "physics")

app = FastAPI()

# Mount the backend/js directory so the browser can request /js/controlDeck.js
app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
# Mount the backend/physics directory so the browser can request /physics/WaveEquationSolver.js
app.mount("/physics", StaticFiles(directory=PHYSICS_DIR), name="physics")

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

    async def broadcast_binary(self, data: bytes):
        for connection in self.active_connections:
            await connection.send_bytes(data)
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
        # Initialize coordinate state (e.g., 32x32 grid or tensor points)
        current_coords = jnp.zeros((1024, 3,), dtype=jnp.float32) # or your initial node tensor
        while True:
            start_time = time.time()
            # Increment phase smoothly each tick (e.g., 60Hz delta)
            phase += 0.05

            # If nodes have been initialized, apply independent node-specific orbital motion
            if current_active_node_positions.shape[0] > 0:
                num_nodes = current_active_node_positions.shape[0]
                indices = jnp.arange(num_nodes, dtype=jnp.float64)
                
                # Stagger each node's phase index-wise to break rigid-body locking
                node_phases = phase + (indices * 2.0)
                
                x_offsets = jnp.sin(node_phases) * 15.0
                y_offsets = jnp.cos(node_phases * 1.3) * 15.0  # Asymmetric multiplier for organic wandering
                
                updated_coords = current_active_node_positions.at[:, 0].add(x_offsets)
                updated_coords = updated_coords.at[:, 1].add(y_offsets)
            else:
                updated_coords = current_active_node_positions

            # Non-blocking check for incoming client messages (e.g., node drag updates)
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.001)
                control_packet = json.loads(data)
                if control_packet.get("action") == "update_nodes":
                    nodes = control_packet.get("nodes", [])
                    if nodes:
                        base_coords_in = jnp.array(
                            [[n.get("x", 0.0), n.get("y", 0.0), n.get("z", 0.0)] for n in nodes], 
                            dtype=jnp.float64
                        )
                        current_active_node_positions = jnp.pad(
                            base_coords_in, 
                            ((0, 0), (0, max(0, 4 - base_coords_in.shape[1]))), 
                            constant_values=1.0
                        )
                        updated_coords = current_active_node_positions
            except asyncio.TimeoutError:
                pass

            # Compute telemetry metrics continuously at 60Hz
            base_coords = current_active_node_positions[:, :3]

            s_ee = float(jnp.sum(base_coords[:, 0]) * 0.01)
            phi = float(jnp.std(base_coords) * 0.1)
            integrity = int(max(0, min(100, 100 - (base_coords.shape[0] * 2))))
            
            telemetry = pipeline.step_telemetry(current_active_node_positions)

            # Send HUD metadata JSON
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

            # Send single authoritative binary tensor frame
            # binary_payload = serialize_coords_to_binary(updated_coords)
            # Generate 32x32 wave height field using the phase accumulator
            grid_size = 32
            x = jnp.linspace(-10, 10, grid_size)
            y = jnp.linspace(-10, 10, grid_size)
            xx, yy = jnp.meshgrid(x, y)
            zz = jnp.sin(jnp.sqrt(xx**2 + yy**2) - phase) * 2.0
            
            # Flatten to exactly 1024 floats (4096 bytes)
            wave_payload = zz.reshape(-1).astype(np.float32).tobytes()
            await manager.send_binary(wave_payload, websocket)

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

