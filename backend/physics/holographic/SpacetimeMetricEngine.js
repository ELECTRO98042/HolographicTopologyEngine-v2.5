/**
 * SpacetimeMetricEngine.js
 * Computes metric tensors, curvature, and geodesic trajectories in AdS and curved spacetimes.
 */
class SpacetimeMetricEngine {
    constructor(options = {}) {
        this.dimension = options.dimension || 4; // Default to 4D bulk (AdS_4 / BTZ style)
        this.AdSRadius = options.AdSRadius || 1.0; // AdS curvature radius (L)
    }

    /**
     * Calculates the AdS metric tensor g_mu_nu in Poincaré coordinates.
     * ds^2 = (L^2 / z^2) * (-dt^2 + dx^2 + dy^2 + dz^2)
     */
    getAdSPoincareMetric(coords) {
        const [t, x, y, z] = coords;
        if (z <= 0) throw new Error("Bulk coordinate z must be strictly positive (z > 0).");
        
        const factor = Math.pow(this.AdSRadius / z, 2);
        // Diagonal metric components [g_tt, g_xx, g_yy, g_zz]
        return [-factor, factor, factor, factor];
    }

    /**
     * Computes the Christoffel symbols Gamma^i_{jk} for AdS Poincaré metric.
     */
    computeChristoffelSymbols(coords) {
        const [t, x, y, z] = coords;
        // Non-zero Christoffel symbols for Poincaré AdS
        // Gamma^t_{tz} = Gamma^x_{xz} = Gamma^y_{yz} = Gamma^z_{zz} = -1/z
        // Gamma^z_{tt} = -z / L^2, Gamma^z_{xx} = z / L^2, etc.
        const gamma = {};
        const invZ = 1.0 / z;

        gamma['t_tz'] = -invZ;
        gamma['x_xz'] = -invZ;
        gamma['y_yz'] = -invZ;
        gamma['z_zz'] = -invZ;

        const L2 = Math.pow(this.AdSRadius, 2);
        gamma['z_tt'] = -z / L2;
        gamma['z_xx'] = z / L2;
        gamma['z_yy'] = z / L2;

        return gamma;
    }

    /**
     * Integrates a null or timelike geodesic step using the geodesic equation.
     */
    stepGeodesic(position, momentum, stepSize = 0.01) {
        const [t, x, y, z] = position;
        const [pt, px, py, pz] = momentum;
        const gamma = this.computeChristoffelSymbols(position);

        // Simple Euler/Verlet symplectic update for demonstration
        const dt = pt * Math.pow(z / this.AdSRadius, 2);
        const dx = px * Math.pow(z / this.AdSRadius, 2);
        const dy = py * Math.pow(z / this.AdSRadius, 2);
        const dz = pz * Math.pow(z / this.AdSRadius, 2);

        // Update position
        const newPos = [t + dt * stepSize, x + dx * stepSize, y + dy * stepSize, Math.max(0.001, z + dz * stepSize)];
        
        // Acceleration updates via connection terms: dp^mu / lambda = - Gamma^mu_{alpha beta} p^alpha p^beta
        const dpz = - (gamma['z_tt'] * pt * pt + gamma['z_xx'] * px * px + gamma['z_yy'] * py * py + 2 * gamma['z_zz'] * pz * pz);
        const newMom = [pt, px, py, pz + dpz * stepSize];

        return { position: newPos, momentum: newMom };
    }
}

module.exports = SpacetimeMetricEngine;