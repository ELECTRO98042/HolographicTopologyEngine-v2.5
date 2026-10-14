// v2.6.9 Snapshot Export Suite
function captureSpatialSnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const telemetryData = {
        version: "v2.6.9",
        timestamp: new Date().toISOString(),
        config: window.hudConfig,
        nodes: nodes.map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            z: n.z,
            pinned: n.isPinned || false,
            drift: n.drift || { x: 0, z: 0 }
        }))
    };

    // 1. JSON Data Payload Export
    const jsonBlob = new Blob([JSON.stringify(telemetryData, null, 2)], { type: 'application/json' });
    triggerDownload(jsonBlob, `hud-snapshot-${timestamp}.json`);

    // 2. High-Res PNG Telemetry Stamp Export
    const canvas = document.getElementById('hudCanvas'); // adjust selector to match your canvas ID
    if (canvas) {
        const stampedCanvas = document.createElement('canvas');
        stampedCanvas.width = canvas.width;
        stampedCanvas.height = canvas.height;
        const sCtx = stampedCanvas.getContext('2d');

        // Draw current canvas view
        sCtx.drawImage(canvas, 0, 0);

        // Burn telemetry header/border metadata
        sCtx.fillStyle = 'rgba(0, 255, 204, 0.8)';
        sCtx.font = '12px monospace';
        sCtx.fillText(`HUD SNAPSHOT // ${timestamp}`, 20, 30);
        sCtx.fillText(`SYSTEM INTEGRITY: 94% | PHI: 5.6586`, 20, 50);

        stampedCanvas.toBlob(blob => {
            triggerDownload(blob, `hud-frame-${timestamp}.png`);
        }, 'image/png');
    }

    // 3. True Vector SVG Export (Isometric/Perspective Projection)
    generateVectorSVG(telemetryData, timestamp);
}

function generateVectorSVG(data, timestamp) {
    const width = 1200;
    const height = 800;
    const cx = width / 2;
    const cy = height / 2;
    const scale = 2.5; // Scale factor for vector space

    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#050808; font-family:monospace;">`;

    // Grid lines styling
    svgContent += `<g stroke="#00ffcc" stroke-opacity="0.15" stroke-width="1">`;
    // Add grid projection loops here matching your render grid loop
    svgContent += `</g>`;

    // Nodes and Vector Links
    svgContent += `<g>`;
    data.nodes.forEach(node => {
        // Simple isometric projection mapping for SVG vector space
        const px = cx + (node.x * scale);
        const py = cy + (node.z * scale) - (node.y * scale);

        const isCore = node.id === 'N-001';
        const color = isCore ? '#ff3366' : '#00ffcc';

        svgContent += `<circle cx="${px}" cy="${py}" r="${isCore ? 5 : 3.5}" fill="${color}" />`;
        svgContent += `<text x="${px + 8}" y="${py + 4}" fill="#00ffcc" font-size="10" opacity="0.8">${node.id}</text>`;
    });
    svgContent += `</g>`;

    // Metadata Border Stamp
    svgContent += `<text x="40" y="50" fill="#00ffcc" font-size="14">SPATIAL CONTROL DECK v2.6.9 // VECTOR EXPORT</text>`;
    svgContent += `<text x="40" y="750" fill="#00ffcc" font-size="10" opacity="0.6">TIMESTAMP: ${timestamp}</text>`;

    svgContent += `</svg>`;

    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    triggerDownload(svgBlob, `hud-vector-${timestamp}.svg`);
}
// Bind the snapshot bundle to your export action button
const snapshotBtn = document.getElementById('snapshotBtn') || document.querySelector('button[data-action="snapshot"], .snapshot-trigger');

if (snapshotBtn) {
    snapshotBtn.addEventListener('click', () => {
        captureSpatialSnapshot();
        console.log("v2.6.9 Multi-format snapshot bundle generated and downloaded.");
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const snapshotBtn = document.getElementById('snapshotBtn');
    if (snapshotBtn) {
        snapshotBtn.addEventListener('click', () => {
            captureSpatialSnapshot();
            console.log("v2.6.9 Snapshot bundle triggered from control deck.");
        });
    }
});

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}
window.captureSpatialSnapshot = captureSpatialSnapshot;
