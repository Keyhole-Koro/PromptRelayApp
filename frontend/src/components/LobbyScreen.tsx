import type { PlayerInfo } from "../types";

interface LobbyScreenProps {
    roomCode: string;
    players: PlayerInfo[];
    myPlayerId: string | null;
    isStartingGame: boolean;
    onStartGame: () => void;
    onAddMockPlayer: () => void;
    onBack: () => void;
}

export function LobbyScreen({
    roomCode,
    players,
    myPlayerId,
    isStartingGame,
    onStartGame,
    onAddMockPlayer,
    onBack,
}: LobbyScreenProps) {
    const hostPlayerId = players[0]?.id ?? null;
    const isHost = !!myPlayerId && myPlayerId === hostPlayerId;
    const canStart = isHost && players.length >= 2;
    const startDisabled = !canStart || isStartingGame;

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

                <div style={{ marginTop: "16px", textAlign: "center" }}>
                    <button
                        className="btn-outline"
                        onClick={onAddMockPlayer}
                        style={{ fontSize: "12px", padding: "8px 12px" }}
                    >
                        🤖 CPUを追加 (テスト用)
                    </button>
                </div>
            </div>

            <button
                className={`start-btn lobby-start-btn ${isStartingGame ? "is-starting" : ""}`.trim()}
                onClick={onStartGame}
                disabled={startDisabled}
                title={
                    isStartingGame
                        ? "ゲーム開始準備中です"
                        : !isHost
                        ? "ホストのみ開始できます"
                        : players.length < 2
                            ? "2人以上で開始できます"
                            : undefined
                }
            >
                {isStartingGame ? "少々お待ちください…" : "▶ ゲーム開始"}
            </button>
            <p className="meta" style={{ textAlign: "center", marginTop: 8 }}>
                {isStartingGame
                    ? "ゲームを開始しています。少々お待ちください"
                    : !isHost
                    ? "ホストのみゲーム開始できます"
                    : players.length < 2
                        ? "ゲーム開始には2人以上必要です"
                        : "開始できます"}
            </p>
        </div>
    );
}
