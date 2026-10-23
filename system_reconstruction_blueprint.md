# HOLOGRAPHIC TOPOLOGY ENGINE: SYSTEM RECONSTRUCTION BLUEPRINT & STATE MATRIX
**Document Version:** 2.7.5-STATE-PERSISTENCE  
**Target Parser:** AI Agent / Large Language Model System Context Restorer  
**Format:** Machine-Optimized Context Restoration Spec  

---

## 1. PROJECT METADATA & INTENT RECONSTRUCTION

```json
{
  "project_name": "HolographicTopologyEngine",
  "version_state": "v2.7.5",
  "architecture_type": "Full-Stack Physics Telemetry & Visual Computation Platform",
  "core_scientific_objective": "Bridge theoretical physics (AdS/CFT duality, Ryu-Takayanagi entanglement entropy, Lindblad open quantum decoherence, non-linear Hamiltonian dynamics, and IIT) with real-time, low-latency 3D mesh and phase-space visualizations via WebSocket telemetry streams.",
  "execution_entrypoint": "./run.sh",
  "backend_framework": "FastAPI / Uvicorn (Python 3.x) + Node.js/JS Computational Modules",
  "frontend_stack": "HTML5 / CSS3 / Three.js WebGL Graphics / Dynamic WebSocket Telemetry Client"
}
```

---

## 2. COMPLETE DIRECTORY STRUCTURE & FILE MANIFEST

```text
HolographicTopologyEngine-v2.5/
├── run.sh                                # Execution startup script for backend & web server
├── ModuleIntentDescription.txt           # High-level feature intent & architecture design
├── SYSTEM_BLUEPRINT_AND_STATE_MATRIX.md   # [THIS FILE] Complete state persistence matrix
├── test_suite_configs/                   # Root-level scientific test configs
│   ├── test_01_spacetimemetric.json
│   ├── test_02_ryutakayanagi.json
│   ├── test_03_tensornetwork.json
│   ├── test_04_lindbladdecoherence.json
│   ├── test_05_phasespacehamiltonian.json
│   ├── test_06_waveequationsolver.json
│   └── test_07_integratedinformation.json
├── backend/
│   ├── main.py                           # FastAPI core server, WebSocket manager, API router
│   ├── compute_engine.py                 # Numerical computations, tensor ops, dynamic arrays
│   ├── geometry.py                       # Spatial coordinate transformations, geometric logic
│   ├── oscilloscope_engine.py            # Real-time signal analysis & wave array buffering
│   └── physics/                          # COMPLETE REAL-WORLD EQUATION LIBRARY
│       ├── dynamics/
│       │   ├── WaveEquationSolver.js     # Partial differential wave equation solver
│       │   └── PhaseSpaceHamiltonianEngine.js # RK4 Hamiltonian orbital integrator
│       ├── holographic/
│       │   ├── AdSBoundaryMapper.js      # Bulk-boundary Poincaré space projections
│       │   ├── RyuTakayanagiCalculator.js # Minimal surface area & entanglement entropy
│       │   ├── SpacetimeMetricEngine.js  # g_mu_nu tensor, Christoffel symbols, geodesics
│       │   └── TensorNetworkSimulator.js # MERA tree contractions & bond dim scaling
│       └── information/
│           ├── IntegratedInformationCalculator.js # IIT Phi metric & MIP cut evaluator
│           └── LindbladDecoherenceEngine.js # Density matrix density evolution Tr(rho^2)
└── frontend/
    ├── index.html                        # Gateway / System Launch view
    ├── dashboard.html                    # Integrated telemetry & Phi metric dashboard
    ├── phasespace.html                   # Phase-space orbital trajectory viewer
    ├── oscilloscope.html                 # Signal wave oscilloscope interface
    ├── topologylattice.html              # 3D spatial node mesh lattice viewer (Three.js)
    ├── rawmatrix.html                    # Matrix heatmap & raw state data grid
    ├── css/
    │   └── style.css                     # Global UI styling & dashboard layout
    └── js/
        ├── TopologyMeshViewer.js         # 3D WebGL Mesh rendering controller
        ├── PhaseSpaceViewer.js           # Vector field & phase space renderer
        ├── OscilloscopeViewer.js         # Dual-channel waveform canvas controller
        ├── RawMatrixViewer.js            # Dynamic heatmap grid controller
        ├── controlDeck.js                # UI control panel, parameter bindings
        ├── snapshotEngine.js             # Canvas/state frame exporter
        ├── telemetryStream.js            # Low-latency WebSocket data receiver
        └── vendor/graphics/three.js      # Three.js 3D rendering library
```

