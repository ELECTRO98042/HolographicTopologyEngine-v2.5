export class PhaseSpaceViewer {
    constructor(container) {
        this.container = container;
        this.ws = null;
        this.currentData = null;
        this.isAlternateShader = false;
        this.animFrameId = null;

        this.renderLayout();
        this.bindEvents();
        this.startLoop();
    }

    renderLayout() {
        this.container.innerHTML = `
            <div class="matrix-app-container" style="display: flex; flex-direction: column; height: 100%; width: 100%; padding: 15px; box-sizing: border-box; background: #050808; font-family: 'Courier New', Courier, monospace; color: #00ffcc;">
                
                <!-- Top Header & Toolbar -->
                <div class="matrix-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #00ffcc33; padding-bottom: 10px;">
                    <div style="font-size: 13px; letter-spacing: 2px; color: #00ffcc;">
                        CH-04 // PHASE-SPACE RECONSTRUCTOR // INVARIANT LAB
                    </div>
                    <div class="controls-toolbar" style="display: flex; gap: 8px;">
                        <span style="font-size: 11px; align-self: center; color: #00ffcc88; letter-spacing: 1px;">MODE:</span>
                        <button class="hud-btn active" id="psModeAttractor" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 4px 10px; font-family: monospace; cursor: pointer;">ATTRACTOR</button>
                        <button class="hud-btn" id="psModePoincare" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 4px 10px; font-family: monospace; cursor: pointer;">POINCARÉ</button>
                    </div>
                </div>

                <!-- Main Workspace Body -->
                <div style="display: flex; flex: 1; gap: 20px; overflow: hidden;">
                    
                    <!-- Left Sidebar: Metrics & Controls -->
                    <div style="width: 260px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; overflow-y: auto; padding-right: 5px;">
                        
                        <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                            <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Phase Volume</div>
                            <div id="psMetricVolume" style="font-size: 16px; color: #ff00ff; font-weight: bold; margin-top: 4px;">1.4142</div>
                        </div>
                        <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                            <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Lyapunov Exponent</div>
                            <div id="psMetricLyapunov" style="font-size: 16px; color: #ff00ff; font-weight: bold; margin-top: 4px;">+0.0384</div>
                        </div>
                        <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                            <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Trajectory Divergence</div>
                            <div id="psMetricDivergence" style="font-size: 16px; color: #00ffcc; font-weight: bold; margin-top: 4px;">0.00%</div>
                        </div>

                        <!-- Dimension Slice Slicer -->
                        <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                            <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px; margin-bottom: 6px;">Momentum Vector Filter</div>
                            <input type="range" id="psMomentumRange" min="0" max="100" value="50" style="width: 100%; accent-color: #00ffcc; cursor: pointer;">
                            <div id="psMomentumVal" style="font-size: 11px; color: #ff00ff; margin-top: 4px;">Vector: 1.000</div>
                        </div>

                        <!-- Shader Toggle -->
                        <div style="background: #ff00ff08; border: 1px solid #ff00ff44; padding: 10px;">
                            <div style="font-size: 10px; color: #ff00ffaa; letter-spacing: 1px; margin-bottom: 6px;">Phase Shader Mode</div>
                            <button id="psShaderToggle" style="width: 100%; background: transparent; border: 1px solid #ff00ff; color: #ff00ff; padding: 6px; font-family: monospace; font-size: 11px; cursor: pointer; letter-spacing: 1px;">Shader: Vector Field (A)</button>
                        </div>

                    </div>

                    <!-- Right Viewport: Canvas Phase Plotter -->
                    <div style="flex: 1; background: #020404; border: 1px solid #00ffcc33; position: relative; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                        <canvas id="phaseCanvas" style="width: 100%; height: 100%; display: block;"></canvas>
                    </div>

                </div>
            </div>
        `;

        this.canvas = this.container.querySelector('#phaseCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        const toggleBtn = this.container.querySelector('#psShaderToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.isAlternateShader = !this.isAlternateShader;
                toggleBtn.textContent = this.isAlternateShader ? 'Shader: Phase Density (B)' : 'Shader: Vector Field (A)';
            });
        }
    }

    startLoop() {
        const loop = () => {
            this.renderTrajectory(this.currentData);
            this.animFrameId = requestAnimationFrame(loop);
        };
        this.animFrameId = requestAnimationFrame(loop);
    }

    update(data) {
        // Just store the buffer; rendering happens on rAF tick
        this.currentData = data;
    }

    renderTrajectory(data) {
        if (!this.ctx || !this.canvas) return;
        const width = this.canvas.width / window.devicePixelRatio;
        const height = this.canvas.height / window.devicePixelRatio;

        this.ctx.fillStyle = '#020404';
        this.ctx.fillRect(0, 0, width, height);

        // Draw dynamic phase portrait curves
        this.ctx.strokeStyle = '#00ffcc';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();

        const len = data ? data.length : 100;
        const cx = width / 2;
        const cy = height / 2;
        const now = Date.now() * 0.001;

        for (let i = 0; i < len; i++) {
            const val = data ? data[i] : 0;
            const angle = (i / len) * Math.PI * 8 + now;
            const r = (Math.abs(val) * 150) + (i * 0.5);

            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle * 0.7) * (r * 0.6);

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();

        // Overlay secondary magenta attractor trace
        this.ctx.strokeStyle = '#ff00ff88';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        for (let i = 0; i < len; i += 2) {
            const val = data ? data[i] : 0;
            const angle = (i / len) * Math.PI * 6 - (now * 0.8);
            const r = (Math.abs(val) * 120);
            const x = cx + Math.sin(angle) * r;
            const y = cy + Math.cos(angle * 1.2) * r;

            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        }
        this.ctx.stroke();
    }

    connect(url = '/ws/phasespace') {
        if (this.ws) {
            this.ws.onclose = null;
            this.ws.close();
        }

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;

        console.log(`[CH-04] Connecting to Phase Space telemetry stream: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => console.log("[CH-04] WebSocket connected successfully.");
        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                this.update(new Float32Array(event.data));
            }
        };
        this.ws.onerror = (error) => console.error("[CH-04] WebSocket error:", error);
        this.ws.onclose = () => {
            console.warn("[CH-04] WebSocket disconnected. Reconnecting...");
            setTimeout(() => this.connect(url), 3000);
        };
    }

    resize() {
        this.resizeCanvas();
    }

    destroy() {
        if (this.animFrameId) {
            cancelAnimationFrame(this.animFrameId);
        }
        if (this.ws) {
            this.ws.close();
        }
    }
}

if (typeof window !== 'undefined') {
    window.PhaseSpaceViewer = PhaseSpaceViewer;
}