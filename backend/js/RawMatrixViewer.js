export class RawMatrixViewer {
    constructor(container) {
        this.container = container;
        this.currentData = null;
        this.gridSize = 32;
        this.isHueMode = true; // true = Option B (Full Hue Heatmap), false = Option A (Monochrome Depth Sweep)

        this.renderLayout(); // <-- Add this here!
        this.initListeners();
    }
    renderLayout() {
        this.container.innerHTML = `
        <div class="matrix-app-container" style="display: flex; flex-direction: column; height: 100%; width: 100%; padding: 15px; box-sizing: border-box; background: #050808; font-family: 'Courier New', Courier, monospace; color: #00ffcc;">
            
            <!-- Top Header & Format Toolbar -->
            <div class="matrix-header" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #00ffcc33; padding-bottom: 10px;">
                <div style="font-size: 13px; letter-spacing: 2px; color: #00ffcc;">
                    CH-03 // TENSOR MATRIX INSPECTOR // INVARIANT LAB
                </div>
                <div class="controls-toolbar" style="display: flex; gap: 8px;">
                    <span style="font-size: 11px; align-self: center; color: #ff00ff; letter-spacing: 1px;">FORMAT:</span>
                    <button class="hud-btn active" id="formatHex" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 4px 10px; font-family: monospace; cursor: pointer;">HEX</button>
                    <button class="hud-btn" id="formatFloatBtn" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 4px 10px; font-family: monospace; cursor: pointer;">FLOAT32</button>
                    <button class="hud-btn" id="formatSciBtn" style="background: transparent; border: 1px solid #00ffcc; color: #00ffcc; padding: 4px 10px; font-family: monospace; cursor: pointer;">SCIENTIFIC</button>
                </div>
            </div>

            <!-- Main Workspace Body -->
            <div style="display: flex; flex: 1; gap: 20px; overflow: hidden;">
                
                <!-- Left Sidebar: Metrics & Reordered Controls -->
                <div style="width: 260px; display: flex; flex-direction: column; gap: 12px; flex-shrink: 0; overflow-y: auto; padding-right: 5px;">
                    
                    <!-- Metric Cards -->
                    <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                        <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Frobenius Norm</div>
                        <div id="metricNorm" style="font-size: 16px; color: #ff00ff; font-weight: bold; margin-top: 4px;">0.0000</div>
                    </div>
                    <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                        <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Matrix Trace</div>
                        <div id="metricTrace" style="font-size: 16px; color: #ff00ff; font-weight: bold; margin-top: 4px;">0.0000</div>
                    </div>
                    <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                        <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Sparsity Density</div>
                        <div id="metricSparsity" style="font-size: 16px; color: #00ffcc; font-weight: bold; margin-top: 4px;">0.0%</div>
                    </div>
                    <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                        <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px;">Peak Amplitude (Min / Max)</div>
                        <div id="metricMinMax" style="font-size: 14px; color: #ff00ff; font-weight: bold; margin-top: 4px;">0.00 / 0.00</div>
                    </div>

                    <!-- Spatial Z-Slice Filter -->
                    <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                        <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px; margin-bottom: 6px;">Spatial Z-Slice Filter</div>
                        <input type="range" id="zSlicerRange" min="0" max="31" value="0" style="width: 100%; accent-color: #00ffcc; cursor: pointer;">
                        <div id="zSliceVal" style="font-size: 11px; color: #ff00ff; margin-top: 4px;">Index: 0 / 31</div>
                    </div>

                    <!-- A/B Mode Toggle Button (Relocated) -->
                    <div style="background: #ff00ff08; border: 1px solid #ff00ff44; padding: 10px;">
                        <div style="font-size: 10px; color: #ff00ffaa; letter-spacing: 1px; margin-bottom: 6px;">Visual Shader Mode</div>
                        <button id="modeToggleBtn" style="width: 100%; background: transparent; border: 1px solid #ff00ff; color: #ff00ff; padding: 6px; font-family: monospace; font-size: 11px; cursor: pointer; letter-spacing: 1px;">Mode: Full Hue Heatmap (B)</button>
                    </div>

                    <!-- Color Index / Legend Reference (Relocated) -->
                    <div style="background: #00ffcc08; border: 1px solid #00ffcc33; padding: 10px;">
                        <div style="font-size: 10px; color: #00ffcc88; letter-spacing: 1px; margin-bottom: 6px;">Color Index Reference</div>
                        <div style="height: 12px; width: 100%; background: linear-gradient(to right, #00b4ff, #050808, #00ffa4); border: 1px solid #00ffcc44; margin-bottom: 4px;"></div>
                        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #00ffccaa;">
                            <span>(-Neg)</span>
                            <span>(Zero)</span>
                            <span>(+Pos)</span>
                        </div>
                    </div>

                </div>

                <!-- Right Viewport: Scaled Matrix Table Grid -->
                <div style="flex: 1; background: #020404; border: 1px solid #00ffcc33; overflow: auto; display: flex; align-items: flex-start; justify-content: center; padding: 10px;">
                    <table id="matrix-table" style="border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 10.5px; text-align: center;">
                        <!-- Dynamically populated rows -->
                    </table>
                </div>

            </div>
        </div>
    `;
    }
    initListeners() {
        const slider = document.getElementById('zSlicerRange');
        if (slider) {
            slider.addEventListener('input', (e) => {
                this.setZSlice(parseInt(e.target.value, 10));
            });
        }

        const modeBtn = document.getElementById('modeToggleBtn');
        if (modeBtn) {
            modeBtn.addEventListener('click', () => {
                this.toggleColorMode();
                modeBtn.textContent = this.isHueMode
                    ? 'Mode: Full Hue Heatmap (B)'
                    : 'Mode: Monochrome Sweep (A)';
            });
        }
    }

    toggleColorMode() {
        this.isHueMode = !this.isHueMode;
        if (this.currentData) {
            this.renderGrid(this.currentData);
        }
    }

    update(float32Array) {
        const sliceSize = this.gridSize * this.gridSize; // 1024 elements per slice
        const multiSliceData = new Float32Array(sliceSize * 32);

        // Generate phase-shifted modulation across 32 Z-slices
        for (let i = 0; i < 32; i++) {
            const phaseShift = (i / 32) * Math.PI * 2;
            for (let j = 0; j < float32Array.length; j++) {
                const targetIdx = i * sliceSize + (j % sliceSize);
                multiSliceData[targetIdx] = float32Array[j % float32Array.length] * Math.cos(phaseShift + (j * 0.005));
            }
        }

        this.currentData = multiSliceData;
        this.computeInvariants(this.currentData);
        this.renderGrid(this.currentData);
    }

    computeInvariants(data) {
        let frobeniusSum = 0;
        let trace = 0;
        let zeros = 0;
        let min = Infinity;
        let max = -Infinity;

        const sliceSize = this.gridSize * this.gridSize;
        const slider = document.getElementById('zSlicerRange');
        const currentZ = slider ? parseInt(slider.value, 10) : 0;
        const startIdx = currentZ * sliceSize;
        const endIdx = Math.min(startIdx + sliceSize, data.length);

        for (let i = startIdx; i < endIdx; i++) {
            const val = data[i];
            frobeniusSum += val * val;
            if ((i - startIdx) % (this.gridSize + 1) === 0) {
                trace += val;
            }
            if (Math.abs(val) < 1e-5) zeros++;
            if (val < min) min = val;
            if (val > max) max = val;
        }

        const frobNorm = Math.sqrt(frobeniusSum);
        const sparsity = (zeros / sliceSize) * 100;

        const mNorm = document.getElementById('metricNorm');
        const mTrace = document.getElementById('metricTrace');
        const mSparsity = document.getElementById('metricSparsity');
        const mMinMax = document.getElementById('metricMinMax');

        if (mNorm) mNorm.innerText = frobNorm.toFixed(4);
        if (mTrace) mTrace.innerText = trace.toFixed(4);
        if (mSparsity) mSparsity.innerText = sparsity.toFixed(1) + '%';
        if (mMinMax) mMinMax.innerText = `${min.toFixed(2)} / ${max.toFixed(2)}`;
    }

    setZSlice(z) {
        const slider = document.getElementById('zSlicerRange');
        const zValSpan = document.getElementById('zSliceVal');

        if (slider) slider.value = z;
        if (zValSpan) zValSpan.innerText = z;

        // Option A / Depth flash visual feedback on slice transition
        const tableElem = document.getElementById('matrix-table');
        if (tableElem) {
            tableElem.style.transition = 'none';
            tableElem.style.opacity = '0.4';
            requestAnimationFrame(() => {
                tableElem.style.transition = 'opacity 0.12s ease-out';
                tableElem.style.opacity = '1.0';
            });
        }

        if (this.currentData) {
            this.computeInvariants(this.currentData);
            this.renderGrid(this.currentData);
        }
    }

    renderGrid(data) {
        const table = document.getElementById('matrix-table');
        if (!table) return;

        const N = this.gridSize;
        const sliceSize = N * N;

        const slider = document.getElementById('zSlicerRange');
        const currentZ = slider ? parseInt(slider.value, 10) : 0;
        const startIdx = currentZ * sliceSize;

        let html = '';
        for (let r = 0; r < N; r++) {
            html += '<tr>';
            for (let c = 0; c < N; c++) {
                const localIdx = r * N + c;
                const dataIdx = startIdx + localIdx;
                const val = data[dataIdx] !== undefined ? data[dataIdx] : 0.0;
                const formattedVal = val.toFixed(3);

                let bgStyle = '';
                const normVal = Math.max(-1, Math.min(1, val / 2.0)); // Normalize amplitude between -1 and 1

                if (this.isHueMode) {
                    // Option B: Full Multi-Color Hue Heatmap (Cyan for negative, Emerald for positive)
                    if (normVal > 0) {
                        bgStyle = `background-color: rgba(0, 255, 170, ${(normVal * 0.42).toFixed(2)});`;
                    } else if (normVal < 0) {
                        bgStyle = `background-color: rgba(0, 180, 255, ${(Math.abs(normVal) * 0.42).toFixed(2)});`;
                    } else {
                        bgStyle = `background-color: transparent;`;
                    }
                } else {
                    // Option A: Monochrome Depth Sweep (Single-hue intensity scaling)
                    const intensity = Math.abs(normVal) * 0.48;
                    bgStyle = `background-color: rgba(0, 255, 204, ${intensity.toFixed(2)});`;
                }

                html += `<td style="${bgStyle}; color: #ffffff; text-shadow: 0 0 2px #000000; padding: 3px 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" class="matrix-cell">${formattedVal}</td>`;
            }
            html += '</tr>';
        }
        table.innerHTML = html;
    }
    connect(url = '/ws/telemetry') {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = url.startsWith('ws') ? url : `${protocol}//${window.location.host}${url}`;

        console.log(`[CH-03] Connecting to Raw Matrix telemetry stream: ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            console.log("[CH-03] WebSocket connected successfully.");
        };

        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                const data = new Float32Array(event.data);
                this.update(data);
            }
        };

        this.ws.onerror = (error) => {
            console.error("[CH-03] WebSocket error:", error);
        };

        this.ws.onclose = () => {
            console.warn("[CH-03] WebSocket disconnected. Attempting reconnect in 3s...");
            setTimeout(() => this.connect(url), 3000);
        };
    }    
}
// Export for global loading
if (typeof window !== 'undefined') {
    window.RawMatrixViewer = RawMatrixViewer;
}
