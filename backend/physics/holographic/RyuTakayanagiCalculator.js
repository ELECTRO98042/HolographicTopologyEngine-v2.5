/**
 * RyuTakayanagiCalculator.js
 * Computes holographic entanglement entropy S = Area(gamma_A) / (4 * G_N).
 */
class RyuTakayanagiCalculator {
    constructor(options = {}) {
        this.newtonConstant = options.newtonConstant || 1.0;
        this.AdSRadius = options.AdSRadius || 1.0;
    }

    /**
     * Computes the minimal surface area for a spherical boundary subregion of radius R in AdS_4.
     * Area formula in AdS: A = (2 * pi * L^2 / epsilon) - (2 * pi * L^2 / R) for leading divergences.
     */
    calculateMinimalSurfaceArea(subregionRadius, cutoffEpsilon = 0.01) {
        const L2 = Math.pow(this.AdSRadius, 2);
        const divergentTerm = (2 * Math.PI * L2) / cutoffEpsilon;
        const finiteTerm = (2 * Math.PI * L2) / subregionRadius;
        
        return Math.max(0, divergentTerm - finiteTerm);
    }

    /**
     * Computes entanglement entropy S for a given boundary subregion.
     */
    computeEntanglementEntropy(subregionRadius, cutoffEpsilon = 0.01) {
        const area = this.calculateMinimalSurfaceArea(subregionRadius, cutoffEpsilon);
        return area / (4.0 * this.newtonConstant);
    }

    /**
     * Generates discrete coordinate points along the bulk minimal surface semi-circle/hemisphere.
     */
    generateSurfaceMesh(subregionRadius, resolution = 20) {
        const points = [];
        for (let i = 0; i <= resolution; i++) {
            const theta = (i / resolution) * Math.PI;
            const x = subregionRadius * Math.cos(theta);
            const z = subregionRadius * Math.sin(theta); // Hemispheric bulk profile z^2 + x^2 = R^2
            points.push({ x, y: 0, z: Math.max(0.001, z) });
        }
        return points;
    }
}

module.exports = RyuTakayanagiCalculator;