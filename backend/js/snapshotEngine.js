// v2.7.0 Snapshot Export Suite with JSZip Multi-Format Archive Bundle
function captureSpatialSnapshot() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const folderName = `hud_snapshot_${timestamp}`;

    // Initialize JSZip archive container
    const zip = new JSZip();
    const folder = zip.folder(folderName);

    // 1. Core State JSON Payload Export
    const telemetryData = {
        version: "v2.7.0",
        timestamp: new Date().toISOString(),
        config: window.hudConfig || {},
        nodes: (typeof nodes !== 'undefined' ? nodes : []).map(n => ({
            id: n.id,
            x: n.x,
            y: n.y,
            z: n.z,
            pinned: n.isPinned || false,
            drift: n.drift || { x: 0, z: 0 }
        }))
    };
    folder.file(`hud-snapshot-${timestamp}.json`, JSON.stringify(telemetryData, null, 2));

    // 2. High-Res PNG Telemetry Stamp Export
    const canvas = document.getElementById('hudCanvas');
    if (canvas) {
        const stampedCanvas = document.createElement('canvas');
        stampedCanvas.width = canvas.width;
        stampedCanvas.height = canvas.height;
        const sCtx = stampedCanvas.getContext('2d');

        sCtx.drawImage(canvas, 0, 0);

        sCtx.fillStyle = 'rgba(0, 255, 204, 0.8)';
        sCtx.font = '12px monospace';
        sCtx.fillText(`HUD SNAPSHOT // ${timestamp}`, 20, 30);
        sCtx.fillText(`SYSTEM INTEGRITY: 94% | PHI: 5.6586`, 20, 50);

        const dataUrl = stampedCanvas.toDataURL('image/png');
        const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
        folder.file(`hud-snapshot-${timestamp}.png`, base64Data, { base64: true });
    }

    // 3. True Vector SVG Export (Isometric Projection)
    const svgContent = generateVectorSVGString(telemetryData, timestamp);
    folder.file(`topology-${timestamp}.svg`, svgContent);

    // 4. CSV Metrics Export (if generator exists)
    if (typeof generateCSVData === 'function') {
        folder.file(`system_metrics-${timestamp}.csv`, generateCSVData());
    }

    // 5. Active Telemetry Stream JSON & PNG (if streaming window is open/active)
    if (window.hudTelemetryBuffer) {
        const bufferData = JSON.stringify(window.hudTelemetryBuffer.getAll(), null, 2);
        folder.file("telemetry/stream_buffer.json", bufferData);
    }

    const streamCanvas = document.querySelector('#streamCanvas');
    if (streamCanvas && streamCanvas.style.display !== 'none') {
        const streamDataUrl = streamCanvas.toDataURL('image/png');
        const streamBase64 = streamDataUrl.replace(/^data:image\/png;base64,/, '');
        folder.file("telemetry/telemetry_view.png", streamBase64, { base64: true });
    }

    // Generate and trigger download of the single compressed .zip archive
    zip.generateAsync({ type: "blob" }).then(content => {
        triggerDownload(content, `${folderName}.zip`);
        console.log(`v2.7.0 Archive bundle generated and downloaded: ${folderName}.zip`);
    });
}

function generateVectorSVGString(data, timestamp) {
    const width = 1200;
    const height = 800;
    const cx = width / 2;
    const cy = height / 2;
    const scale = 2.5;

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" style="background:#050808; font-family:monospace;">`;
    svg += `<g stroke="#00ffcc" stroke-opacity="0.15" stroke-width="1"></g>`;
    svg += `<g>`;
    data.nodes.forEach(node => {
        const px = cx + (node.x * scale);
        const py = cy + (node.z * scale) - (node.y * scale);
        const isCore = node.id === 'N-001';
        const color = isCore ? '#ff3366' : '#00ffcc';
        svg += `<circle cx="${px}" cy="${py}" r="${isCore ? 5 : 3.5}" fill="${color}" />`;
        svg += `<text x="${px + 8}" y="${py + 4}" fill="#00ffcc" font-size="10" opacity="0.8">${node.id}</text>`;
    });
    svg += `</g>`;
    svg += `<text x="40" y="50" fill="#00ffcc" font-size="14">SPATIAL CONTROL DECK v2.7.0 // VECTOR EXPORT</text>`;
    svg += `<text x="40" y="750" fill="#00ffcc" font-size="10" opacity="0.6">TIMESTAMP: ${timestamp}</text>`;
    svg += `</svg>`;
    return svg;
}

// Bind snapshot trigger to control deck button
document.addEventListener('DOMContentLoaded', () => {
    const snapshotBtn = document.getElementById('snapshotBtn') || document.querySelector('button[data-action="snapshot"], .snapshot-trigger');
    if (snapshotBtn) {
        snapshotBtn.addEventListener('click', () => {
            captureSpatialSnapshot();
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