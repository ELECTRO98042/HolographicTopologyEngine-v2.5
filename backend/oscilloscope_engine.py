import asyncio
import json
import math
import numpy as np
from fastapi import WebSocket, WebSocketDisconnect

class OscilloscopeEngine:
    def __init__(self, sample_rate=200_000_000, bandwidth=100_000_000_000):
        self.sample_rate = sample_rate
        self.bandwidth = bandwidth
        self.phase = 0.0

    def generate_frame(self, num_points=1024):
        t = np.linspace(0, 2 * np.pi, num_points) + self.phase
        self.phase += 0.1
        
        signal = (
            np.sin(t * 3.0) * 2.5 +
            np.cos(t * 7.5) * 1.2 +
            np.sin(t * 15.0) * 0.4 +
            (np.random.normal(0, 0.05, num_points))
        )
        return signal.astype(np.float32).tobytes()

async def oscilloscope_websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    engine = OscilloscopeEngine()
    try:
        while True:
            frame_bytes = engine.generate_frame(1024)
            await websocket.send_bytes(frame_bytes)
            await asyncio.sleep(0.033)
    except WebSocketDisconnect:
        print("[OscilloscopeEngine] Client disconnected")