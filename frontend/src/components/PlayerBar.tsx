import { useEffect, useState } from "react";
import type { PlayerInfo, TurnState } from "../types";

interface PlayerBarProps {
    players: PlayerInfo[];
    turn: TurnState | null;
    myPlayerId: string | null;
}

export function PlayerBar({ players, turn, myPlayerId }: PlayerBarProps) {
    const [elapsed, setElapsed] = useState(0);

    // Countdown effect
    useEffect(() => {
        if (!turn) {
            setElapsed(0);
            return;
        }

        const tick = () => {
            const now = Date.now();
            setElapsed(Math.max(0, now - turn.startedAt));
        };

        tick();
        const interval = setInterval(tick, 200);
        return () => clearInterval(interval);
    }, [turn]);

    if (!players || players.length === 0) return null;

    const currentTurnIndex = turn?.currentPlayerIndex ?? -1;
    const remainingSec = Math.max(0, Math.ceil((30_000 - elapsed) / 1000));

    return (
        <div className="player-bar card">
            <h3 className="section-heading">🔄 Turn Order</h3>
            <div className="player-order">
                {players.map((p, idx) => {
                    const isActive = idx === currentTurnIndex;
                    const isMe = p.id === myPlayerId;

                    return (
                        <div key={p.id} className="player-node-wrap">
                            <div className={`player-dot ${isActive ? "active" : ""} ${isMe ? "me" : ""}`}>
                                <span className="player-initial">
                                    {p.name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="player-name-label">
                                {p.name} {isMe && "(You)"}
                            </div>
                            {isActive && (
                                <div className={`player-timer ${remainingSec <= 5 ? "danger" : ""}`}>
                                    {remainingSec}s
                                </div>
                            )}

                            {/* The arrows between players */}
                            {idx < players.length - 1 && (
                                <div className="player-arrow">
                                    <span className="arrow-icon">»</span>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
