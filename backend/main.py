import os
import time
import asyncio
import json
import random
import logging
import numpy as np

import jax
jax.config.update("jax_enable_x64", True)
import jax.numpy as jnp

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Dict, List, Any

# Configure logger
logger = logging.getLogger("uvicorn.error")

# ==========================================
# IMPORT MODULARIZED ENGINES & HELPERS
# ==========================================
from oscilloscope_engine import oscilloscope_websocket_endpoint, OscilloscopeEngine
from compute_engine import serialize_coords_to_binary

# Mock or local stub for curvature metrics if not imported directly
def compute_curvature_metrics(x, node_positions):
    ricci_scalar = jnp.sum(jnp.sin(x)) * 0.1
    ricci_tensor = jnp.zeros((4, 4))
    christoffel = jnp.zeros((4, 4, 4))
    return ricci_scalar, ricci_tensor, christoffel

# Resolve base directories (optimized for project-root execution via run.sh)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
JS_DIR = os.path.join(BASE_DIR, "js")
PHYSICS_DIR = os.path.join(BASE_DIR, "physics")
FRONTEND_DIR = os.path.abspath(os.path.join(BASE_DIR, "../frontend"))
CSS_DIR = os.path.join(FRONTEND_DIR, "css")

app = FastAPI(title="Holographic Topology Engine HUD")

# Enable CORS middleware for local module communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# PIPELINE & CONNECTION MANAGERS
# ==========================================

class TelemetryStreamingPipeline:
    def __init__(self, grid_shape=(1000, 4)):
        self.grid_shape = grid_shape
        # Pre-allocate spatial coordinate evaluation grid
        self.spatial_grid = jax.random.uniform(jax.random.PRNGKey(42), self.grid_shape, minval=-0.5, maxval=0.5)
        
    def step_telemetry(self, node_positions):
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
        if websocket in self.active_connections:
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

# ==========================================
# PYDANTIC SCHEMAS / REST API ENDPOINTS
# ==========================================

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

# ==========================================
# ISOLATED CHANNEL WEBSOCKET ENDPOINTS
# ==========================================

# CH-01: Oscilloscope Stream
app.websocket("/ws/oscilloscope")(oscilloscope_websocket_endpoint)

# CH-02 Telemetry / Global Stream
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    global current_active_node_positions
    await manager.connect(websocket)
    
    try:
        if pipeline is None:
            await websocket.close(code=1011, reason="Pipeline not initialized")
            return
    except Exception as e:
        logger.error(f"Telemetry initialization failed: {e}")
        await websocket.close(code=1011)
        raise

    try:
        phase = 0.0  # Initialize phase accumulator to prevent NameError
        while True:
            start_time = time.time()
            phase += 0.05

            if current_active_node_positions.shape[0] > 0:
                num_nodes = current_active_node_positions.shape[0]
                indices = jnp.arange(num_nodes, dtype=jnp.float64)
                node_phases = phase + (indices * 2.0)
                
                x_offsets = jnp.sin(node_phases) * 15.0
                y_offsets = jnp.cos(node_phases * 1.3) * 15.0
                
                updated_coords = current_active_node_positions.at[:, 0].add(x_offsets)
                updated_coords = updated_coords.at[:, 1].add(y_offsets)
            else:
                updated_coords = current_active_node_positions

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
            except asyncio.TimeoutError:
                pass

            base_coords = current_active_node_positions[:, :3]
            s_ee = float(jnp.sum(base_coords[:, 0]) * 0.01)
            phi_val = float(jnp.std(base_coords) * 0.1)
            integrity = int(max(0, min(100, 100 - (base_coords.shape[0] * 2))))
            
            telemetry = pipeline.step_telemetry(current_active_node_positions)

            hud_metadata = {
                "type": "hud_update",
                "timestamp": telemetry["timestamp"],
                "integrity": integrity,
                "s_ee": round(s_ee, 4),
                "phi": round(phi_val, 4),
                "max_curvature": telemetry["max_ricci_scalar"],
                "avg_curvature": telemetry["mean_ricci_scalar"]
            }
            await manager.send_text_json(hud_metadata, websocket)

            grid_size = 32
            x = jnp.linspace(-10, 10, grid_size)
            y = jnp.linspace(-10, 10, grid_size)
            xx, yy = jnp.meshgrid(x, y)
            zz = jnp.sin(jnp.sqrt(xx**2 + yy**2) - phase) * 2.0
            
            wave_payload = zz.reshape(-1).astype(np.float32).tobytes()
            await manager.send_binary(wave_payload, websocket)

            elapsed = time.time() - start_time
            await asyncio.sleep(max(0.0, (1.0 / 60.0) - elapsed))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)

# CH-03: Raw Matrix / Tensor Inspector Stream
@app.websocket("/ws/telemetry")
async def websocket_matrix_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            start_time = time.time()
            tensor_frame = np.random.uniform(-2.0, 2.0, size=(32, 32)).astype(np.float32)
            payload = serialize_coords_to_binary(tensor_frame)
            await manager.send_binary(payload, websocket)
            
            elapsed = time.time() - start_time
            await asyncio.sleep(max(0.0, (1.0 / 60.0) - elapsed))
    except WebSocketDisconnect:
        pass
@app.websocket("/ws/phasespace")
async def websocket_phasespace_endpoint(websocket: WebSocket):
    await websocket.accept()
    print("connection open")
    try:
        t = 0.0
        while True:
            t += 0.05
            data = (np.sin(np.linspace(0, 4 * np.pi, 1024) + t) * np.cos(np.linspace(0, 4 * np.pi, 1024) * 0.5 - t * 0.8)).astype(np.float32)
            await websocket.send_bytes(data.tobytes())

            #frame_count += 1
            #if frame_count % 30 == 0:
                #print(f"[CH-04] Streaming phase-space frame {frame_count} ({data.nbytes} bytes)")

            await asyncio.sleep(0.016) # ~30 FPS telemetry stream
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"Phase-space WebSocket error: {e}")

# CH-04 Placeholder (Ready for future expansion)
# @app.websocket("/ws/ch04")
# async def websocket_ch04_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     ...

# ==========================================
# STATIC ASSET & MODULE MOUNTS (DEFINITIVE)
# ==========================================

app.mount("/js", StaticFiles(directory=JS_DIR), name="js")
app.mount("/physics", StaticFiles(directory=PHYSICS_DIR), name="physics")
if os.path.exists(CSS_DIR):
    app.mount("/css", StaticFiles(directory=CSS_DIR), name="css")

# Root catch-all mount must remain last to prevent overriding API/WebSocket routes
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")