import { TopologyMeshViewer } from './TopologyMeshViewer.js';

export class TelemetryStreamApp {
    constructor() {
        this.meshViewer = null;
        this.ws = null;
    }

    init(containerEl) {
        this.container = containerEl;
        this.initCanvas(containerEl);
        this.initWebSocket();
    }

    initCanvas(container) {
        this.meshViewer = new TopologyMeshViewer(container);

        const resize = () => {
            if (this.meshViewer && typeof this.meshViewer.resize === 'function') {
                this.meshViewer.resize();
            }
        };

        window.addEventListener('resize', resize);
        resize();
    }

    initWebSocket() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host || (window.opener ? window.opener.location.host : 'localhost:8000');
        const telemetryChannel = new BroadcastChannel('holographic_telemetry_channel');
        this.ws = new WebSocket(`${protocol}://${host}/ws/telemetry`);
        this.ws.binaryType = 'arraybuffer';
        // Initialize BroadcastChannel listener for live telemetry ingestion
        this.telemetryChannel = new BroadcastChannel('holographic_telemetry_channel');
        this.telemetryChannel.onmessage = (event) => {
            if (this.isCapturing && event.data) {
                const meta = {
                    step: event.data.step || this.frameCount + 1,
                    timeElapsed: event.data.timeElapsed || (performance.now() / 1000),
                    numPoints: event.data.numPoints || event.data.pointsCount || 1000
                };
                this.logTelemetryFrame(meta);
            }
        };

        this.ws.onopen = () => {
            console.log("[CH-02 Telemetry] Connected to /ws/telemetry");
        };

        this.ws.onmessage = async (event) => {
            // 1. Handle low-frequency configuration, status, or HUD strings & route via BroadcastChannel
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    telemetryChannel.postMessage(data); // Streams metadata to standalone window

                    if (data.type === 'hud_update') {
                        if (this.meshViewer && typeof this.meshViewer.update === 'function') {
                            this.meshViewer.update({ entropy: data.s_ee });
                        }
                        const entDisplay = document.querySelector('#entanglement-metric');
                        if (entDisplay) entDisplay.textContent = data.s_ee;

                        const phiDisplay = document.querySelector('#phi-metric');
                        if (phiDisplay) phiDisplay.textContent = data.data?.phi || data.phi;
                    }
                } catch (e) {
                    console.error("Failed to parse HUD JSON:", e);
                }
            }
            // 2. Handle high-frequency spatiotemporal binary stream (Zero-Copy DataView + Float64Array)
            else if (event.data instanceof ArrayBuffer) {
                const buffer = event.data;

                // Parse 24-byte little-endian header
                const headerView = new DataView(buffer, 0, 24);
                const step = headerView.getUint32(0, true);
                const timeElapsed = headerView.getFloat64(4, true);
                const numPoints = headerView.getUint32(12, true);

                // Compute offsets for the 4 parallel Float64 arrays (8 bytes per element)
                const vectorByteLength = numPoints * 3 * 8; // x, y, z per point (Float64 = 8 bytes)
                const scalarByteLength = numPoints * 8;     // scalar per point

                let offset = 24;

                const gridPositions = new Float64Array(buffer, offset, numPoints * 3);
                offset += vectorByteLength;

                const efieldReal = new Float64Array(buffer, offset, numPoints * 3);
                offset += vectorByteLength;

                const efieldImag = new Float64Array(buffer, offset, numPoints * 3);
                offset += vectorByteLength;

                const probDensity = new Float64Array(buffer, offset, numPoints);
                offset += scalarByteLength;

                // Route directly to rendering pipeline without DOM reactivity overhead
                if (this.meshViewer && typeof this.meshViewer.updateCoordinates === 'function') {
                    this.meshViewer.updateCoordinates({
                        step,
                        timeElapsed,
                        numPoints,
                        gridPositions,
                        efieldReal,
                        efieldImag,
                        probDensity
                    });
                }

                // Non-intrusive hook for testing suite window if active
                if (window.testingSuite && typeof window.testingSuite.logTelemetryFrame === 'function') {
                    window.testingSuite.logTelemetryFrame({ step, timeElapsed, numPoints });
                }
            }
        };

        this.ws.onerror = (error) => {
            console.error("[CH-02 Telemetry] WebSocket error:", error);
        };

        this.ws.onclose = () => {
            console.warn("[CH-02 Telemetry] WebSocket disconnected. Reconnecting...");
            setTimeout(() => this.initWebSocket(), 1000);
        };
    }
}