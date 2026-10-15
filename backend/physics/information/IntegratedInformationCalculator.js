export class IntegratedInformationCalculator {
    constructor(nodeCount) {
        this.nodeCount = nodeCount;
        this.phiValue = 0.0;
        this.causalDensity = 0.0;
        // Transition probability matrix or state history buffer for causal analysis
        this.stateHistory = [];
        this.maxHistoryLength = 10;
    }

    // Record system states over time to evaluate effective information and cause-effect repertoires
    updateHistory(nodes) {
        const stateVector = nodes.map(n => (n.activeBonds > 0 ? 1 : 0));
        this.stateHistory.push(stateVector);
        if (this.stateHistory.length > this.maxHistoryLength) {
            this.stateHistory.shift();
        }
    }

    // Compute approximate Integrated Information (Phi) and Causal Density based on network connectivity and state diversity
    calculatePhi(nodes) {
        this.updateHistory(nodes);

        if (this.stateHistory.length < 3) return 0.0;

        let totalInterdependence = 0;
        let activeLinks = 0;

        for (let i = 0; i < nodes.length; i++) {
            activeLinks += nodes[i].activeBonds || 0;
        }

        // Causal density approximation from state variability and bond weights
        const densityFactor = activeLinks / (nodes.length * nodes.length + 1e-5);
        
        // System-level integration metric combining repertoire differentiation and integration
        let varianceSum = 0;
        const n = nodes.length;
        
        for (let i = 0; i < n; i++) {
            let localActivity = nodes[i].activeBonds;
            varianceSum += Math.abs(localActivity - (activeLinks / n));
        }

        const differentiation = varianceSum / (n + 1e-5);
        
        // Core Phi approximation: Integrated whole greater than sum of parts
        this.phiValue = differentiation * densityFactor * 10.0;
        this.causalDensity = densityFactor;

        return this.phiValue;
    }
}