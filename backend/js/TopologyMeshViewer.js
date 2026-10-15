import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { WaveEquationSolver } from '/physics/dynamics/WaveEquationSolver.js';

export class TopologyMeshViewer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gridSize = 32; // 32x32 vertex plane grid

        // Initialize our physical wave solver
        this.solver = new WaveEquationSolver(this.gridSize, 0.995, 0.6);

        // 1. Scene Setup
        this.scene = new THREE.Scene();

        // 2. Camera Setup
        this.camera = new THREE.PerspectiveCamera(
            45,
            canvas.clientWidth / canvas.clientHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, -16, 18);
        this.camera.lookAt(0, 0, 0);

        // 3. Renderer Setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 4. Geometry & Wireframe Mesh Setup
        this.geometry = new THREE.PlaneGeometry(20, 20, this.gridSize - 1, this.gridSize - 1);
        this.material = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.85
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // 5. Internal Animation State
        this.time = 0;
        this.currentEntropy = 0.5;

        // Start render loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    // Called whenever new stream data arrives
    update(data) {
        if (data && typeof data.entropy === 'number') {
            this.currentEntropy = data.entropy;

            // Map live telemetry entropy into an energy disturbance at the center of the grid
            const center = Math.floor(this.gridSize / 2);
            const impulse = (this.currentEntropy - 0.5) * 1.5;
            this.solver.disturb(center, center, impulse);
        }
    }

    // Handle viewport resizing
    resize() {
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;

        if (width === 0 || height === 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    // WebGL Render Cycle with FDTD Wave Solver Integration
    animate() {
        requestAnimationFrame(() => this.animate());

        if (this.solver) {
            if (typeof this.solver.step === 'function') {
                this.solver.step();
            }

            const field = typeof this.solver.getField === 'function' ? this.solver.getField()
                : typeof this.solver.getState === 'function' ? this.solver.getState()
                    : (this.solver.field || this.solver.grid);

            if (field && this.geometry) {
                const positionAttribute = this.geometry.attributes.position;
                const N = this.gridSize;

                for (let i = 0; i < positionAttribute.count; i++) {
                    const x = i % N;
                    const y = Math.floor(i / N);
                    const zVal = field[x * N + y] || 0;
                    positionAttribute.setZ(i, zVal * 2.5);
                }
                positionAttribute.needsUpdate = true;
            }
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}