/**
 * Dashboard.js - Orchestrator for Multi-Channel HUD Navigation & View Management
 * Responsible for:
 * 1. Rendering the primary HUD layout container, control sidebar, and channel buttons.
 * 2. Managing channel switching lifecycle (CH-01 through CH-04 placeholder).
 * 3. Mounting, initializing, and resizing individual channel viewers (`OscilloscopeViewer`, 
 *    `TopologyMeshViewer`, `RawMatrixViewer`) without breaking scoping or state.
 */

export class TelemetryStreamApp {
    constructor(containerElement) {
        this.container = containerElement;
        this.activeViewer = null;

        // References to active module view instances
        this.oscViewer = null;    // CH-01: Oscilloscope Viewer
        this.meshViewer = null;   // CH-02: Topology Mesh Viewer (3D Lattice)
        this.matrixViewer = null; // CH-03: Raw Matrix / Tensor Inspector Viewer

        this.init();
    }

    /**
     * Initial startup sequence: builds layout, wires navigation, and defaults to CH-01.
     */
    init() {
        this.renderLayout();
        this.bindNavigationEvents();
        this.switchChannel('CH-01'); // Default initial view
    }

    /**
     * Renders the master HUD layout structure, including the viewport container,
     * instrument control panel sidebar, and the bottom channel navigation button bar.
     */
    renderLayout() {
        this.container.innerHTML = `
            <div style="position: relative; width: 100%; height: 100vh; box-sizing: border-box; background: #050808; display: flex; flex-direction: column;">
                
                <!-- TOP HEADER BAR -->
                <div id="channelTitle" style="text-align: center; color: #00ffcc; font-family: 'Courier New', Courier, monospace; font-size: 14px; padding: 12px; letter-spacing: 2px; border-bottom: 1.5px solid #00ffcc33;">
                    CH-01: INITIALIZING...
                </div>

                <!-- MAIN WORKSPACE CONTAINER (Split into Active View & Control Panel) -->
                <div style="flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: row;">
                    
                    <!-- DYNAMIC CHANNEL VIEWPORTS -->
                    <div style="flex: 1; position: relative; height: 100%;">
                        
                        <!-- CH-01 View Container (Oscilloscope) -->
                        <div id="view-CH-01" class="channel-view" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
                            <div id="oscilloscope-container" style="flex: 1; width: 100%; height: 100%; position: relative;">
                                <canvas id="canvas-CH-01" style="width: 100%; height: 100%; display: block;"></canvas>
                            </div>
                        </div>

                        <!-- CH-02 View Container (Topology Lattice 3D) -->
                        <div id="view-CH-02" class="channel-view" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
                            <canvas id="canvas-CH-02" style="width: 100%; height: 100%; display: block;"></canvas>
                        </div>

                        <!-- CH-03 View Container (Raw Matrix / Tensor Inspector) -->
                        <div id="view-CH-03" class="channel-view" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; overflow-y: auto; background: #050808; padding: 20px; box-sizing: border-box;">
                        <div class="matrix-header" style="margin-bottom: 15px;">
                            <div style="color: #00ffcc; font-family: monospace; font-size: 12px; letter-spacing: 1px; margin-bottom: 8px;">CH-03 // TENSOR MATRIX INSPECTOR // INVARIANT LAB</div>
                            <div class="controls-toolbar" style="display: flex; gap: 10px;">
                                <span style="color: #00ffcc; font-family: monospace; font-size: 11px; align-self: center;">FORMAT:</span>
                                <button class="hud-btn" id="formatHexBtn">HEX</button>
                                <button class="hud-btn" id="formatFloatBtn">FLOAT32</button>
                                <button class="hud-btn" id="formatSciBtn">SCIENTIFIC</button>
                            </div>
                        </div>

                        <div class="matrix-workspace" style="display: flex; gap: 20px;">
                            <!-- Sidebar for Analytical Invariants -->
                            <div class="diagnostics-sidebar" style="width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px;">
                                <div class="metric-card" style="background: rgba(0, 255, 204, 0.03); border: 1px solid rgba(0, 255, 204, 0.2); padding: 10px; font-family: monospace;">
                                    <div class="metric-title" style="font-size: 10px; color: #94a3b8;">Frobenius Norm</div>
                                    <div class="metric-value" id="metricNorm" style="font-size: 14px; color: #00ffcc; margin-top: 4px;">0.0000</div>
                                </div>
                                <div class="metric-card" style="background: rgba(0, 255, 204, 0.03); border: 1px solid rgba(0, 255, 204, 0.2); padding: 10px; font-family: monospace;">
                                    <div class="metric-title" style="font-size: 10px; color: #94a3b8;">Matrix Trace</div>
                                    <div class="metric-value" id="metricTrace" style="font-size: 14px; color: #00ffcc; margin-top: 4px;">0.0000</div>
                                </div>
                                <div class="metric-card" style="background: rgba(0, 255, 204, 0.03); border: 1px solid rgba(0, 255, 204, 0.2); padding: 10px; font-family: monospace;">
                                    <div class="metric-title" style="font-size: 10px; color: #94a3b8;">Sparsity Density</div>
                                    <div class="metric-value" id="metricSparsity" style="font-size: 14px; color: #00ffcc; margin-top: 4px;">0.0%</div>
                                </div>
                                <div class="metric-card" style="background: rgba(0, 255, 204, 0.03); border: 1px solid rgba(0, 255, 204, 0.2); padding: 10px; font-family: monospace;">
                                    <div class="metric-title" style="font-size: 10px; color: #94a3b8;">Peak Amplitude [Min / Max]</div>
                                    <div class="metric-value" id="metricMinMax" style="font-size: 14px; color: #00ffcc; margin-top: 4px;">0.00 / 0.00</div>
                                </div>
                                <div class="metric-card" style="background: rgba(0, 255, 204, 0.03); border: 1px solid rgba(0, 255, 204, 0.2); padding: 10px; font-family: monospace;">
                                    <div class="metric-title" style="font-size: 10px; color: #94a3b8;">Spatial Z-Slice Filter</div>
                                    <input type="range" id="zSliceRange" min="0" max="31" value="0" style="width: 100%; accent-color: #00ffcc; margin-top: 8px;">
                                    <div style="font-size: 0.7rem; color: #94a3b8; margin-top: 4px;">Index: <span id="zSliceVal">0</span> / 31</div>
                                </div>
                            </div>

                            <!-- Main Matrix Grid Viewport -->
                            <div class="matrix-viewport" style="flex-grow: 1; overflow-x: auto;">
                                <table class="matrix-grid" id="matrix-table" style="border-collapse: collapse; font-family: monospace; font-size: 11px; color: #00ffcc; width: 100%;">
                                    <!-- Populated dynamically via RawMatrixViewer -->
                                </table>
                            </div>
                        </div>
                    </div>

                        <!-- CH-04 Placeholder View Container (Extensibility ready for future modules) -->
                        <div id="view-CH-04" class="channel-view" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #00ffcc66; font-family: monospace; letter-spacing: 2px;">
                                [ CH-04: RESERVED / UNIMPLEMENTED ]
                            </div>
                        </div>

                    </div>
                </div>

                <!-- BOTTOM CHANNEL NAVIGATION BAR -->
                <div style="height: 48px; border-top: 1.5px solid #00ffcc33; display: flex; align-items: center; justify-content: center; gap: 10px; background: #050808;">
                    <button class="channel-btn" data-channel="CH-01" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 6px 16px; font-family: monospace; cursor: pointer;">CH-01</button>
                    <button class="channel-btn" data-channel="CH-02" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 6px 16px; font-family: monospace; cursor: pointer;">CH-02</button>
                    <button class="channel-btn" data-channel="CH-03" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 6px 16px; font-family: monospace; cursor: pointer;">CH-03</button>
                    <button class="channel-btn" data-channel="CH-04" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 6px 16px; font-family: monospace; cursor: pointer;">CH-04</button>
                    <!-- FUTURE CHANNELS: Add new button elements here following data-channel="CH-XX" -->
                </div>

            </div>
        `;
    }

