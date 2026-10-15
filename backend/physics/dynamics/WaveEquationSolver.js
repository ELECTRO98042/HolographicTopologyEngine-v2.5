export class WaveEquationSolver {
    constructor(gridSize = 32, damping = 0.99, waveSpeed = 0.5) {
        this.gridSize = gridSize;
        this.damping = damping;
        this.c2 = waveSpeed * waveSpeed; // Wave propagation speed squared
        
        const count = gridSize * gridSize;
        this.current = new Float32Array(count);
        this.previous = new Float32Array(count);
        this.next = new Float32Array(count);
    }

    // Inject energy or boundary perturbation at a specific grid coordinate
    disturb(x, y, amplitude) {
        if (x > 0 && x < this.gridSize - 1 && y > 0 && y < this.gridSize - 1) {
            const index = y * this.gridSize + x;
            this.current[index] += amplitude;
        }
    }

    // Apply Dirichlet boundary conditions from external stream / holographic edge states
    setBoundaryEdge(edgeData) {
        // Can be mapped to incoming telemetry entropy or boundary node states
        const len = Math.min(edgeData.length, this.gridSize);
        for (let i = 0; i < len; i++) {
            this.current[i] = edgeData[i]; // Top edge binding
        }
    }

    // Advance the wave equation by one time step using finite difference method
    step(dt = 0.1) {
        const size = this.gridSize;
        
        for (let y = 1; y < size - 1; y++) {
            for (let x = 1; x < size - 1; x++) {
                const idx = y * size + x;
                
                // Discrete 2D Laplacian operator (spatial second derivatives)
                const laplacian = 
                    this.current[idx - 1] + 
                    this.current[idx + 1] + 
                    this.current[idx - size] + 
                    this.current[idx + size] - 
                    (4.0 * this.current[idx]);

                // Wave equation update rule with damping
                const acceleration = this.c2 * laplacian;
                
                this.next[idx] = (2.0 * this.current[idx] - this.previous[idx] + acceleration * (dt * dt)) * this.damping;
            }
        }

        // Shift history buffers
        const temp = this.previous;
        this.previous = this.current;
        this.current = this.next;
        this.next = temp;
    }

    // Calculate total system energy (Kinetic + Potential) for our verification test
    calculateTotalEnergy() {
        let energy = 0;
        const size = this.gridSize;
        for (let i = 0; i < this.current.length; i++) {
            const velocity = (this.current[i] - this.previous[i]);
            const potential = this.current[i] * this.current[i];
            energy += (velocity * velocity + potential);
        }
        return energy;
    }
}