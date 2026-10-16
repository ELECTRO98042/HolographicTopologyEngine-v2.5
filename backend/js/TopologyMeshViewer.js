import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';
import { WaveEquationSolver } from '/physics/dynamics/WaveEquationSolver.js';

export class TopologyMeshViewer {
    constructor(canvas) {
        this.canvas = canvas;
        this.gridSize = 32; // 32x32 vertex grid

        // 1. Initialize Fallback Physical Wave Solver
        this.solver = new WaveEquationSolver(this.gridSize, 0.995, 0.6);
        this.isServerDriven = false; // Tracks whether backend stream is active

        // 2. Scene Setup
        this.scene = new THREE.Scene();

        // 3. Camera Setup
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, -16, 18);
        this.camera.lookAt(0, 0, 0);

        // 4. Renderer Setup
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: true
        });
        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 5. Geometry & Wireframe Mesh Setup
        this.geometry = new THREE.PlaneGeometry(20, 20, this.gridSize - 1, this.gridSize - 1);

        this.material = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.85
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.scene.add(this.mesh);

        // Start Render Loop
        this.animate();
    }

    // High-performance binary ingestion from WebSocket
    updateCoordinates(float32Coords) {
        console.log("Binary payload received! Length:", float32Coords.length, "Sample Z:", float32Coords[0]);
        if (!this.geometry) return;
        this.isServerDriven = true; // Mark active stream

        const positionAttribute = this.geometry.attributes.position;

        // Fast buffer copy if dimensions match exactly
        const count = this.gridSize * this.gridSize;
        if (float32Coords.length === positionAttribute.array.length) {
            positionAttribute.array.set(float32Coords);
            positionAttribute.needsUpdate = true;
        } else if (float32Coords.length === positionAttribute.count) {
            // Fallback if receiving scalar/Z-displacement arrays
            for (let i = 0; i < float32Coords.length; i++) {
                positionAttribute.setZ(i, float32Coords[i] * 2.5);
            }
            positionAttribute.needsUpdate = true; // <-- Add this line
        } else {
            console.warn(`[CH-02] Payload length mismatch! Received: ${float32Coords.length}, Expected: ${count} or ${count * 3}`);
            return;
        }
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        // If backend stream isn't connected yet, fall back to local solver simulation
        if (!this.isServerDriven) {
            if (this.solver && typeof this.solver.step === 'function') {
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

        // Render scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }

    resize() {
        if (!this.canvas || !this.renderer || !this.camera) return;
        const width = this.canvas.clientWidth;
        const height = this.canvas.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }
}