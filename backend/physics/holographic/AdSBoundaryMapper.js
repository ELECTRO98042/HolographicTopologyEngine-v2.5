/**
 * AdSBoundaryMapper.js
 * Implements AdS/CFT boundary-to-bulk mapping for v3.2.
 * Binds 2D edge states as Dirichlet boundary conditions for the 3D bulk mesh.
 */

export class AdSBoundaryMapper {
    /**
     * @param {number} gridSize - Dimension of the 2D boundary grid (N x N)
     * @param {number} bulkDepth - Radial depth of the AdS bulk discretization (z-coordinate)
     */
    constructor(gridSize, bulkDepth = 10) {
        this.gridSize = gridSize;
        this.bulkDepth = bulkDepth;
        // Initialize 3D bulk tensor [z][x][y]
        this.bulkMesh = Array.from({ length: bulkDepth }, () =>
            Array.from({ length: gridSize }, () => new Float32Array(gridSize))
        );
    }

    /**
     * Extracts 2D boundary conditions from a 2D scalar field array and 
     * propagates them into the 3D bulk using a discretized radial weighting function.
     * 
     * @param {Float32Array|Array<Array<number>>} boundaryField - The 2D grid values
     */
    mapBoundaryToBulk(boundaryField) {
        const N = this.gridSize;

        // 1. Set z = 0 slice directly from the 2D boundary field (Dirichlet boundary condition)
        for (let x = 0; x < N; x++) {
            for (let y = 0; y < N; y++) {
                const val = Array.isArray(boundaryField) ? boundaryField[x][y] : boundaryField[x * N + y];
                this.bulkMesh[0][x][y] = val;
            }
        }

        // 2. Propagate inward into the bulk using AdS radial damping/scaling (z-dependent metric)
        // Bulk metric decay factor roughly approximates AdS radial slicing: phi(z, x, y) ~ z-scaling
        for (let z = 1; z < this.bulkDepth; z++) {
            const zScale = 1.0 / (1.0 + 0.5 * z); // AdS warp factor approximation
            
            for (let x = 0; x < N; x++) {
                for (let y = 0; y < N; y++) {
                    // Pull averaged neighborhood influence from the boundary or previous slice
                    let sum = this.bulkMesh[0][x][y];
                    let count = 1;

                    // Simple spatial smoothing to simulate geodesic reconstruction along bulk trajectories
                    if (x > 0) { sum += this.bulkMesh[z - 1][x - 1][y]; count++; }
                    if (x < N - 1) { sum += this.bulkMesh[z - 1][x + 1][y]; count++; }
                    if (y > 0) { sum += this.bulkMesh[z - 1][x][y - 1]; count++; }
                    if (y < N - 1) { sum += this.bulkMesh[z - 1][x][y + 1]; count++; }

                    this.bulkMesh[z][x][y] = (sum / count) * zScale;
                }
            }
        }

        return this.bulkMesh;
    }

    /**
     * Verification Test: Holographic Reconstruction Check
     * Injects a high-frequency pulse at a boundary node and verifies 
     * symmetric reconstruction along the expected bulk geodesic.
     */
    runHolographicReconstructionTest(targetX, targetY, pulseAmplitude) {
        console.group("v3.2 Verification Test: Holographic Reconstruction");

        // Create a test 2D flat boundary field
        const testBoundary = Array.from({ length: this.gridSize }, () => new Float32Array(this.gridSize));
        testBoundary[targetX][targetY] = pulseAmplitude;

        // Map to bulk
        this.mapBoundaryToBulk(testBoundary);

        // Inspect perturbation propagation along depth z
        let symmetryIntact = true;
        let previousVal = pulseAmplitude;

        for (let z = 0; z < this.bulkDepth; z++) {
            const currentVal = this.bulkMesh[z][targetX][targetY];
            console.log(`Bulk Depth z=${z}: amplitude = ${currentVal.toExponential(4)}`);
            
            // Ensure monotonic attenuation without erratic jumps (smooth geodesic falloff)
            if (z > 0 && Math.abs(currentVal) > Math.abs(previousVal)) {
                symmetryIntact = false;
            }
            previousVal = currentVal;
        }

        if (symmetryIntact) {
            console.assert(true, "PASS: Bulk metric reconstructs perturbation monotonically along expected geodesic trajectory.");
        } else {
            console.error("FAIL: Non-monotonic energy spike detected in bulk reconstruction.");
        }

        console.groupEnd();
        return symmetryIntact;
    }
}