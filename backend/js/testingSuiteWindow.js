/**
 * testingSuiteWindow.js
 * Controls the 5-stage scientific testing workflow drawer and AI report export.
 */
class TestingSuiteWindow {
    constructor() {
        this.isOpen = false;
        this.activeConfig = null;
        this.telemetryBuffer = [];
        this.isCapturing = false;
        this.isCompleted = false;
        this.frameCount = 0;
        this.metricsLog = [];
        this.lastFrameReceivedTime = 0;
        this.captureTimer = null;
        this.timeoutHandle = null;
        this.totalDurationSeconds = 30;

        this.initUI();
        this.fetchConfigs();
    }

    initUI() {
        const drawer = document.createElement("div");
        drawer.id = "testing-suite-drawer";
        drawer.className = "testing-suite-drawer hidden";
        drawer.innerHTML = `
            <div class="drawer-header" id="suite-drag-handle" style="cursor: move;">
                <h3>🧪 Scientific Testing Suite</h3>
                <button class="close-btn" id="close-drawer-btn">&times;</button>
            </div>
            <div class="drawer-content">
                <!-- Step 1: Scenario Selection -->
                <div class="workflow-step">
                    <h4>Step 1: Scenario Selection</h4>
                    <select id="suite-preset-select" class="form-select">
                        <option value="">-- Select Physics Preset --</option>
                    </select>
                </div>

                <!-- Step 2: Target & Metrics -->
                <div class="workflow-step">
                    <h4>Step 2: Experiment Specifications</h4>
                    <div id="experiment-spec-display" style="font-size: 12px; color: #38bdf8;">
                        Select a scenario to view specs.
                    </div>
                </div>

                <!-- Step 3: Scientist Checkpoints (Transposed pre-requisite) -->
                <div class="workflow-step">
                    <h4>Step 3: Verification Checkpoints</h4>
                    <div class="checkbox-group">
                        <label><input type="checkbox" id="chk-mesh"> Mesh / Trajectory Coherent</label>
                        <label><input type="checkbox" id="chk-singularity"> No Matrix Singularities / NaNs</label>
                        <label><input type="checkbox" id="chk-snr"> Telemetry SNR Valid</label>
                    </div>
                </div>

                <!-- Step 4: Run Data Acquisition -->
                <div class="workflow-step">
                    <h4>Step 4: Telemetry Acquisition</h4>
                    <div id="status-descriptor" style="font-size: 12px; color: #94a3b8; margin-bottom: 8px;">
                        Open Telemetry Stream
                    </div>
                    <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                        <button id="btn-toggle-capture" class="btn-primary" disabled style="flex: 2;">▶ Start Telemetry Capture</button>
                        <button id="btn-abort-capture" class="btn-primary" style="flex: 1; background: #b91c1c; display: none;">Abort</button>
                    </div>
                    
                    <!-- Progress Bar & Timer Elements -->
                    <div style="background: #1e293b; border-radius: 4px; overflow: hidden; height: 8px; margin-bottom: 6px;">
                        <div id="progress-bar-fill" style="width: 0%; background: #0284c7; height: 100%; transition: width 0.3s;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
                        <span>Progress: <span id="progress-percent">0%</span></span>
                        <span>ETA: <span id="timer-eta">--:--</span></span>
                    </div>

                    <div style="margin-top: 8px; font-size: 12px;">
                        Frames Captured: <span id="frame-counter" style="color: #38bdf8;">0</span> | 
                        Elapsed: <span id="time-elapsed-display" style="color: #38bdf8;">0.0000</span>s
                    </div>
                </div>

                <!-- Step 5: Export -->
                <div class="workflow-step">
                    <h4>Step 5: Validation & AI Export</h4>
                    <div style="margin-bottom: 10px;">
                        Status: <span id="experiment-status-badge" class="status-badge pending">PENDING / INCOMPLETE</span>
                    </div>
                    <button id="btn-export-ai-report" class="btn-primary" disabled>📤 Export AI Validation Report</button>
                </div>
            </div>
        `;

        document.body.appendChild(drawer);

        this.initDraggable(drawer);

        // Bind events safely
        document.getElementById("close-drawer-btn").addEventListener("click", () => this.toggleDrawer(false));
        document.getElementById("suite-preset-select").addEventListener("change", (e) => this.loadConfig(e.target.value));
        document.getElementById("btn-toggle-capture").addEventListener("click", () => this.toggleCapture());
        document.getElementById("btn-abort-capture").addEventListener("click", () => this.abandonTest());
        document.getElementById("btn-export-ai-report").addEventListener("click", () => this.exportReport());

        ["chk-mesh", "chk-singularity", "chk-snr"].forEach(id => {
            document.getElementById(id).addEventListener("change", () => this.evaluateStatus());
        });
    }

