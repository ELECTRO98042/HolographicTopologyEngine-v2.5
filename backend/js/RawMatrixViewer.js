export class RawMatrixViewer {
    constructor(container, metrics = {}) {
        this.container = container;
        this.metrics = metrics;
        this.gridSize = 32; // Default 32x32 tensor grid
        this.zSlice = 0;
        this.format = 'float'; // 'float', 'hex', 'scientific'
        this.currentData = null;
    }

    update(float32Array) {
        if (!float32Array || float32Array.length === 0) return;
        //const multiSliceData = new Float32Array(floatData.length * 32);

        const multiSliceData = new Float32Array(float32Array.length * 32);
        for (let i = 0; i < 32; i++) {
            const phaseShift = (i / 32) * Math.PI * 2;
            for (let j = 0; j < float32Array.length; j++) {
                multiSliceData[i * float32Array.length + j] = float32Array[j] * Math.cos(phaseShift);
            }
        }
        this.currentData = multiSliceData;
        //const multiSliceData = new Float32Array(float32Array.length * 32);//from this line to 5 lines below is commented out to replase with a phase-shifteed modulation loop
        //for (let i = 0; i < 32; i++) {
            //multiSliceData.set(floatData, i * floatData.length);
        //    multiSliceData.set(float32Array, i * float32Array.length);
        //}
        //this.currentData = multiSliceData;

        //this.currentData = float32Array;
        
        //this.computeInvariants(float32Array);
        //this.renderGrid(float32Array);

        this.computeInvariants(this.currentData);
        this.renderGrid(this.currentData);
    }

    computeInvariants(data) {
        let sumSquares = 0;
        let traceSum = 0;
        let nonZeroCount = 0;
        let min = Infinity;
        let max = -Infinity;

        const totalElements = data.length;
        const N = this.gridSize;

        for (let i = 0; i < totalElements; i++) {
            const val = data[i];
            sumSquares += val * val;
            if (val < min) min = val;
            if (val > max) max = val;
            if (Math.abs(val) > 0.0001) nonZeroCount++;

            // Approximate trace calculation for square blocks
            const row = Math.floor(i / N) % N;
            const col = i % N;
            if (row === col) {
                traceSum += val;
            }
        }

        const frobeniusNorm = Math.sqrt(sumSquares);
        const sparsity = ((totalElements - nonZeroCount) / totalElements) * 100;

        // Update UI metric cards if elements exist
        if (this.metrics.normEl) this.metrics.normEl.innerText = frobeniusNorm.toFixed(4);
        if (this.metrics.traceEl) this.metrics.traceEl.innerText = traceSum.toFixed(4);
        if (this.metrics.sparsityEl) this.metrics.sparsityEl.innerText = `${sparsity.toFixed(1)}%`;
        if (this.metrics.minMaxEl) this.metrics.minMaxEl.innerText = `${min.toFixed(2)} / ${max.toFixed(2)}`;
    }

    renderGrid(data) {
        if (!this.container) return;

        const N = this.gridSize;
        const sliceSize = this.gridSize * this.gridSize;
        //const totalSlices = 32; // Temporary mock value for testing UI bounds
        const totalSlices = Math.floor(data.length / sliceSize) || 1;
        const sliderEl = document.getElementById('zSlicerRange');
        if (sliderEl) {
            sliderEl.max = totalSlices - 1;
        }
        const safeSlice = this.zSlice % totalSlices;
        const startIdx = safeSlice * sliceSize;
        const endIdx = Math.min(startIdx + sliceSize, data.length);

        let html = '';
        for (let i = startIdx; i < endIdx; i++) {
            const localIdx = i - startIdx;
            const row = Math.floor(localIdx / N);
            const col = localIdx % N;

            if (col === 0) html += '<tr>';

            const val = data[i] || 0;
            const formattedVal = this.formatValue(val);
            const highlightClass = Math.abs(val) > 1.5 ? 'highlight' : '';

            html += `<td class="${highlightClass}">${formattedVal}</td>`;

            if (col === N - 1) html += '</tr>';
        }

        this.container.innerHTML = `<tbody>${html}</tbody>`;
    }

    formatValue(val) {
        if (this.format === 'hex') {
            // Convert float bits to hex representation for raw byte inspection
            const buffer = new ArrayBuffer(4);
            const view = new DataView(buffer);
            view.setFloat32(0, val, true);
            return '0x' + view.getUint32(0, true).toString(16).padStart(8, '0');
        } else if (this.format === 'scientific') {
            return val.toExponential(2);
        }
        return val.toFixed(3);
    }

    setZSlice(z) {
        const sliceSize = this.gridSize * this.gridSize;
        const totalSlices = 32; // Temporary mock value for testing UI bounds
        //const totalSlices = Math.floor((this.currentData?.length || 0) / sliceSize) || 1;

        // Clamp the requested slice to available buffer bounds
        this.zSlice = Math.min(Math.max(0, z), totalSlices - 1);

        if (this.metrics.zValEl) this.metrics.zValEl.innerText = this.zSlice;
        if (this.currentData) {
            this.renderGrid(this.currentData);
        }
    }

    setFormat(fmt) {
        this.format = fmt;
        if (this.currentData) {
            this.renderGrid(this.currentData);
        }
    }
    connect(url = '/ws/telemetry') {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}${url}`;

        console.log(`[CH-03] Connecting to Raw Matrix stream at ${wsUrl}`);
        this.ws = new WebSocket(wsUrl);
        this.ws.binaryType = 'arraybuffer';

        this.ws.onmessage = (event) => {
            if (event.data instanceof ArrayBuffer) {
                const floatData = new Float32Array(event.data);
                console.log('[CH-03] Matrix payload received! Length:', floatData.length);
                this.update(floatData);
            }
        };

        this.ws.onerror = (error) => {
            console.error('[CH-03] WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.warn('[CH-03] WebSocket disconnected. Reconnecting in 3s...');
            setTimeout(() => this.connect(url), 3000);
        };
    }
}
window.RawMatrixViewer = RawMatrixViewer;