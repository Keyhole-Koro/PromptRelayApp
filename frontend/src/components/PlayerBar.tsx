import { useState, useEffect } from "react";
import type { PlayerInfo, TurnState } from "../types";

interface PlayerBarProps {
    players: PlayerInfo[];
    turn: TurnState | null;
    myPlayerId: string | null;
}

export function PlayerBar({ players, turn, myPlayerId }: PlayerBarProps) {
    const [timeRemainingPct, setTimeRemainingPct] = useState(100);

    useEffect(() => {
        if (!turn) {
            setTimeRemainingPct(100);
            return;
        }

        const computePct = () => {
            const now = Date.now();
            const elapsed = now - turn.startedAt;
            let pct = 100 - (elapsed / turn.durationMs) * 100;
            if (pct < 0) pct = 0;
            if (pct > 100) pct = 100;
            setTimeRemainingPct(pct);
        };

        computePct();
        // Update at ~30fps for smooth visual progress
        const timer = setInterval(computePct, 30);
        return () => clearInterval(timer);
    }, [turn]);

    if (!players || players.length === 0) return null;

    const orderedPlayers = turn?.order
        ? turn.order
            .map((id) => players.find((p) => p.id === id))
            .filter((p): p is PlayerInfo => Boolean(p))
        : players;
    const activePlayerId = turn?.order?.[turn.currentPlayerIndex] ?? null;

    // Define colors for the bar: green -> yellow -> red
    let barColorClass = "time-high";
    if (timeRemainingPct < 25) {
        barColorClass = "time-critical";
    } else if (timeRemainingPct < 50) {
        barColorClass = "time-medium";
    }

    return (
        <div className="player-bar card neon-track-container">
            <h3 className="section-heading">🔄 Turn Order</h3>

            <div className="neon-track-wrapper">
                {/* The glowing line connecting all players */}
                <div className="neon-track-line"></div>

                <div className="player-nodes-container">
                    {orderedPlayers.map((p, idx) => {
                        const isActive = p.id === activePlayerId;
                        const isMe = p.id === myPlayerId;
                        // Determine if player has already gone in this round (for styling)
                        const isPast = turn && turn.currentPlayerIndex > -1 && idx < turn.currentPlayerIndex;

                        return (
                            <div
                                key={p.id}
                                className={`player-node ${isActive ? "is-active" : ""} ${isPast ? "is-past" : ""}`}
                            >
                                <div className="player-avatar-box">
                                    <img
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.name}`}
                                        alt={p.name}
                                        className="player-avatar-img"
                                    />
                                    {isMe && <div className="me-badge">You</div>}
                                </div>

                                <div className="player-info-stack">
                                    <div className="player-name-label">
                                        {p.name}
                                    </div>
                                    {isActive && (
                                        <div className="player-typing-indicator">
                                            <span className="dot"></span>
                                            <span className="dot"></span>
                                            <span className="dot"></span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Time Remaining Progress Bar */}
            {turn && activePlayerId && (
                <div className="turn-timer-container">
                    <div className="turn-timer-track">
                        <div
                            className={`turn-timer-fill ${barColorClass}`}
                            style={{ width: `${timeRemainingPct}%` }}
                        ></div>
                    </div>
                </div>
            )}
        </div>
    );
}
