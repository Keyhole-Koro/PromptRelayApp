import { useState } from "react";
import type { PlayerInfo } from "../types";

interface GameControlsProps {
    players: PlayerInfo[];
    currentPlayerName: string | null;
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (roomCode: string, playerName: string) => void;
    onStartGame: () => void;
}

export function GameControls({
    players,
    currentPlayerName,
    onCreateRoom,
    onJoinRoom,
    onStartGame,
}: GameControlsProps) {
    const [name, setName] = useState("");
    const [roomCode, setRoomCode] = useState("");

    const playerName = name.trim() || "Player";

    return (
        <section className="controls card">
            <h2>⚡ Game Controls</h2>
            <div className="control-row">
                <label className="field">
                    <span>Player Name</span>
                    <input
                        type="text"
                        placeholder="your name"
                        maxLength={24}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                </label>
            </div>
            <div className="control-row">
                <button type="button" onClick={() => onCreateRoom(playerName)}>
                    🎮 ルーム作成
                </button>
                <input
                    type="text"
                    placeholder="ROOM CODE"
                    maxLength={8}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                />
                <button
                    type="button"
                    onClick={() => {
                        if (roomCode.trim()) onJoinRoom(roomCode.trim(), playerName);
                    }}
                >
                    🚀 参加
                </button>
                <button type="button" onClick={onStartGame}>
                    ▶ 開始
                </button>
            </div>
            <p className="meta">
                Current turn: {currentPlayerName ?? "-"}
            </p>
            <p className="meta">
                Players: {players.map((p) => p.name).join(", ") || "-"}
            </p>
        </section>
    );
}