---

## 3. ENGINE MATHEMATICAL & OPERATIONAL SPECIFICATION

### A. Holographic & Metric Modules (`backend/physics/holographic/`)
1. **`SpacetimeMetricEngine.js`**: Calculates $ds^2 = \frac{L^2}{z^2}(-dt^2 + dx^2 + dy^2 + dz^2)$. Computes non-zero Christoffel symbols $\Gamma^\mu_{\alpha\beta}$ and steps null/timelike geodesics using Verlet/Euler symplectic integration.
2. **`RyuTakayanagiCalculator.js`**: Computes minimal surface area $A(\gamma_A)$ anchored to boundary radius $R$. Calculates entanglement entropy $S_A = \frac{\text{Area}(\gamma_A)}{4 G_N}$ and builds hemispheric $z(x) = \sqrt{R^2 - x^2}$ 3D mesh points.
3. **`AdSBoundaryMapper.js`**: Maps bulk node tensor states to conformal boundary fields ($d-1$ dimensions) through boundary radial scaling factors $z \to 0$.
4. **`TensorNetworkSimulator.js`**: Manages MERA hierarchical tree layers, bond dimension $\chi = 16$, and SVD truncation spectrum to simulate emergent geometry from tensor contractions.

### B. Information Theory Modules (`backend/physics/information/`)
1. **`LindbladDecoherenceEngine.js`**: Simulates open quantum master equation $\frac{d\rho}{dt} = -i[H,\rho] + \sum L_k \rho L_k^\dagger - \frac{1}{2}\{L_k^\dagger L_k, \rho\}$. Evaluates state purity $\text{Tr}(\rho^2)$ and off-diagonal coherence decay.
2. **`IntegratedInformationCalculator.js`**: Evaluates system integrated information $\Phi$ across minimum information partition (MIP) cuts on connected node subsets.

### C. Dynamics Modules (`backend/physics/dynamics/`)
1. **`PhaseSpaceHamiltonianEngine.js`**: Integrates $H(q,p) = \frac{p^2}{2m} + \frac{1}{2}m\omega^2 q^2 + \frac{1}{4}\lambda q^4$ using 4th-Order Runge-Kutta (RK4) to ensure energy conservation across canonical orbits.
2. **`WaveEquationSolver.js`**: Discrete finite-difference time-domain (FDTD) solver for second-order scalar wave equation $\frac{\partial^2 \psi}{\partial t^2} = c^2 \nabla^2 \psi - \gamma \frac{\partial \psi}{\partial t}$.

---

## 4. SCIENTIFIC METHODOLOGY & TEST PROCEDURE

To dial in visual accuracy, every evaluation MUST follow a strict four-step scientific iteration loop:

```
[HYPOTHESIS] ---> [EXECUTION] ---> [TELEMETRY EVALUATION] ---> [CALIBRATION]
      ^                                                              |
      |______________________________________________________________|
```

1. **Step 1: Hypothesis Formulation**: Define exact expected physical/mathematical output for a given module (e.g., "Energy drift in RK4 Hamiltonian integrator must remain $< 10^{-5}$ over $10^4$ steps").
2. **Step 2: JSON Configuration Load**: Load the corresponding test file from `test_suite_configs/test_0X_*.json`.
3. **Step 3: Multi-Channel Telemetry Verification**: Run test and analyze incoming WebSocket telemetry stream across targeted front-end views (`topologylattice.html`, `oscilloscope.html`, `phasespace.html`, `rawmatrix.html`).
4. **Step 4: Calibration & Parameter Tuning**: Adjust damping, step size, bond dimension, or cutoff thresholds until rendering matches theoretical bounds.

---

## 5. RECONSTRUCTION INSTRUCTIONS FOR NEW AGENT SESSION

If context is reset, feed this file (`SYSTEM_BLUEPRINT_AND_STATE_MATRIX.md`) to the agent and issue the following directive:

> *"System Context Restored. Read `SYSTEM_BLUEPRINT_AND_STATE_MATRIX.md`. Confirm understanding of all 7 physics modules, 7 test configs, frontend views, and backend telemetry channels. We are currently at Step 4 of our workflow, ready to execute scientific testing across the suite. Standing by for instructions."*

---
*End of Reconstruction Blueprint.*