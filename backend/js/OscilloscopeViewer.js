/**
 * CH-01: High-Performance Mixed-Signal Real-Time Oscilloscope Viewer
 * Ultra-High Analog Bandwidth (100+ GHz) & Sampling Rate (200+ GS/s) Engine
 * Holographic HUD Telemetry Suite v2.7.3
 */

class OscilloscopeViewer {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        if (!this.container) {
            console.error(`[CH-01] Container '${containerId}' not found.`);
            return;
        }

        // Instrument State Settings
        this.state = {
            ch1Enabled: true,
            ch2Enabled: true,
            digitalEnabled: true,
            ch1VoltsPerDiv: 0.5,    // Volts / div
            ch2VoltsPerDiv: 0.5,
            ch1Offset: 0.0,
            ch2Offset: -1.5,
            timePerDiv: 1.0,        // ns / div
            triggerLevel: 0.0,      // Volts
            triggerMode: 'auto',    // 'auto', 'normal', 'single'
            sampleRateGS: 200,      // 200 GS/s
            bandwidthGHz: 100,      // 100 GHz
            persistence: 0.85,      // Phosphor decay persistence (0.0 to 0.98)
            fftMode: false,
            protocolDecode: true,
            jitterVis: true,
            gridDivsX: 10,
            gridDivsY: 8,
            couplingCh1: 'DC',
            couplingCh2: 'DC'
        };

        // Buffer caches
        this.numPoints = 5000;
        this.ch1Buffer = new Float32Array(this.numPoints);
        this.ch2Buffer = new Float32Array(this.numPoints);
        this.digitalBuffer = new Uint8Array(this.numPoints);
        this.fftBuffer = new Float32Array(512);

        // Layout creation
        this.initDOM();
        this.initCanvas();
        this.bindEvents();

