// No React imports needed
import type { PlayerInfo, TurnState } from "../types";

interface PlayerBarProps {
    players: PlayerInfo[];
    turn: TurnState | null;
    myPlayerId: string | null;
}

export function PlayerBar({ players, turn, myPlayerId }: PlayerBarProps) {
    if (!players || players.length === 0) return null;

    const orderedPlayers = turn?.order
        ? turn.order
            .map((id) => players.find((p) => p.id === id))
            .filter((p): p is PlayerInfo => Boolean(p))
        : players;
    const activePlayerId = turn?.order?.[turn.currentPlayerIndex] ?? null;

    return (
        <div className="player-bar card">
            <h3 className="section-heading">🔄 Turn Order</h3>
            <div className="player-order-horizontal">
                {orderedPlayers.map((p, idx) => {
                    const isActive = p.id === activePlayerId;
                    const isMe = p.id === myPlayerId;

                    return (
                        <div key={p.id} className="player-node-wrap-horizontal">
                            <div className={`player-avatar-box ${isActive ? "active-glow" : ""} ${isMe ? "me" : ""}`}>
                                {/* You could swap this out for a real image URL if the player has one */}
                                <img
                                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${p.name}`}
                                    alt={p.name}
                                    className="player-avatar-img"
                                />
                                {isMe && <div className="me-badge">You</div>}
                            </div>
                            <div className={`player-name-label-horizontal ${isActive ? "active-text" : ""}`}>
                                {p.name}
                            </div>

                            {/* The arrows between players */}
                            {idx < orderedPlayers.length - 1 && (
                                <div className="player-arrow-horizontal">
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
