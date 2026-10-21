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
                        <div id="view-CH-03" class="channel-view" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0; overflow-y: auto; background: #050808;">
                            <div id="tensorMatrixContainer" style="width: 100%; height: 100%; position: relative; padding: 20px;"></div>
                        </div>

                        <!-- CH-04 Phase-Space Reconstructor View Container -->
                        <div id="view-CH-04" class="channel-view" style="display: none; width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
                            <div id="phaseSpaceContainer" style="width: 100%; height: 100%; position: relative;"></div>
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
                    if (titleEl) titleEl.textContent = "CH-04: PHASE SPACE CONSTRUCTOR";
                    this.initChannel04(activeView);
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

    /*** CH-03 Initialization Logic (Raw Matrix / Tensor Inspector View**/
    initChannel03(activeView) {
        const container = activeView.querySelector('#tensorMatrixContainer');
        if (container && typeof RawMatrixViewer !== 'undefined') {
            if (!this.matrixViewer) {
                this.matrixViewer = new RawMatrixViewer(container);
                this.matrixViewer.connect('/ws/telemetry');
            }
        } else if (typeof this.matrixViewer.renderGrid === 'function' && this.matrixViewer.currentData) {
            this.matrixViewer.renderGrid(this.matrixViewer.currentData);
        }
        this.activeViewer = this.matrixViewer;
    }

    /*** CH-04 Initialization Logic (Phase Space Reconstructor View)***/
    initChannel04(activeView) {
        const container = activeView.querySelector('#phaseSpaceContainer');
        if (container && typeof PhaseSpaceViewer !== 'undefined') {
            if (!this.phaseViewer) {
                this.phaseViewer = new PhaseSpaceViewer(container);
                this.phaseViewer.connect('/ws/phasespace');
            } else if (typeof this.phaseViewer.resize === 'function') {
                this.phaseViewer.resize();
            }
        }
        this.activeViewer = this.phaseViewer;
    }
}