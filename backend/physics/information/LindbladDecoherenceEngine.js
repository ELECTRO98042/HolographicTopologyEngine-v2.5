/**
 * LindbladDecoherenceEngine.js
 * Simulates open quantum system dynamics and decoherence via the Lindblad master equation.
 */
class LindbladDecoherenceEngine {
    constructor(matrixSize = 2, gamma = 0.1) {
        this.dim = matrixSize;
        this.gamma = gamma; // Decoherence rate
        // Initialize pure state density matrix |0><0|
        this.densityMatrix = [
            { real: 1.0, imag: 0.0 }, { real: 0.0, imag: 0.0 },
            { real: 0.0, imag: 0.0 }, { real: 0.0, imag: 0.0 }
        ];
    }

    /**
     * Advances the density matrix by time step dt using Lindblad dissipation terms.
     */
    stepDecoherence(dt = 0.01) {
        // Off-diagonal elements decay exponentially due to environmental decoherence
        // rho_01(t+dt) = rho_01(t) * exp(-gamma * dt)
        const decayFactor = Math.exp(-this.gamma * dt);
        
        // Index 1 and 2 represent off-diagonal elements in a 2x2 matrix
        this.densityMatrix[1].real *= decayFactor;
        this.densityMatrix[1].imag *= decayFactor;
        this.densityMatrix[2].real *= decayFactor;
        this.densityMatrix[2].imag *= decayFactor;

        return this.calculatePurity();
    }

    /**
     * Calculates purity Tr(rho^2) to measure mixedness vs pure state.
     */
    calculatePurity() {
        // For a 2x2 density matrix, Tr(rho^2) = rho_00^2 + rho_11^2 + 2*|rho_01|^2
        const r00 = this.densityMatrix[0].real;
        const r11 = this.densityMatrix[3].real;
        const r01_magSq = Math.pow(this.densityMatrix[1].real, 2) + Math.pow(this.densityMatrix[1].imag, 2);
        
        return Math.pow(r00, 2) + Math.pow(r11, 2) + 2 * r01_magSq;
    }
}

module.exports = LindbladDecoherenceEngine;