    initDraggable(drawer) {
        const header = document.getElementById("suite-drag-handle");
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        header.addEventListener("mousedown", (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;

            const rect = drawer.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;

            drawer.style.right = "auto";
            drawer.style.left = `${initialLeft}px`;
            drawer.style.top = `${initialTop}px`;
            drawer.style.transform = "none";

            e.preventDefault();
        });

        document.addEventListener("mousemove", (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            drawer.style.left = `${initialLeft + dx}px`;
            drawer.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener("mouseup", () => {
            isDragging = false;
        });
    }

    async fetchConfigs() {
        try {
            const res = await fetch("/api/v1/test-suite/configs");
            const data = await res.json();
            const select = document.getElementById("suite-preset-select");
            data.configs.forEach(cfg => {
                const opt = document.createElement("option");
                opt.value = cfg;
                opt.textContent = cfg;
                select.appendChild(opt);
            });
        } catch (err) {
            console.warn("Test suite server routes offline. Using local mode fallback.", err);
        }
    }

    async loadConfig(filename) {
        if (!filename) return;
        try {
            const res = await fetch(`/api/v1/test-suite/configs/${filename}`);
            this.activeConfig = await res.json();

            document.getElementById("experiment-spec-display").innerHTML = `
                <strong>ID:</strong> ${this.activeConfig.suite_id}<br/>
                <strong>Target View:</strong> ${this.activeConfig.target_view}<br/>
                <strong>Module:</strong> ${this.activeConfig.engine_module}
            `;
            document.getElementById("btn-toggle-capture").disabled = false;
        } catch (err) {
            console.error("Failed to load test config", err);
        }
    }

    toggleCapture() {
        if (this.isCompleted) return;

        const timeSinceLastFrame = Date.now() - this.lastFrameReceivedTime;
        const isTelemetryActive = this.lastFrameReceivedTime > 0 && timeSinceLastFrame < 4000;

        if (!this.isCapturing && !isTelemetryActive && this.lastFrameReceivedTime !== 0) {
            const descriptor = document.getElementById("status-descriptor");
            if (descriptor) {
                descriptor.textContent = "Open Telemetry Stream";
                descriptor.style.color = "#ef4444";
            }
            return;
        }

        this.isCapturing = !this.isCapturing;
        const btn = document.getElementById("btn-toggle-capture");
        const abortBtn = document.getElementById("btn-abort-capture");
        const descriptor = document.getElementById("status-descriptor");

        if (this.isCapturing) {
            btn.textContent = "⏸ Pause Capture";
            btn.style.background = "#d97706";
            if (abortBtn) {
                abortBtn.textContent = "Abort";
                abortBtn.style.background = "#b91c1c";
                abortBtn.style.display = "block";
            }
            if (descriptor) descriptor.style.color = "#38bdf8";
            this.startProgressSequence();
        } else {
            btn.textContent = "▶ Resume Capture";
            btn.style.background = "#0284c7";
            if (descriptor) descriptor.textContent = "Capture paused.";
            this.stopProgressSequence();
        }
        this.evaluateStatus();
    }

    startProgressSequence() {
        const totalDuration = this.calculateTotalTestDuration();
        let elapsedSeconds = 0;

        const safetyTimeoutMs = (totalDuration + 5) * 1000;
        this.timeoutHandle = setTimeout(() => {
            if (this.isCapturing) {
                this.completeTestSequence();
            }
        }, safetyTimeoutMs);

        this.captureTimer = setInterval(() => {
            if (!this.isCapturing) return;

            elapsedSeconds++;
            const percent = Math.min(100, Math.floor((elapsedSeconds / totalDuration) * 100));
            const remaining = Math.max(0, totalDuration - elapsedSeconds);

            const barFill = document.getElementById("progress-bar-fill");
            const progPercent = document.getElementById("progress-percent");
            const timerEta = document.getElementById("timer-eta");
            const descriptor = document.getElementById("status-descriptor");

            if (barFill) barFill.style.width = `${percent}%`;
            if (progPercent) progPercent.textContent = `${percent}%`;
            if (timerEta) timerEta.textContent = `00:${remaining < 10 ? '0' : ''}${remaining}`;
            if (descriptor) descriptor.textContent = `Executing test phase... (${elapsedSeconds}s / ${totalDuration}s)`;

            if (elapsedSeconds >= totalDuration) {
                this.completeTestSequence();
            }
        }, 1000);
    }

    completeTestSequence() {
        this.isCapturing = false;
        this.isCompleted = true;
        this.stopProgressSequence();

        const btn = document.getElementById("btn-toggle-capture");
        const abortBtn = document.getElementById("btn-abort-capture");
        const descriptor = document.getElementById("status-descriptor");

        if (btn) {
            btn.textContent = "Finished Capture";
            btn.style.background = "#334155";
            btn.disabled = true;
        }

        if (abortBtn) {
            abortBtn.textContent = "Reset";
            abortBtn.style.background = "#0284c7"; // Blue
            abortBtn.style.display = "block";
        }

        if (descriptor) {
            descriptor.textContent = "Test sequence completed successfully.";
            descriptor.style.color = "#38bdf8";
        }

        this.evaluateStatus();
    }

    stopProgressSequence() {
        if (this.captureTimer) clearInterval(this.captureTimer);
        if (this.timeoutHandle) clearTimeout(this.timeoutHandle);
    }

    abandonTest() {
        this.isCapturing = false;
        this.isCompleted = false;
        this.stopProgressSequence();
        this.metricsLog = [];
        this.frameCount = 0;

        const barFill = document.getElementById("progress-bar-fill");
        const progPercent = document.getElementById("progress-percent");
        const timerEta = document.getElementById("timer-eta");
        const descriptor = document.getElementById("status-descriptor");
        const frameCounter = document.getElementById("frame-counter");

        if (barFill) barFill.style.width = "0%";
        if (progPercent) progPercent.textContent = "0%";
        if (timerEta) timerEta.textContent = "--:--";
        if (frameCounter) frameCounter.textContent = "0";
        if (descriptor) {
            descriptor.textContent = "Test reset. Environment returned to default state.";
            descriptor.style.color = "#94a3b8";
        }

        const btn = document.getElementById("btn-toggle-capture");
        if (btn) {
            btn.textContent = "▶ Start Telemetry Capture";
            btn.style.background = "#0284c7";
            btn.disabled = !this.activeConfig;
        }

        const abortBtn = document.getElementById("btn-abort-capture");
        if (abortBtn) {
            abortBtn.textContent = "Abort";
            abortBtn.style.background = "#b91c1c";
            abortBtn.style.display = "none";
        }

        // Reset checkboxes
        ["chk-mesh", "chk-singularity", "chk-snr"].forEach(id => {
            const chk = document.getElementById(id);
            if (chk) chk.checked = false;
        });

        this.evaluateStatus();
    }

    logTelemetryFrame(frameMeta) {
        if (!this.isCapturing) return;

        this.frameCount++;
        this.lastFrameReceivedTime = Date.now();

        this.metricsLog.push({
            step: frameMeta.step,
            timeElapsed: frameMeta.timeElapsed,
            numPoints: frameMeta.numPoints,
            loggedAt: performance.now()
        });

        const counterElem = document.getElementById('frame-counter');
        if (counterElem) counterElem.textContent = this.frameCount;

        const timeElem = document.getElementById('time-elapsed-display');
        if (timeElem) timeElem.textContent = frameMeta.timeElapsed.toFixed(4);
    }

    calculateTotalTestDuration() {
        let duration = 30;
        if (document.getElementById("chk-mesh")?.checked) duration += 5;
        if (document.getElementById("chk-singularity")?.checked) duration += 5;
        if (document.getElementById("chk-snr")?.checked) duration += 5;
        return duration;
    }

    evaluateStatus() {
        const meshCoherent = document.getElementById("chk-mesh")?.checked || false;
        const noSingularities = document.getElementById("chk-singularity")?.checked || false;
        const snrValid = document.getElementById("chk-snr")?.checked || false;

        const checkpointsPassed = meshCoherent && noSingularities && snrValid;
        const isReadyForExport = checkpointsPassed && (this.isCompleted || this.frameCount > 0);

        const badge = document.getElementById("experiment-status-badge");
        const exportBtn = document.getElementById("btn-export-ai-report");

        if (badge && exportBtn) {
            if (isReadyForExport) {
                badge.textContent = "COMPLETED!";
                badge.style.background = "#15803d"; // Green
                badge.style.color = "#ffffff";
                exportBtn.disabled = false;
            } else {
                badge.textContent = "PENDING / INCOMPLETE";
                badge.style.background = "#d97706"; // Amber/Orange
                badge.style.color = "#ffffff";
                exportBtn.disabled = true;
            }
        }
    }

    exportReport() {
        const reportData = JSON.stringify(this.metricsLog, null, 2);
        const blob = new Blob([reportData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `telemetry_audit_report_${Date.now()}.json`;
        a.click();

        URL.revokeObjectURL(url);
    }

    toggleDrawer(forceState) {
        this.isOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;
        const drawer = document.getElementById("testing-suite-drawer");
        if (drawer) {
            if (this.isOpen) {
                drawer.classList.remove("hidden");
            } else {
                drawer.classList.add("hidden");
            }
        }
    }
}

window.TestingSuiteWindow = TestingSuiteWindow;