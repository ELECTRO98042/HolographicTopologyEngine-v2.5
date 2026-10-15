class TelemetryStreamApp {
    constructor() {
        this.currentChannel = 'CH-01';
        this.channelNames = {
            'CH-01': 'OSCILLOSCOPE (2D)',
            'CH-02': '3D TOPOLOGICAL LATTICE',
            'CH-03': 'RAW MATRIX INSPECTOR',
            'CH-04': 'HARMONIC RESONANCE'
        };
        this.wavePhase = 0;
        this.meshViewer = null;
        this.adsViewer = null;
        this.phiCalculator = null;
    }

    init(containerEl) {
        this.container = containerEl;
        this.renderLayout();
        this.initCanvas(containerEl);
        this.bindEvents();
        this.startRenderLoop();
    }

    initCanvas(container) {
        const canvas = container.querySelector('#canvas-CH-01');
        this.ctx = canvas.getContext('2d');
        this.canvas = canvas;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;

            // Handle 2D channels only
            ['CH-01', 'CH-03', 'CH-04'].forEach(ch => {
                const c = container.querySelector(`#canvas-${ch}`);
                if (c) {
                    const rect = c.getBoundingClientRect();
                    c.width = rect.width * dpr;
                    c.height = rect.height * dpr;
                    const cCtx = c.getContext('2d');
                    if (cCtx) {
                        cCtx.setTransform(1, 0, 0, 1, 0, 0);
                        cCtx.scale(dpr, dpr);
                    }
                }
            });

            // Handle CH-02 WebGL canvas separately (never call getContext('2d') on it)
            const c2 = container.querySelector('#canvas-CH-02');
            if (c2) {
                const rect = c2.getBoundingClientRect();
                c2.width = rect.width * dpr;
                c2.height = rect.height * dpr;
            }

            if (this.meshViewer && typeof this.meshViewer.resize === 'function') {
                this.meshViewer.resize();
            }
        };

        window.addEventListener('resize', resize);
        resize();
    }

    renderOscilloscope(ctx, width, height) {
        this.wavePhase += 0.05;
        ctx.beginPath();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 2;

        for (let x = 0; x < width; x++) {
            const y = height / 2 + Math.sin(x * 0.015 + this.wavePhase) * (height * 0.25)
                + Math.cos(x * 0.005 + this.wavePhase * 0.5) * (height * 0.1);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    renderMatrixInspector(ctx, width, height) {
        ctx.fillStyle = '#00ffcc';
        ctx.font = '11px monospace';
        const rows = 12;
        const cols = Math.floor(width / 90);

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
                ctx.fillText(`0x${hex}`, 20 + c * 90, 30 + r * 20);
            }
        }
    }

    renderHarmonicResonance(ctx, width, height) {
        this.wavePhase += 0.03;
        const bars = 24;
        const barWidth = (width - 60) / bars;

        for (let i = 0; i < bars; i++) {
            const h = (Math.sin(i * 0.3 + this.wavePhase) + 1) * 0.5 * (height * 0.4) + 20;
            ctx.fillStyle = '#00ffccbb';
            ctx.fillRect(30 + i * (barWidth + 4), height - h - 30, barWidth, h);
        }
    }

    renderLayout() {
        this.container.innerHTML = `
        <div style="position: relative; width: 100%; height: 100vh; box-sizing: border-box; background: #050808; display: flex; flex-direction: column;">
            <!-- Top Channel Header Title -->
            <div id="channelTitle" style="text-align: center; color: #00ffcc; font-family: monospace; font-size: 14px; padding: 12px; letter-spacing: 2px;">
                CH-01: OSCILLOSCOPE (2D)
            </div>

            <!-- Main Viewport Area with Isolated Channel Views -->
            <div style="flex: 1; position: relative; overflow: hidden; padding-bottom: 36px;">
                <div id="view-CH-01" class="channel-view" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; display: block;">
                    <canvas id="canvas-CH-01" style="width: 100%; height: 100%; display: block;"></canvas>
                </div>
                <div id="view-CH-02" class="channel-view" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; display: none;">
                    <canvas id="canvas-CH-02" style="width: 100%; height: 100%; display: block;"></canvas>
                </div>
                <div id="view-CH-03" class="channel-view" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; display: none;">
                    <canvas id="canvas-CH-03" style="width: 100%; height: 100%; display: block;"></canvas>
                </div>
                <div id="view-CH-04" class="channel-view" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; display: none;">
                    <canvas id="canvas-CH-04" style="width: 100%; height: 100%; display: block;"></canvas>
                </div>
            </div>

            <!-- Fixed Bottom Jog-Strip Container -->
            <div class="jog-strip" style="position: absolute; bottom: 0; left: 0; width: 100%; height: 36px; display: flex; justify-content: center; align-items: center; background: #050808ee; border-top: 1px solid #00ffcc33; box-sizing: border-box;">
                <button class="jog-btn active" data-channel="CH-01">CH-01</button>
                <button class="jog-btn" data-channel="CH-02">CH-02</button>
                <button class="jog-btn" data-channel="CH-03">CH-03</button>
                <button class="jog-btn" data-channel="CH-04">CH-04</button>
            </div>
        </div>
        `;
    }

    bindEvents() {
        const buttons = this.container.querySelectorAll('.jog-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                buttons.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.setChannel(e.target.dataset.channel);
            });
        });
    }

    async setChannel(channelId) {
        this.currentChannel = channelId;
        const titleEl = this.container.querySelector('#channelTitle');
        if (titleEl) {
            titleEl.textContent = `${channelId}: ${this.channelNames[channelId]}`;
        }

        // Toggle view visibility
        this.container.querySelectorAll('.channel-view').forEach(el => {
            el.style.display = 'none';
        });

        const activeView = this.container.querySelector(`#view-${channelId}`);
        if (activeView) {
            activeView.style.display = 'block';
            const activeCanvas = activeView.querySelector('canvas');
            if (activeCanvas) {
                this.canvas = activeCanvas;
                if (channelId !== 'CH-02') {
                    this.ctx = activeCanvas.getContext('2d');
                    // Ensure proper dimensions on switch
                    const dpr = window.devicePixelRatio || 1;
                    const rect = activeCanvas.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                        activeCanvas.width = rect.width * dpr;
                        activeCanvas.height = rect.height * dpr;
                        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
                        this.ctx.scale(dpr, dpr);
                    }
                }
            }
        }

        // Lazy-load or initialize viewers per channel
        if (channelId === 'CH-02' && !this.meshViewer) {
            const canvasCH2 = this.container.querySelector('#canvas-CH-02');
            const { TopologyMeshViewer } = await import('/js/TopologyMeshViewer.js');
            this.meshViewer = new TopologyMeshViewer(canvasCH2);
        } else if (channelId === 'CH-03' && !this.adsViewer) {
            const { AdSBoundaryMapper } = await import('/physics/holographic/AdSBoundaryMapper.js');
            this.adsViewer = new AdSBoundaryMapper(window.hudConfig?.gridDensity || 10);
        } else if (channelId === 'CH-04' && !this.phiCalculator) {
            const { IntegratedInformationCalculator } = await import('/physics/information/IntegratedInformationCalculator.js');
            this.phiCalculator = new IntegratedInformationCalculator(window.hudConfig?.gridDensity || 10);
        }
    }

    startRenderLoop() {
        const render = () => {
            if (this.currentChannel === 'CH-02') {
                this.animFrameId = requestAnimationFrame(render);
                return;
            }

            if (!this.canvas || !this.ctx) {
                this.animFrameId = requestAnimationFrame(render);
                return;
            }

            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;

            if (width > 0 && height > 0) {
                this.ctx.fillStyle = '#020205';
                this.ctx.fillRect(0, 0, width, height);

                switch (this.currentChannel) {
                    case 'CH-01':
                        this.renderOscilloscope(this.ctx, width, height);
                        break;
                    case 'CH-03':
                        this.renderMatrixInspector(this.ctx, width, height);
                        break;
                    case 'CH-04':
                        this.renderHarmonicResonance(this.ctx, width, height);
                        break;
                }
            }

            this.animFrameId = requestAnimationFrame(render);
        };
        render();
    }
}

window.openTelemetryStream = function () {
    const streamWindow = window.open('', 'TelemetryStream', 'width=800,height=550');
    if (streamWindow) {
        streamWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Holographic HUD - Telemetry Stream v2.7.0</title>
                <style>
                    body {
                        margin: 0;
                        padding: 0;
                        background: #050808;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <div id="app" style="width:100vw;height:100vh;"></div>
            </body>
            </html>
        `);
        streamWindow.document.close();
        const appContainer = streamWindow.document.getElementById('app');
        const app = new TelemetryStreamApp();
        app.init(appContainer);
    }
};

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else {
            window.close();
        }
    }
});