    /**
     * Binds click handlers to the bottom channel buttons for seamless switching.
     */
    bindNavigationEvents() {
        const buttons = this.container.querySelectorAll('.channel-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetChannel = e.target.getAttribute('data-channel');
                this.switchChannel(targetChannel);

                // Update active button visual feedback styling
                // Update active button visual feedback styling
                buttons.forEach(b => {
                    b.style.background = 'transparent';
                    b.style.borderColor = '#00ffcc';
                });
                e.target.style.background = '#00ffcc22';
                e.target.style.borderColor = '#00ffcc';
            });
        });
    }

    /**
     * Core channel switching router. Manages visibility toggles, header titles,
     * and safe instantiation or triggering of channel viewers.
     */
    async switchChannel(channelId) {
        // 1. Hide all channel view containers
        this.container.querySelectorAll('.channel-view').forEach(el => {
            el.style.display = 'none';
        });

        // 2. Select the target view container
        const activeView = this.container.querySelector(`#view-${channelId}`);
        const titleEl = this.container.querySelector('#channelTitle');

        if (activeView) {
            activeView.style.display = 'block';

            // 3. Update top banner title and initialize respective channel module
            switch (channelId) {
                case 'CH-01':
                    if (titleEl) titleEl.textContent = "CH-01: OSCILLOSCOPE (2D)";
                    this.initChannel01(activeView);
                    break;
                case 'CH-02':
                    if (titleEl) titleEl.textContent = "CH-02: TOPOLOGICAL LATTICE (3D)";
                    this.initChannel02(activeView);
                    break;
                case 'CH-03':
                    if (titleEl) titleEl.textContent = "CH-03: RAW MATRIX STREAM";
                    this.initChannel03(activeView);
                    break;
                case 'CH-04':
                    if (titleEl) titleEl.textContent = "CH-04: [ UNIMPLEMENTED ]";
                    this.activeViewer = null;
                    break;
                default:
                    if (titleEl) titleEl.textContent = `UNKNOWN CHANNEL: ${channelId}`;
            }
        }
    }

    /**
     * CH-01 Initialization Logic (Oscilloscope View)
     */
    initChannel01(activeView) {
        const containerEl = activeView.querySelector('#oscilloscope-container');
        if (containerEl && typeof OscilloscopeViewer !== 'undefined') {
            if (!this.oscViewer) {
                this.oscViewer = new OscilloscopeViewer(containerEl);
                if (typeof this.oscViewer.connect === 'function') {
                    this.oscViewer.connect('/ws/oscilloscope');
                }
            } else {
                if (typeof this.oscViewer.resize === 'function') this.oscViewer.resize();
            }
            this.activeViewer = this.oscViewer;
        }
    }

    /**
     * CH-02 Initialization Logic (Topological Lattice 3D View)
     */
    initChannel02(activeView) {
        const canvasEl = activeView.querySelector('#canvas-CH-02');
        if (canvasEl && typeof TopologyMeshViewer !== 'undefined') {
            if (!this.meshViewer) {
                this.meshViewer = new TopologyMeshViewer(canvasEl);
                if (typeof this.meshViewer.connect === 'function') {
                    this.meshViewer.connect('/ws/telemetry');
                }
            } else {
                if (typeof this.meshViewer.resize === 'function') this.meshViewer.resize();
            }
            this.activeViewer = this.meshViewer;
        }
    }

    /**
     * CH-03 Initialization Logic (Raw Matrix / Tensor Inspector View)
     */
    initChannel03(activeView) {
        const matrixTableEl = activeView.querySelector('#matrix-table');
        if (matrixTableEl && typeof RawMatrixViewer !== 'undefined') {
            if (!this.matrixViewer) {
                this.matrixViewer = new RawMatrixViewer(matrixTableEl, {
                    normEl: activeView.querySelector('#metricNorm'),
                    traceEl: activeView.querySelector('#metricTrace'),
                    sparsityEl: activeView.querySelector('#metricSparsity'),
                    minMaxEl: activeView.querySelector('#metricMinMax'),
                    zValEl: activeView.querySelector('#zSliceVal')
                });

                if (typeof this.matrixViewer.connect === 'function') {
                    this.matrixViewer.connect('/ws/telemetry');
                }

                const zSlider = activeView.querySelector('#zSliceRange');
                if (zSlider) {
                    zSlider.addEventListener('input', (e) => {
                    this.matrixViewer.setZSlice(parseInt(e.target.value, 10));
                    });
                }

                const hexBtn = activeView.querySelector('#formatHexBtn');
                const floatBtn = activeView.querySelector('#formatFloatBtn');
                const sciBtn = activeView.querySelector('#formatSciBtn');

                if (hexBtn) hexBtn.addEventListener('click', () => this.matrixViewer.setFormat('hex'));
                if (floatBtn) floatBtn.addEventListener('click', () => this.matrixViewer.setFormat('float'));
                if (sciBtn) sciBtn.addEventListener('click', () => this.matrixViewer.setFormat('scientific'));
            }

            if (this.matrixViewer.currentData && typeof this.matrixViewer.renderGrid === 'function') {
                this.matrixViewer.renderGrid(this.matrixViewer.currentData);
            }

            this.activeViewer = this.matrixViewer;
        }
    }
}