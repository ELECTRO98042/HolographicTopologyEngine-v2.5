/**
 * Spatial Control Deck State Manager & Export Suite (v2.6.8)
 */

window.hudConfig = {
    referenceFrame: 'open',
    streamFilter: 'all',
    interpolation: 'linear',
    palette: 'scifi',
    worldScale: 1.0,
    gridDensity: 10,
    motionSpeed: 1.0,
    noiseThreshold: 0.05,
    overlays: {
        thermal: false,
        wave: false,
        emp: false,
        atmos: false,
        doppler: false,
        multipath: false
    }
};

// Generic File Downloader Helper
function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Initialize UI Bindings once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Collapsible Drawer
    const collapseBtn = document.getElementById('deck-collapse-btn');
    const deckBody = document.getElementById('deck-body-content');
    if (collapseBtn && deckBody) {
        collapseBtn.addEventListener('click', () => {
            const isHidden = deckBody.style.display === 'none';
            deckBody.style.display = isHidden ? 'block' : 'none';
            collapseBtn.textContent = isHidden ? '−' : '+';
        });
    }

    // Dropdown Bindings
    const bindDropdown = (id, configKey, callback) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', (e) => {
                window.hudConfig[configKey] = e.target.value;
                if (callback) callback(e.target.value);
            });
        }
    };

    bindDropdown('ref-frame-select', 'referenceFrame', (val) => {
        if (typeof window.setTopologyMode === 'function') {
            // Map reference frames to topology modes smoothly
            const modeMap = { 'open': 'open', 'spheroid': 'spheroid', 'cubed': 'cubed', 'toroidal': 'toroidal' };
            window.setTopologyMode(modeMap[val] || 'open');
        }
    });
    bindDropdown('stream-filter-select', 'streamFilter');
    bindDropdown('interpolation-select', 'interpolation');
    bindDropdown('palette-select', 'palette', (val) => {
        // Switch color schemas dynamically
        window.hudConfig.palette = val;
    });
    
    // Slider Bindings
    const bindSlider = (sliderId, valId, configKey, unit = '', scaleFunc) => {
        const slider = document.getElementById(sliderId);
        const valDisplay = document.getElementById(valId);
        if (slider && valDisplay) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                window.hudConfig[configKey] = val;
                valDisplay.textContent = val + unit;
                if (scaleFunc) scaleFunc(val);
            });
        }
    };

    bindSlider('slider-world-scale', 'val-world-scale', 'worldScale');
    bindSlider('slider-grid-density', 'val-grid-density', 'gridDensity');
    bindSlider('slider-motion-speed', 'val-motion-speed', 'motionSpeed', 'x');
    bindSlider('slider-noise-thresh', 'val-noise-thresh', 'noiseThreshold');

    // Interference Overlays Toggle Bindings
    document.querySelectorAll('.overlay-toggle, button[data-overlay], .interference-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            // toggle() returns true if the class is now present, false if removed
            const isActive = btn.classList.toggle('active');

            const text = btn.textContent.trim().toLowerCase();
            let key = null;
            if (text.includes('thermal')) key = 'thermal';
            else if (text.includes('wave')) key = 'wave';
            else if (text.includes('emp')) key = 'emp';
            else if (text.includes('atmos')) key = 'atmos';
            else if (text.includes('doppler')) key = 'doppler';
            else if (text.includes('multipath')) key = 'multipath';

            if (key && window.hudConfig && window.hudConfig.overlays) {
                window.hudConfig.overlays[key] = isActive;
                console.log(`Overlay ${key} set to ${isActive}`);
            }
        });
    });

    // Action & Export Buttons
    document.getElementById('btn-pin-all').addEventListener('click', () => {
        if (window.nodes && window.nodes.length > 0) {
            window.nodes.forEach(n => { if (!n.isCore) n.isPinned = true; });
            console.log("All nodes pinned.");
        }
    });

    document.getElementById('btn-release-all').addEventListener('click', () => {
        if (window.nodes && window.nodes.length > 0) {
            window.nodes.forEach(n => { if (!n.isCore) n.isPinned = false; });
            console.log("All nodes released.");
        }
    });

    // JSON Export
    document.getElementById('btn-export-json').addEventListener('click', () => {
        const payload = {
            version: "2.6.8",
            timestamp: new Date().toISOString(),
            config: window.hudConfig,
            nodes: window.nodes || []
        };
        downloadFile(JSON.stringify(payload, null, 2), "holographic_topology_config.json", "application/json");
    });

    // CSV Export
    document.getElementById('btn-export-csv').addEventListener('click', () => {
        let csv = "ID,X,Y,Z,Pinned,Core\n";
        if (window.nodes && window.nodes.length > 0) {
            window.nodes.forEach(n => {
                csv += `${n.id},${n.x.toFixed(2)},${n.y.toFixed(2)},${n.z.toFixed(2)},${n.isPinned || false},${n.isCore || false}\n`;
            });
        }
        downloadFile(csv, "holographic_telemetry.csv", "text/csv");
    });

    // DOT Graph Export (Graphviz)
    document.getElementById('btn-export-dot').addEventListener('click', () => {
        let dot = "strict graph Topology {\n  fontname=\"Courier New\";\n  node [style=filled, fillcolor=\"#05050a\", fontcolor=\"#00ffcc\", color=\"#00ffcc\"];\n";
        if (window.nodes && window.nodes.length > 0) {
            window.nodes.forEach(n => {
                dot += `  "${n.id}" [label="${n.id}${n.isCore ? ' (Core)' : ''}"];\n`;
            });
            for (let i = 0; i < window.nodes.length; i++) {
                for (let j = i + 1; j < window.nodes.length; j++) {
                    dot += `  "${window.nodes[i].id}" -- "${window.nodes[j].id}";\n`;
                }
            }
        }
        dot += "}\n";
        downloadFile(dot, "topology_graph.dot", "text/vnd.graphviz");
    });
});