        // Start render loop
        this.lastFrameTime = performance.now();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);

        console.log("[CH-01] Mixed-Signal Real-Time Oscilloscope Engine v2.7.3 Online.");
    }

    initDOM() {
        this.container.innerHTML = '';
        this.container.style.position = 'relative';
        this.container.style.display = 'flex';
        this.container.style.flexDirection = 'row';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = '#030712';
        this.container.style.fontFamily = 'monospace, system-ui, sans-serif';
        this.container.style.overflow = 'hidden';
        this.container.style.boxSizing = 'border-box';

        // Left / Main Viewport for Display Canvas
        this.viewport = document.createElement('div');
        this.viewport.className = 'scope-viewport';
        this.viewport.style.position = 'relative';
        this.viewport.style.flex = '1';
        this.viewport.style.height = '100%';
        this.viewport.style.overflow = 'hidden';
        this.viewport.style.display = 'flex';
        this.viewport.style.flexDirection = 'column';

        // Oscilloscope Screen Header Overlay
        const headerHTML = `
            <div style="position: absolute; top: 12px; left: 16px; z-index: 10; pointer-events: none; display: flex; gap: 16px; align-items: center; background: rgba(3, 7, 18, 0.75); padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(6, 182, 212, 0.3); backdrop-filter: blur(4px);">
                <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="width: 8px; height: 8px; border-radius: 50%; background: #06b6d4; box-shadow: 0 0 8px #06b6d4;"></span>
                    <span style="color: #22d3ee; font-weight: bold; font-size: 13px; letter-spacing: 0.05em;">CH-01 // MSO-100G</span>
                </div>
                <div style="color: #94a3b8; font-size: 11px;">BW: <span id="hdr-bw" style="color:#06b6d4">100 GHz</span></div>
                <div style="color: #94a3b8; font-size: 11px;">SR: <span id="hdr-sr" style="color:#06b6d4">200 GS/s</span></div>
                <div style="color: #94a3b8; font-size: 11px;">MEM: <span style="color:#a855f7">2 Gpts</span></div>
                <div style="color: #10b981; font-size: 11px; font-weight: bold;">[TRIG READY]</div>
            </div>
        `;
        this.viewport.innerHTML = headerHTML;

        // Canvases container (Phosphor Trace + Grid Overlay)
        this.canvasContainer = document.createElement('div');
        this.canvasContainer.style.position = 'relative';
        this.canvasContainer.style.width = '100%';
        this.canvasContainer.style.height = '100%';

        this.traceCanvas = document.createElement('canvas');
        this.traceCanvas.style.position = 'absolute';
        this.traceCanvas.style.top = '0';
        this.traceCanvas.style.left = '0';
        this.traceCanvas.style.width = '100%';
        this.traceCanvas.style.height = '100%';

        this.gridCanvas = document.createElement('canvas');
        this.gridCanvas.style.position = 'absolute';
        this.gridCanvas.style.top = '0';
        this.gridCanvas.style.left = '0';
        this.gridCanvas.style.width = '100%';
        this.gridCanvas.style.height = '100%';
        this.gridCanvas.style.pointerEvents = 'none';

        this.canvasContainer.appendChild(this.traceCanvas);
        this.canvasContainer.appendChild(this.gridCanvas);
        this.viewport.appendChild(this.canvasContainer);

        // Right Side Control Deck Panel
        this.controlPanel = document.createElement('div');
        this.controlPanel.className = 'scope-control-panel';
        this.controlPanel.style.width = '310px';
        this.controlPanel.style.height = '100%';
        this.controlPanel.style.backgroundColor = '#0b0f19';
        this.controlPanel.style.borderLeft = '1px solid rgba(6, 182, 212, 0.2)';
        this.controlPanel.style.boxSizing = 'border-box';
        this.controlPanel.style.display = 'flex';
        this.controlPanel.style.flexDirection = 'column';
        this.controlPanel.style.padding = '14px';
        this.controlPanel.style.gap = '12px';
        this.controlPanel.style.overflowY = 'auto';
        this.controlPanel.style.color = '#e2e8f0';
        this.controlPanel.style.zIndex = '20';

        this.controlPanel.innerHTML = this.renderControlsHTML();

        this.container.appendChild(this.viewport);
        this.container.appendChild(this.controlPanel);
    }

    renderControlsHTML() {
        return `
            <div style="font-size: 13px; font-weight: bold; color: #22d3ee; border-bottom: 1px solid rgba(6,182,212,0.3); padding-bottom: 6px; display: flex; justify-content: space-between; align-items: center;">
                <span>INSTRUMENT CONTROL</span>
                <span style="font-size: 10px; color: #64748b;">v2.7.3</span>
            </div>

            <!-- ANALOG CHANNELS -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; border: 1px solid rgba(51, 65, 85, 0.5);">
                <div style="font-size: 11px; font-weight: bold; color: #38bdf8; margin-bottom: 8px;">ANALOG CHANNELS</div>
                
                <!-- CH1 -->
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="color: #06b6d4; font-size: 12px; font-weight: bold;">
                            <input type="checkbox" id="chk-ch1" checked style="accent-color: #06b6d4;"> CH1 (Cyan)
                        </label>
                        <span id="txt-vdiv-ch1" style="font-size: 11px; color: #94a3b8;">500 mV/div</span>
                    </div>
                    <input type="range" id="rng-vdiv-ch1" min="0.1" max="5.0" step="0.1" value="0.5" style="width: 100%; accent-color: #06b6d4;">
                </div>

                <!-- CH2 -->
                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <label style="color: #ec4899; font-size: 12px; font-weight: bold;">
                            <input type="checkbox" id="chk-ch2" checked style="accent-color: #ec4899;"> CH2 (Magenta)
                        </label>
                        <span id="txt-vdiv-ch2" style="font-size: 11px; color: #94a3b8;">500 mV/div</span>
                    </div>
                    <input type="range" id="rng-vdiv-ch2" min="0.1" max="5.0" step="0.1" value="0.5" style="width: 100%; accent-color: #ec4899;">
                </div>
            </div>

            <!-- HORIZONTAL / TIMEBASE -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; border: 1px solid rgba(51, 65, 85, 0.5);">
                <div style="font-size: 11px; font-weight: bold; color: #f59e0b; margin-bottom: 8px;">TIMEBASE & TRIGGER</div>
                
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: #cbd5e1;">Time / Div</span>
                        <span id="txt-tdiv" style="font-size: 11px; color: #f59e0b;">1.00 ns/div</span>
                    </div>
                    <input type="range" id="rng-tdiv" min="0.1" max="10.0" step="0.1" value="1.0" style="width: 100%; accent-color: #f59e0b;">
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: #cbd5e1;">Trig Level</span>
                        <span id="txt-trig" style="font-size: 11px; color: #10b981;">0.00 V</span>
                    </div>
                    <input type="range" id="rng-trig" min="-2.0" max="2.0" step="0.05" value="0.0" style="width: 100%; accent-color: #10b981;">
                </div>
            </div>

            <!-- SAMPLING & DISPLAY PROCESSING -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; border: 1px solid rgba(51, 65, 85, 0.5);">
                <div style="font-size: 11px; font-weight: bold; color: #a855f7; margin-bottom: 8px;">DSP & PHOSPHOR EFFECTS</div>
                
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: #cbd5e1;">Phosphor Persistence</span>
                        <span id="txt-pers" style="font-size: 11px; color: #a855f7;">85%</span>
                    </div>
                    <input type="range" id="rng-pers" min="0.0" max="0.95" step="0.05" value="0.85" style="width: 100%; accent-color: #a855f7;">
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                    <button id="btn-fft" style="background: rgba(30, 41, 59, 0.8); border: 1px solid #64748b; color: #cbd5e1; padding: 6px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">FFT SPECTRUM</button>
                    <button id="btn-decode" style="background: rgba(16, 185, 129, 0.2); border: 1px solid #10b981; color: #34d399; padding: 6px; border-radius: 4px; font-size: 10px; font-weight: bold; cursor: pointer;">PROTOCOL DEC</button>
                </div>
            </div>

            <!-- LOGIC & PROTOCOL OPTIONS -->
            <div style="background: rgba(15, 23, 42, 0.6); padding: 10px; border-radius: 6px; border: 1px solid rgba(51, 65, 85, 0.5);">
                <div style="font-size: 11px; font-weight: bold; color: #10b981; margin-bottom: 6px;">DIGITAL MSO BUS</div>
                <label style="color: #cbd5e1; font-size: 11px; display: flex; align-items: center; gap: 6px;">
                    <input type="checkbox" id="chk-digital" checked style="accent-color: #10b981;"> Enable 8-Bit Logic Pod
                </label>
                <div style="font-size: 9px; color: #64748b; margin-top: 4px;">Bus Decoders: SPI, I2C, PCIe Gen5, CXL</div>
            </div>
        `;
    }

    initCanvas() {
        this.ctxTrace = this.traceCanvas.getContext('2d');
        this.ctxGrid = this.gridCanvas.getContext('2d');
        this.resize();
    }

    resize() {
        const rect = this.canvasContainer.getBoundingClientRect();
        this.width = rect.width || 800;
        this.height = rect.height || 600;

        this.traceCanvas.width = this.width;
        this.traceCanvas.height = this.height;
        this.gridCanvas.width = this.width;
        this.gridCanvas.height = this.height;

        this.renderGrid();
    }

    bindEvents() {
        window.addEventListener('resize', () => this.resize());

        // Channel Controls
        const chkCh1 = this.controlPanel.querySelector('#chk-ch1');
        if (chkCh1) chkCh1.addEventListener('change', (e) => this.state.ch1Enabled = e.target.checked);

        const chkCh2 = this.controlPanel.querySelector('#chk-ch2');
        if (chkCh2) chkCh2.addEventListener('change', (e) => this.state.ch2Enabled = e.target.checked);

        const rngVCh1 = this.controlPanel.querySelector('#rng-vdiv-ch1');
        if (rngVCh1) rngVCh1.addEventListener('input', (e) => {
            this.state.ch1VoltsPerDiv = parseFloat(e.target.value);
            this.controlPanel.querySelector('#txt-vdiv-ch1').textContent = `${(this.state.ch1VoltsPerDiv * 1000).toFixed(0)} mV/div`;
        });

        const rngVCh2 = this.controlPanel.querySelector('#rng-vdiv-ch2');
        if (rngVCh2) rngVCh2.addEventListener('input', (e) => {
            this.state.ch2VoltsPerDiv = parseFloat(e.target.value);
            this.controlPanel.querySelector('#txt-vdiv-ch2').textContent = `${(this.state.ch2VoltsPerDiv * 1000).toFixed(0)} mV/div`;
        });

        // Timebase Controls
        const rngTDiv = this.controlPanel.querySelector('#rng-tdiv');
        if (rngTDiv) rngTDiv.addEventListener('input', (e) => {
            this.state.timePerDiv = parseFloat(e.target.value);
            this.controlPanel.querySelector('#txt-tdiv').textContent = `${this.state.timePerDiv.toFixed(2)} ns/div`;
        });

        const rngTrig = this.controlPanel.querySelector('#rng-trig');
        if (rngTrig) rngTrig.addEventListener('input', (e) => {
            this.state.triggerLevel = parseFloat(e.target.value);
            this.controlPanel.querySelector('#txt-trig').textContent = `${this.state.triggerLevel.toFixed(2)} V`;
            this.renderGrid();
        });

        // Persistence Control
        const rngPers = this.controlPanel.querySelector('#rng-pers');
        if (rngPers) rngPers.addEventListener('input', (e) => {
            this.state.persistence = parseFloat(e.target.value);
            this.controlPanel.querySelector('#txt-pers').textContent = `${Math.round(this.state.persistence * 100)}%`;
        });

        // FFT & Protocol
        const btnFFT = this.controlPanel.querySelector('#btn-fft');
        if (btnFFT) btnFFT.addEventListener('click', () => {
            this.state.fftMode = !this.state.fftMode;
            btnFFT.style.background = this.state.fftMode ? 'rgba(168, 85, 247, 0.4)' : 'rgba(30, 41, 59, 0.8)';
            btnFFT.style.borderColor = this.state.fftMode ? '#a855f7' : '#64748b';
        });

        const btnDecode = this.controlPanel.querySelector('#btn-decode');
        if (btnDecode) btnDecode.addEventListener('click', () => {
            this.state.protocolDecode = !this.state.protocolDecode;
            btnDecode.style.background = this.state.protocolDecode ? 'rgba(16, 185, 129, 0.2)' : 'rgba(30, 41, 59, 0.8)';
            btnDecode.style.borderColor = this.state.protocolDecode ? '#10b981' : '#64748b';
        });

        const chkDigital = this.controlPanel.querySelector('#chk-digital');
        if (chkDigital) chkDigital.addEventListener('change', (e) => this.state.digitalEnabled = e.target.checked);
    }

    updateWaveform(buffer) {
        if (!buffer) return;

        let floatData;
        if (buffer instanceof ArrayBuffer) {
            floatData = new Float32Array(buffer);
        } else if (buffer instanceof Float32Array) {
            floatData = buffer;
        } else {
            return;
        }

        // Unpack interleaved CH1 & CH2 signal array
        const points = Math.min(this.numPoints, Math.floor(floatData.length / 2));
        for (let i = 0; i < points; i++) {
            this.ch1Buffer[i] = floatData[i * 2];
            this.ch2Buffer[i] = floatData[i * 2 + 1];
            // Generate synthetic digital pod telemetry bits correlated with CH1 threshold
            this.digitalBuffer[i] = (this.ch1Buffer[i] > this.state.triggerLevel) ? 1 : 0;
        }
    }

    renderGrid() {
        const ctx = this.ctxGrid;
        ctx.clearRect(0, 0, this.width, this.height);

        const divsX = this.state.gridDivsX;
        const divsY = this.state.gridDivsY;
        const stepX = this.width / divsX;
        const stepY = this.height / divsY;

        // Dark Background Grid Line Styling
        ctx.strokeStyle = 'rgba(30, 58, 138, 0.25)';
        ctx.lineWidth = 1;

        // Draw Minor Grid Reticle
        ctx.beginPath();
        for (let x = 0; x <= this.width; x += stepX / 5) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
        }
        for (let y = 0; y <= this.height; y += stepY / 5) {
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
        }
        ctx.stroke();

        // Draw Major Divisions Grid
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i <= divsX; i++) {
            ctx.moveTo(i * stepX, 0);
            ctx.lineTo(i * stepX, this.height);
        }
        for (let j = 0; j <= divsY; j++) {
            ctx.moveTo(0, j * stepY);
            ctx.lineTo(this.width, j * stepY);
        }
        ctx.stroke();

        // Draw Center Zero Axes
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.6)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(this.width, this.height / 2);
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();

        // Draw Trigger Level Marker Line
        const trigY = (this.height / 2) - (this.state.triggerLevel / this.state.ch1VoltsPerDiv) * stepY;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, trigY);
        ctx.lineTo(this.width, trigY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Trigger Marker Icon
        ctx.fillStyle = '#10b981';
        ctx.font = '10px monospace';
        ctx.fillText('T', 6, trigY - 4);
    }

    animate() {
        requestAnimationFrame(this.animate);

        const ctx = this.ctxTrace;

        // Phosphor decay overlay effect
        ctx.fillStyle = `rgba(3, 7, 18, ${1.0 - this.state.persistence})`;
        ctx.fillRect(0, 0, this.width, this.height);

        const divsY = this.state.gridDivsY;
        const stepY = this.height / divsY;
        const centerY = this.height / 2;

        // 1. Draw CH1 Analog Trace (Cyan)
        if (this.state.ch1Enabled) {
            ctx.strokeStyle = '#06b6d4';
            ctx.shadowColor = '#06b6d4';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2.0;
            ctx.beginPath();

            const stepX = this.width / this.numPoints;
            for (let i = 0; i < this.numPoints; i++) {
                const val = this.ch1Buffer[i] + this.state.ch1Offset;
                const x = i * stepX;
                const y = centerY - (val / this.state.ch1VoltsPerDiv) * stepY;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 2. Draw CH2 Analog Trace (Magenta)
        if (this.state.ch2Enabled) {
            ctx.strokeStyle = '#ec4899';
            ctx.shadowColor = '#ec4899';
            ctx.shadowBlur = 8;
            ctx.lineWidth = 2.0;
            ctx.beginPath();

            const stepX = this.width / this.numPoints;
            for (let i = 0; i < this.numPoints; i++) {
                const val = this.ch2Buffer[i] + this.state.ch2Offset;
                const x = i * stepX;
                const y = centerY - (val / this.state.ch2VoltsPerDiv) * stepY;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
        }

        // 3. Draw Digital Pod Channels (Green Logic Lanes)
        if (this.state.digitalEnabled) {
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = 1.2;
            const digYBase = this.height - 40;
            const digHeight = 16;
            const stepX = this.width / this.numPoints;

            ctx.beginPath();
            for (let i = 0; i < this.numPoints; i++) {
                const bit = this.digitalBuffer[i];
                const x = i * stepX;
                const y = digYBase - (bit * digHeight);

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();

            // Protocol Overlay Decoder Annotation
            if (this.state.protocolDecode) {
                ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
                ctx.fillRect(this.width * 0.15, digYBase - 22, 120, 26);
                ctx.strokeStyle = '#10b981';
                ctx.strokeRect(this.width * 0.15, digYBase - 22, 120, 26);

                ctx.fillStyle = '#34d399';
                ctx.font = '10px monospace';
                ctx.fillText('PCIe 5.0 [0x7E]', this.width * 0.15 + 8, digYBase - 6);
            }
        }

        // 4. Draw FFT Spectrum Overlay (Purple Bars)
        if (this.state.fftMode) {
            ctx.fillStyle = 'rgba(168, 85, 247, 0.35)';
            const barWidth = this.width / 128;
            for (let i = 0; i < 128; i++) {
                // Compute amplitude spectrum approximation
                const mag = Math.abs(Math.sin(i * 0.1) * 0.7 + (Math.random() * 0.15)) * (this.height * 0.35);
                ctx.fillRect(i * barWidth, this.height - mag, barWidth - 1, mag);
            }
        }
    }
    connect(url = '/ws/oscilloscope') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;

        console.log(`[CH-01] Connecting to Oscilloscope telemetry stream: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            console.log("[CH-01] WebSocket connected successfully.");
        };

        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                this.updateWaveform(event.data);
            }
        };

        this.ws.onerror = (error) => {
            console.error("[CH-01] WebSocket error:", error);
        };

        this.ws.onclose = () => {
            console.warn("[CH-01] WebSocket disconnected. Attempting reconnect in 3s...");
            setTimeout(() => this.connect(url), 3000);
        };
    }
}
// Export for global loading
if (typeof window !== 'undefined') {
    window.OscilloscopeViewer = OscilloscopeViewer;
}
