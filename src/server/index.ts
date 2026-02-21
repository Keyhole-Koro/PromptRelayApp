// ─── Server Entry Point ─────────────────────────────────────────

import { createServer } from "node:http";
import { handleApiRequest } from "./api.js";
import { setupWebSocket } from "./ws.js";
import { RoomManager } from "../engine/roomManager.js";
import { RealClock } from "../infra/clock.js";
import { HttpWorkerClient } from "../infra/workerClient.js";

const HOST = "127.0.0.1";
const PORT = 8080;

const clock = new RealClock();
const worker = new HttpWorkerClient();
const roomManager = new RoomManager(clock, worker);

const server = createServer((req, res) => {
    // Try API routes first
    if (handleApiRequest(req, res)) return;

    // 404 for everything else
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not found" }));
});

// Attach WebSocket
setupWebSocket(server, roomManager);

server.listen(PORT, HOST, () => {
    console.log(`[prompt-relay] Backend listening on http://${HOST}:${PORT}`);
    console.log(`[prompt-relay] WS endpoint: ws://${HOST}:${PORT}/ws`);
});
