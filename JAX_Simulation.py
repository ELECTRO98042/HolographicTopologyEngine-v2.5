<script>
        // Initialize standalone controller instance inside popup
        const suite = new TestingSuiteWindow();
        
        // Listen for live telemetry broadcasted from main window
        const channel = new BroadcastChannel('holographic_telemetry_channel');
        channel.onmessage = (event) => {
            if (event.data && suite.isCapturing) {
                suite.logTelemetryFrame(event.data);
            }
        };
</script>

// >>> NON-INTRUSIVE HOOK FOR TESTING SUITE <<<
                    if (window.testingSuite) {
                        window.testingSuite.logTelemetryFrame(data);
                    }

// Bind telemetry capture toggle button
        const triggerCaptureBtn = document.getElementById("btn-toggle-capture");
        if (triggerCaptureBtn) {
            triggerCaptureBtn.addEventListener("click", () => this.toggleCapture());
        }

        // Bind abort/reset button
        const abortBtn = document.getElementById("btn-abort-capture");
        if (abortBtn) {
            abortBtn.addEventListener("click", () => this.abandonTest());
        }

        // Bind scenario selection dropdown change event
        const presetSelect = document.getElementById("suite-preset-select");
        if (presetSelect) {
            presetSelect.addEventListener("change", (e) => this.loadConfig(e.target.value));
        }

        // Bind AI export button
        const exportBtn = document.getElementById("btn-export-ai-report");
        if (exportBtn) {
            exportBtn.addEventListener("click", () => this.exportReport());
        }

.btn-abort {
    background: #b91c1c;
    color: #f8fafc;
    border: 1px solid #dc2626;
    font-weight: 600;
    transition: background 0.2s ease;
}

.btn-abort:hover {
    background: #991b1b;
}