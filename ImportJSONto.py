import json
import struct
import numpy as np

def convert_json_simulation_to_binary_stream(json_filepath):
    with open(json_filepath, 'r') as f:
        data = json.load(f)
        
    binary_frames = []
    
    for frame in data['simulation_frames']:
        step = frame['time_step']
        time_elapsed = frame['time_elapsed']
        
        # Extract numerical arrays and convert to float64 or float32 arrays
        state = frame['state_data']
        grid = np.array(state['grid_positions'], dtype=np.float64)
        prob_density = np.array(state['probability_density_envelope'], dtype=np.float64)
        
        # 1. Header (24 Bytes): [step (uint32), time_elapsed (float64), num_points (uint32), reserved (8B)]
        num_points = len(grid)
        header = struct.pack('<IdI8x', step, time_elapsed, num_points)
        
        # 2. Payload: Zero-copy byte representation of JAX/NumPy float arrays
        payload = grid.tobytes() + prob_density.tobytes()
        
        binary_frames.append(header + payload)
        
    return binary_frames