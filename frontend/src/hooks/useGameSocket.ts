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

export function useGameSocket(): UseGameSocketReturn {
    const [roomState, setRoomState] = useState<RoomState | null>(null);
    const [wsStatus, setWsStatus] = useState<UseGameSocketReturn["wsStatus"]>("connecting");
    const [logs, setLogs] = useState<string[]>([]);
    const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
    const [lastReaction, setLastReaction] = useState<{ emoji: string; id: string } | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const addLog = useCallback((msg: string) => {
        setLogs((prev) => [...prev.slice(-200), `[${timestamp()}] ${msg}`]);
    }, []);

    const send = useCallback((action: Record<string, unknown>) => {
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
            const ws = new WebSocket(`${proto}//${location.host}/ws`);
            wsRef.current = ws;

            ws.addEventListener("open", () => {
                if (cancelled) return;
                setWsStatus("connected");
                addLog("websocket connected");
            });

            ws.addEventListener("message", (evt) => {
                if (cancelled) return;
                try {
                    const msg = JSON.parse(String(evt.data)) as IncomingMessage;
                    if (msg.type === "room_state") {
                        setRoomState(msg.state);
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
