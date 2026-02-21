import type { PlayerInfo } from "../types";

interface LobbyScreenProps {
    roomCode: string;
    players: PlayerInfo[];
    onStartGame: () => void;
    onBack: () => void;
}

export function LobbyScreen({
    roomCode,
    players,
    onStartGame,
    onBack,
}: LobbyScreenProps) {
    return (
        <div className="lobby-screen">
            <button className="back-btn" onClick={onBack}>
                ← ホームに戻る
            </button>

            <div className="lobby-header">
                <h1 className="home-title">⏳ 待機中</h1>
                <p className="home-subtitle">他のプレイヤーに以下のコードを共有してください</p>
            </div>

            <div className="room-code-display card">
                <span className="room-code-label">ROOM CODE</span>
                <span className="room-code-value">{roomCode}</span>
            </div>

            <div className="player-list card">
                <h2>👥 参加プレイヤー ({players.length})</h2>
                {players.length === 0 ? (
                    <p className="meta">プレイヤーを待っています...</p>
                ) : (
                    <ul className="player-items">
                        {players.map((p, i) => (
                            <li key={p.id} className="player-list-item">
                                <span className="player-avatar">
                                    {i === 0 ? "👑" : "🎮"}
                                </span>
                                <span className="player-name">{p.name}</span>
                                {i === 0 && (
                                    <span className="player-host-badge">ホスト</span>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <button
                className="start-btn lobby-start-btn"
                onClick={onStartGame}
            >
                ▶ ゲーム開始
            </button>
        </div>
    );
}
