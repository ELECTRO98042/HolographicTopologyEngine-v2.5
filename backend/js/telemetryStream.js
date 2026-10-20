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
        this.ws = new WebSocket(`${protocol}//${host}/ws/telemetry`);

        // CRITICAL: Enable binary frame ingestion as ArrayBuffers
        this.ws.binaryType = 'arraybuffer';

        this.ws.onopen = () => {
            console.log("[CH-02 Telemetry] Connected to /ws/telemetry");
        };

        this.ws.onmessage = async (event) => {
            if (typeof event.data === 'string') {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'hud_update') {
                        if (this.meshViewer && typeof this.meshViewer.update === 'function') {
                            this.meshViewer.update({ entropy: data.s_ee });
                        }

                        const entDisplay = document.querySelector('#entanglement-metric');
                        if (entDisplay) entDisplay.textContent = data.s_ee;

                        const phiDisplay = document.querySelector('#phi-metric');
                        if (phiDisplay) phiDisplay.textContent = data.phi;
                    }
                } catch (e) {
                    console.error("Failed to parse HUD JSON:", e);
                }
            } else if (event.data instanceof ArrayBuffer) {
                const float32Coords = new Float32Array(event.data);
                if (this.meshViewer && typeof this.meshViewer.updateCoordinates === 'function') {
                    this.meshViewer.updateCoordinates(float32Coords);
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