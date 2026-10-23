import json
import struct
import numpy as np

def pack_simulation_json_to_binary(json_filepath):
    """
    Parses an external researcher JSON simulation file and packs frames 
    into zero-copy binary buffers with a 24-byte little-endian header.
    """
    with open(json_filepath, 'r') as f:
        data = json.load(f)
        
    binary_frames = []
    
    for frame in data.get('simulation_frames', []):
        step = frame['time_step']
        time_elapsed = frame['time_elapsed']
        
        state = frame['state_data']
        # Extract numerical arrays explicitly mapping the required physical fields[cite: 1]
        grid = np.array(state['grid_positions'], dtype=np.float64)
        efield_real = np.array(state['electric_field_real'], dtype=np.float64)
        efield_imag = np.array(state['electric_field_imag'], dtype=np.float64)
        prob_density = np.array(state['probability_density_envelope'], dtype=np.float64)
        
        num_points = len(grid)
        
        # Header Format (Little-Endian '<'):
        # 1. step: uint32 (4B)
        # 2. time_elapsed: float64 (8B)
        # 3. num_points: uint32 (4B)
        # 4. reserved/padding: 8B
        # Total header size = 24 Bytes
        header = struct.pack('<IdI8x', step, time_elapsed, num_points)
        
        # Zero-copy payload concatenation of all 4 parallel arrays
        payload = (
            grid.tobytes() +
            efield_real.tobytes() +
            efield_imag.tobytes() +
            prob_density.tobytes()
        )
        
        binary_frames.append(header + payload)
        
    return binary_frames