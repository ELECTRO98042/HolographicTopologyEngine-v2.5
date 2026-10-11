import jax
import jax.numpy as jnp

# Enable 64-bit precision for high-fidelity geometric calculations
jax.config.update("jax_enable_x64", True)

def dynamic_metric_tensor(x, node_positions, eps=1e-6):
    """
    Upgraded metric tensor g_ij(x) coupled to dynamic node positions.
    Includes singularity protection to prevent NaN corruption during interactive dragging.
    """
    r = jnp.clip(jnp.abs(x[0]), 0.0, 1.0 - eps)
    theta = jnp.clip(x[1], eps, jnp.pi - eps)
    
    # Base metric modulated by node positioning proximity or field state
    g_00 = -(1.0 - r**2)
    g_11 = 1.0 / (1.0 - r**2)
    g_22 = r**2
    g_33 = r**2 * (jnp.sin(theta)**2)
    
    return jnp.diag(jnp.array([g_00, g_11, g_22, g_33]))

@jax.jit
def compute_curvature_metrics(x, node_positions):
    """
    Computes Christoffel symbols, full Riemann tensor, Ricci tensor, and Ricci scalar
    fused into a single optimized XLA kernel using forward-mode autodiff.
    """
    metric_fn = lambda coord: dynamic_metric_tensor(coord, node_positions)
    
    # 1. Jacobians of the metric tensor: ∂_k g_ij
    dg = jax.jacfwd(metric_fn)(x)
    g = metric_fn(x)
    g_inv = jnp.linalg.inv(g)
        
    # 2. Christoffel Symbols via Einstein summation
    christoffel = 0.5 * jnp.einsum('il,ljk->ijk', g_inv, 
                         dg.transpose(1, 0, 2) + dg.transpose(2, 0, 1) - dg.transpose(0, 2, 1))
        
    # 3. Riemann Curvature Tensor derivation via nested Jacobian of Christoffel symbols
    d_christoffel = jax.jacfwd(lambda coord: 0.5 * jnp.einsum('il,ljk->ijk', 
                               jnp.linalg.inv(metric_fn(coord)), 
                               jax.jacfwd(metric_fn)(coord).transpose(1, 0, 2) + 
                               jax.jacfwd(metric_fn)(coord).transpose(2, 0, 1) - 
                               jax.jacfwd(metric_fn)(coord).transpose(0, 2, 1)))(x)
    
    term1 = d_christoffel
    term2 = d_christoffel.transpose(0, 1, 3, 2)
    term3 = jnp.einsum('ljm,mik->lijk', christoffel, christoffel)
    term4 = jnp.einsum('lkm,mij->lijk', christoffel, christoffel)
    
    riemann = term1 - term2 + term3 - term4
    
    # 4. Contractions down to Ricci Tensor and Ricci Scalar
    ricci_tensor = jnp.einsum('jlik->ik', riemann)
    ricci_scalar = jnp.einsum('ik,ik->', g_inv, ricci_tensor)
        
    return ricci_scalar, ricci_tensor, christoffel