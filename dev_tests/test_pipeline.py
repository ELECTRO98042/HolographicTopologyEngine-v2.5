import pytest
import jax.numpy as jnp
import numpy as np
from compute_engine import (
    compute_advanced_tensors,
    compute_topology_metrics,
    serialize_coords_to_binary,
    optimized_step_telemetry
)

def test_compute_advanced_tensors():
    """Verify advanced tensor calculation and return bounds."""
    coords = jnp.array([[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]], dtype=jnp.float32)
    params = {"coupling_constant": 0.1}
    curvature, complexity = compute_advanced_tensors(coords, params)
    
    assert jnp.isfinite(curvature), "Bulk curvature yielded non-finite values."
    assert jnp.isfinite(complexity), "Complexity yielded non-finite values."

def test_compute_topology_metrics():
    """Validate topology metrics dictionary structure and default values."""
    nodes = [{"x": 0.5, "y": -0.2, "z": 1.1}, {"x": -1.0, "y": 0.4, "z": -0.2}]
    metrics = compute_topology_metrics(nodes)
    
    assert "integrity" in metrics
    assert "s_ee" in metrics
    assert "phi" in metrics
    assert metrics["integrity"] == 100

def test_serialize_coords_to_binary():
    """Ensure tensor serialization packs correct byte length for float32 array."""
    coords = jnp.zeros((32, 3), dtype=jnp.float32)
    b = serialize_coords_to_binary(coords)
    
    assert isinstance(b, bytes)
    assert len(b) == 32 * 3 * 4  # 32 nodes * 3 dims * 4 bytes per float32

def test_optimized_step_telemetry():
    """Verify vectorized telemetry metrics generation."""
    positions = jnp.array([[0.0, 0.0, 0.0], [1.0, 1.0, 1.0]], dtype=jnp.float32)
    telemetry = optimized_step_telemetry(positions)
    
    assert "mean_ricci_scalar" in telemetry
    assert "max_ricci_scalar" in telemetry