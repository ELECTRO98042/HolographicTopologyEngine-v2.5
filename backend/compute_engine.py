# backend/compute_engine.py
import json
import numpy as np
import jax.numpy as jnp

def compute_advanced_tensors(coords: jnp.ndarray, params: dict):
    n_nodes = coords.shape[0]
    if n_nodes < 2:
        return 0.0, 0.0

    diff = coords[:, None, :] - coords[None, :, :]
    dist_matrix = jnp.sqrt(jnp.sum(diff ** 2, axis=-1) + 1e-8)

    coord_mean = jnp.mean(coords, axis=0)
    variance = jnp.mean(jnp.sum((coords - coord_mean) ** 2, axis=-1))
    bulk_curvature = float(jnp.tanh(variance * 0.01) * 1.5)

    coupling = params.get("coupling_constant", 0.1)
    complexity = float(jnp.sum(dist_matrix) * coupling * 1.25)

    return bulk_curvature, complexity

def compute_topology_metrics(nodes):
    """Computes basic adjacency, distance matrices, and mock entanglement entropy S(EE)."""
    n_count = len(nodes)
    if n_count == 0:
        return {"integrity": 100, "s_ee": 0.0, "phi": 0.0}

    coords = np.array([[n['x'], n['y'], n['z']] for n in nodes])
    
    # Calculate pairwise distances
    dist_matrix = np.linalg.norm(coords[:, np.newaxis, :] - coords[np.newaxis, :, :], axis=2)
    
    # Mock quantum metrics for research pipeline export
    s_ee = float(np.sum(np.log1p(dist_matrix + 1e-5)) / (n_count * 2))
    phi = float(np.mean(dist_matrix) * 0.23)
    
    return {
        "integrity": 100,
        "s_ee": round(s_ee, 2),
        "phi": round(phi, 2)
    }

if __name__ == "__main__":
    # Test execution mock state
    sample_nodes = [{"x": 0.5, "y": -0.2, "z": 1.1}, {"x": -1.0, "y": 0.4, "z": -0.2}]
    metrics = compute_topology_metrics(sample_nodes)
    print("Backend Compute Engine Initialized successfully:", json.dumps(metrics, indent=2))