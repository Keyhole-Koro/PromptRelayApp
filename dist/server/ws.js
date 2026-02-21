// ─── WebSocket Protocol Handler ─────────────────────────────────
import { WebSocketServer } from "ws";
import { randomUUID } from "node:crypto";
function getPlayerIdFromRequest(req) {
    try {
        const rawUrl = req.url ?? "/ws";
        const parsed = new URL(rawUrl, "ws://localhost");
        const pid = parsed.searchParams.get("pid");
        if (!pid)
            return null;
        const trimmed = pid.trim();
        if (!trimmed)
            return null;
        if (trimmed.length > 128)
            return null;
        if (!/^[A-Za-z0-9._-]+$/.test(trimmed))
            return null;
        return trimmed;
    }
    catch {
        return null;
    }
}
function send(ws, msg) {
    if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
    }
}
export function setupWebSocket(server, roomManager) {
    const wss = new WebSocketServer({ server, path: "/ws" });
    // Track all connections per room for broadcasting
    const roomConnections = new Map();
    wss.on("connection", (ws, req) => {
        const requestedPlayerId = getPlayerIdFromRequest(req);
        const conn = {
            ws,
            roomCode: null,
            playerId: requestedPlayerId ?? randomUUID(),
            playerName: null,
        };
        send(ws, { type: "connected", playerId: conn.playerId });
        ws.on("message", (data) => {
            try {
                const msg = JSON.parse(String(data));
                handleMessage(conn, msg, roomManager, roomConnections);
            }
            catch (err) {
                send(ws, {
                    type: "error",
                    message: `Invalid message: ${err instanceof Error ? err.message : String(err)}`,
                });
            }
        });
        ws.on("close", () => {
            if (conn.roomCode) {
                const conns = roomConnections.get(conn.roomCode);
                if (conns) {
                    conns.delete(conn);
                    if (conns.size === 0) {
                        roomConnections.delete(conn.roomCode);
                    }
                }
            }
        });
    });
    return wss;
}
function handleMessage(conn, msg, roomManager, roomConnections) {
    switch (msg.action) {
        case "create_room": {
            const broadcast = (state, event) => {
                const conns = roomConnections.get(state.roomCode);
                if (!conns)
                    return;
                for (const c of conns) {
                    send(c.ws, { type: "room_state", state });
                    send(c.ws, { type: "event", event });
                }
            };
            const engine = roomManager.createRoom(broadcast);
            conn.roomCode = engine.state.roomCode;
            // Register connection
            if (!roomConnections.has(conn.roomCode)) {
                roomConnections.set(conn.roomCode, new Set());
            }
            roomConnections.get(conn.roomCode).add(conn);
            // Join the creator
            conn.playerName = msg.playerName;
            engine.joinRoom(conn.playerId, msg.playerName);
            break;
        }
        case "join_room": {
            const engine = roomManager.getRoom(msg.roomCode);
            if (!engine) {
                send(conn.ws, { type: "error", message: `Room ${msg.roomCode} not found` });
                return;
            }
            conn.roomCode = msg.roomCode;
            conn.playerName = msg.playerName;
            // Register connection
            if (!roomConnections.has(msg.roomCode)) {
                roomConnections.set(msg.roomCode, new Set());
            }
            roomConnections.get(msg.roomCode).add(conn);
            const existingByName = engine.state.players.find((p) => p.name === msg.playerName);
            if (existingByName) {
                conn.playerId = existingByName.id;
                send(conn.ws, { type: "connected", playerId: conn.playerId });
            }
            else {
                engine.joinRoom(conn.playerId, msg.playerName);
            }
            break;
        }
        case "start_game": {
            if (!conn.roomCode) {
                send(conn.ws, { type: "error", message: "Not in a room" });
                return;
            }
            const engine = roomManager.getRoom(conn.roomCode);
            if (!engine) {
                send(conn.ws, { type: "error", message: "Room not found" });
                return;
            }
            // Fire and forget — errors are dispatched as ERROR events
            engine.startGame().catch(() => { });
            break;
        }
        case "update_prompt": {
            if (!conn.roomCode) {
                send(conn.ws, { type: "error", message: "Not in a room" });
                return;
            }
            const engine = roomManager.getRoom(conn.roomCode);
            if (!engine) {
                send(conn.ws, { type: "error", message: "Room not found" });
                return;
            }
            const accepted = engine.appendPrompt(conn.playerId, msg.delta);
            if (!accepted) {
                send(conn.ws, { type: "error", message: "Prompt update rejected: not your turn" });
            }
            break;
        }
        case "send_reaction": {
            if (!conn.roomCode) {
                send(conn.ws, { type: "error", message: "Not in a room" });
                return;
            }
            const engine = roomManager.getRoom(conn.roomCode);
            if (!engine) {
                send(conn.ws, { type: "error", message: "Room not found" });
                return;
            }
            // Dispatch as a purely transient event (bypasses state but broadcasts to room)
            engine.dispatch({
                type: "REACTION",
                timestamp: Date.now(),
                reaction: msg.reaction,
            });
            break;
        }
        default: {
            send(conn.ws, { type: "error", message: "Unknown action" });
        }
    }
}
//# sourceMappingURL=ws.js.map