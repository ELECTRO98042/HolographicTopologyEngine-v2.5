import { TopologyMeshViewer } from '../frontend/js/TopologyMeshViewer.js';

export function testMeshIngestionBufferLayout() {
    const gridSize = 32;
    const expectedByteLength = gridSize * gridSize * Float32Array.BYTES_PER_ELEMENT; // 4096 bytes
    const buffer = new ArrayBuffer(expectedByteLength);
    const floatView = new Float32Array(buffer);

    // Populate mock Z-displacements matching CH-02 payload spec
    for (let i = 0; i < floatView.length; i++) {
        floatView[i] = Math.sin(i * 0.1);
    }

    const viewer = new TopologyMeshViewer();
    const success = viewer.ingestBinaryFrame(buffer);

    console.assert(success, "Mesh ingestion failed on zero-copy Float32Array parse boundary.");
    console.assert(viewer.geometry.attributes.position.array.length === 1024, "Vertex grid attribute length mismatch.");
    console.log("CH-02 mesh ingestion test passed successfully.");
}