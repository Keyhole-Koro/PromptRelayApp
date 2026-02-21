import { useEffect, useRef, useState, useCallback } from "react";
import type { RoomState, IncomingMessage } from "../types";

interface UseGameSocketReturn {
    roomState: RoomState | null;
    wsStatus: "connecting" | "connected" | "disconnected" | "error";
    logs: string[];
    myPlayerId: string | null;
    lastReaction: { emoji: string; id: string } | null;
    send: (action: Record<string, unknown>) => void;
}

function timestamp(): string {
    return new Date().toLocaleTimeString();
}

const PLAYER_ID_STORAGE_KEY = "promptrelay.playerId";

function getOrCreateStablePlayerId(): string {
    try {
        const existing = localStorage.getItem(PLAYER_ID_STORAGE_KEY);
        if (existing && existing.trim()) return existing;
        const created = crypto.randomUUID();
        localStorage.setItem(PLAYER_ID_STORAGE_KEY, created);
        return created;
    } catch {
        return crypto.randomUUID();
    }
}

export function useGameSocket(): UseGameSocketReturn {
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [wsStatus, setWsStatus] = useState<UseGameSocketReturn["wsStatus"]>("connecting");
    const [logs, setLogs] = useState<string[]>([]);
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
    const [lastReaction, setLastReaction] = useState<{ emoji: string; id: string } | null>(null);
    const wsRef = useRef<WebSocket | null>(null);
    const stablePlayerIdRef = useRef<string>(getOrCreateStablePlayerId());
    const roomCodeRef = useRef<string | null>(null);
    const playerNameRef = useRef<string | null>(null);
    const hasConnectedOnceRef = useRef(false);

    const addLog = useCallback((msg: string) => {
        setLogs((prev) => [...prev.slice(-200), `[${timestamp()}] ${msg}`]);
    }, []);

    const send = useCallback((action: Record<string, unknown>) => {
        const actionType = typeof action.action === "string" ? action.action : "";
        if (actionType === "create_room") {
            const name = typeof action.playerName === "string" ? action.playerName.trim() : "";
            if (name) playerNameRef.current = name;
            roomCodeRef.current = null;
        } else if (actionType === "join_room") {
            const roomCode = typeof action.roomCode === "string" ? action.roomCode.trim() : "";
            const name = typeof action.playerName === "string" ? action.playerName.trim() : "";
            if (roomCode) roomCodeRef.current = roomCode;
            if (name) playerNameRef.current = name;
        }

        const ws = wsRef.current;
        if (!ws || ws.readyState !== WebSocket.OPEN) return;
        ws.send(JSON.stringify(action));
    }, []);

    useEffect(() => {
        let cancelled = false;
        let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

        function connect() {
            if (cancelled) return;
            const proto = location.protocol === "https:" ? "wss:" : "ws:";
            const ws = new WebSocket(
                `${proto}//${location.host}/ws?pid=${encodeURIComponent(stablePlayerIdRef.current)}`,
            );
            wsRef.current = ws;

            ws.addEventListener("open", () => {
                if (cancelled) return;
                setWsStatus("connected");
                addLog("websocket connected");

                if (hasConnectedOnceRef.current && roomCodeRef.current && playerNameRef.current) {
                    ws.send(
                        JSON.stringify({
                            action: "join_room",
                            roomCode: roomCodeRef.current,
                            playerName: playerNameRef.current,
                        }),
                    );
                    addLog(`rejoined room ${roomCodeRef.current}`);
                }
                hasConnectedOnceRef.current = true;
            });

            ws.addEventListener("message", (evt) => {
                if (cancelled) return;
                try {
                    const msg = JSON.parse(String(evt.data)) as IncomingMessage;
                    if (msg.type === "room_state") {
                        setRoomState(msg.state);
                        roomCodeRef.current = msg.state.roomCode;
                    } else if (msg.type === "connected") {
                        setMyPlayerId(msg.playerId);
                    } else if (msg.type === "error") {
                        addLog(`error: ${msg.message}`);
                    } else if (msg.type === "event" && msg.event.type === "REACTION") {
                        setLastReaction({ emoji: msg.event.reaction, id: Math.random().toString(36).substr(2, 9) });
                    } else {
                        addLog("event received");
                    }
                } catch (err) {
                    addLog(`invalid message: ${err instanceof Error ? err.message : String(err)}`);
                }
            });

            ws.addEventListener("close", () => {
                if (cancelled) return;
                setWsStatus("disconnected");
                addLog("websocket closed");
                reconnectTimer = setTimeout(connect, 2000);
            });

            ws.addEventListener("error", () => {
                if (cancelled) return;
                setWsStatus("error");
                addLog("websocket error");
            });
        }

        connect();

        return () => {
            cancelled = true;
            if (reconnectTimer) clearTimeout(reconnectTimer);
            wsRef.current?.close();
        };
    }, [addLog]);

    return { roomState, wsStatus, logs, myPlayerId, lastReaction, send };
}
