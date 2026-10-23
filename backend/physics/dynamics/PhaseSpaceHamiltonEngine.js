/**
 * PhaseSpaceHamiltonianEngine.js
 * Integrates Hamiltonian equations of motion for non-linear oscillator nodes.
 */
class PhaseSpaceHamiltonianEngine {
    constructor(options = {}) {
        this.mass = options.mass || 1.0;
        this.omega = options.omega || 1.5; // Natural frequency
        this.lambda = options.lambda || 0.2; // Non-linear coupling anharmonicity
    }

    /**
     * Computes time derivative [dq/dt, dp/dt] given canonical coordinates (q, p).
     */
    computeDerivatives(q, p) {
        // H = p^2/(2m) + 1/2 * m * omega^2 * q^2 + 1/4 * lambda * q^4
        const dqdt = p / this.mass;
        const dpdt = -this.mass * Math.pow(this.omega, 2) * q - this.lambda * Math.pow(q, 3);
        return { dqdt, dpdt };
    }

    /**
     * Runge-Kutta 4th order (RK4) integration step for phase space trajectory.
     */
    stepRK4(q, p, dt = 0.01) {
        const k1 = this.computeDerivatives(q, p);
        
        const q2 = q + 0.5 * dt * k1.dqdt;
        const p2 = p + 0.5 * dt * k1.dpdt;
        const k2 = this.computeDerivatives(q2, p2);

        const q3 = q + 0.5 * dt * k2.dqdt;
        const p3 = p + 0.5 * dt * k2.dpdt;
        const k3 = this.computeDerivatives(q3, p3);

        const q4 = q + dt * k3.dqdt;
        const p4 = p + dt * k3.dpdt;
        const k4 = this.computeDerivatives(q4, p4);

        const nextQ = q + (dt / 6.0) * (k1.dqdt + 2 * k2.dqdt + 2 * k3.dqdt + k4.dqdt);
        const nextP = p + (dt / 6.0) * (k1.dpdt + 2 * k2.dpdt + 2 * k3.dpdt + k4.dpdt);

        const energy = (Math.pow(nextP, 2) / (2 * this.mass)) + 
                       (0.5 * this.mass * Math.pow(this.omega, 2) * Math.pow(nextQ, 2)) + 
                       (0.25 * this.lambda * Math.pow(nextQ, 4));

        return { q: nextQ, p: nextP, energy };
    }
}

module.exports = PhaseSpaceHamiltonianEngine;