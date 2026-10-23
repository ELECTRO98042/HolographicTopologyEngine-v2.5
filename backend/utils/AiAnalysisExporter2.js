/**
 * AIAnalysisExporter.js
 * Serializes test configuration, telemetry frame history, user observational checkpoints,
 * and computed residual error metrics into an LLM-optimized markdown report and JSON payload.
 */
class AIAnalysisExporter {
    constructor(config, telemetryBuffer, userObservations = {}, testResults = {}) {
        this.config = config || {};
        this.telemetryBuffer = telemetryBuffer || [];
        this.userObservations = userObservations;
        this.testResults = testResults;
        this.timestamp = new Date().toISOString();
    }

    generateMarkdownReport() {
        const lastTelemetry = this.telemetryBuffer[this.telemetryBuffer.length - 1] || {};
        
        return `# HOLOGRAPHIC TOPOLOGY ENGINE - AI VALIDATION REPORT
**Generated:** ${this.timestamp}  
**Suite ID:** ${this.config.suite_id || "CUSTOM-EXPERIMENT"}  
**Title:** ${this.config.title || "Untitled Experiment"}  
**Engine Module:** ${this.config.engine_module || "N/A"}  
**Target View:** ${this.config.target_view || "N/A"}  

---

## 1. Parameters & Initial Conditions
\`\`\`json
${JSON.stringify(this.config.parameters || {}, null, 2)}
\`\`\`

---

## 2. Telemetry Summary & Convergence Metrics
- **Total Frames Captured:** ${this.telemetryBuffer.length}
- **Primary Metric Monitored:** ${this.config.hud_display_mapping?.primary_metric || "N/A"}
- **Secondary Metric Monitored:** ${this.config.hud_display_mapping?.secondary_metric || "N/A"}
- **Passed Stability Tolerance:** ${this.testResults.passed ? "YES (PASS)" : "NO (FAIL)"}
- **Final Frame Telemetry Snapshot:**
\`\`\`json
${JSON.stringify(lastTelemetry, null, 2)}
\`\`\`

---

## 3. Qualitative Scientist Observations
- **Mesh/Trajectory Coherence Verified:** ${this.userObservations.meshCoherent ? "PASSED" : "FAILED / UNCHECKED"}
- **Singularity / NaN Check:** ${this.userObservations.noSingularities ? "PASSED (No Singularities)" : "FAILED / UNCHECKED"}
- **Signal-to-Noise Ratio Bound:** ${this.userObservations.snrValid ? "PASSED" : "FAILED / UNCHECKED"}
- **Notes / Comments:** ${this.userObservations.notes || "None provided."}

---

## 4. AI Analyst Instructions
1. Review the initial parameters and final telemetry state for numerical stability and conservation laws.
2. Cross-reference primary/secondary metrics against theoretical expectations for ${this.config.engine_module}.
3. Propose calibrated parameter adjustments to minimize numerical dissipation, phase drift, or visual warping artifacts.
`;
    }

    generateJSONPayload() {
        return {
            metadata: {
                timestamp: this.timestamp,
                suite_id: this.config.suite_id,
                title: this.config.title,
                engine_module: this.config.engine_module
            },
            config: this.config,
            telemetrySummary: {
                totalFrames: this.telemetryBuffer.length,
                finalFrame: this.telemetryBuffer[this.telemetryBuffer.length - 1] || null
            },
            userObservations: this.userObservations,
            testResults: this.testResults
        };
    }
}

module.exports = AIAnalysisExporter;