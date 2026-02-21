import { useState } from "react";

type Mode = "select" | "solo" | "multi";

interface HomeScreenProps {
    onSoloPlay: (playerName: string) => void;
    onCreateRoom: (playerName: string) => void;
    onJoinRoom: (roomCode: string, playerName: string) => void;
}

export function HomeScreen({ onSoloPlay, onCreateRoom, onJoinRoom }: HomeScreenProps) {
    const [mode, setMode] = useState<Mode>("select");
    const [name, setName] = useState("");
    const [roomCode, setRoomCode] = useState("");

    const playerName = name.trim() || "Player";

    if (mode === "select") {
        return (
            <div className="home-screen">
                <div className="home-title-wrap">
                    <h1 className="home-title">PromptRelay</h1>
                    <p className="home-subtitle">AIお絵描きリレーゲーム</p>
                </div>
                <div className="mode-cards">
                    <button
                        className="mode-card"
                        onClick={() => setMode("solo")}
                    >
                        <span className="mode-icon">🎯</span>
                        <span className="mode-label">一人でプレイ</span>
                        <span className="mode-desc">練習モード – ソロで挑戦</span>
                    </button>
                    <button
                        className="mode-card"
                        onClick={() => setMode("multi")}
                    >
                        <span className="mode-icon">👥</span>
                        <span className="mode-label">複数人でプレイ</span>
                        <span className="mode-desc">ルームを作成 or 参加</span>
                    </button>
                </div>
            </div>
        );
    }

    if (mode === "solo") {
        return (
            <div className="home-screen">
                <button className="back-btn" onClick={() => setMode("select")}>
                    ← 戻る
                </button>
                <div className="home-title-wrap">
                    <h1 className="home-title">🎯 ソロプレイ</h1>
                </div>
                <div className="join-form card">
                    <label className="field">
                        <span>プレイヤー名</span>
                        <input
                            type="text"
                            placeholder="名前を入力"
                            maxLength={24}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoFocus
                        />
                    </label>
                    <button
                        className="start-btn"
                        onClick={() => onSoloPlay(playerName)}
                    >
                        🚀 ゲーム開始
                    </button>
                </div>
            </div>
        );
    }

    // multi mode
    return (
        <div className="home-screen">
            <button className="back-btn" onClick={() => setMode("select")}>
                ← 戻る
            </button>
            <div className="home-title-wrap">
                <h1 className="home-title">👥 マルチプレイ</h1>
            </div>
            <div className="join-form card">
                <label className="field">
                    <span>プレイヤー名</span>
                    <input
                        type="text"
                        placeholder="名前を入力"
                        maxLength={24}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoFocus
                    />
                </label>
                <div className="multi-actions">
                    <button
                        className="start-btn"
                        onClick={() => onCreateRoom(playerName)}
                    >
                        🎮 ルーム作成
                    </button>
                    <div className="divider-text">or</div>
                    <div className="join-row">
                        <input
                            type="text"
                            placeholder="ROOM CODE"
                            maxLength={8}
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        />
                        <button
                            className="start-btn"
                            onClick={() => {
                                if (roomCode.trim()) onJoinRoom(roomCode.trim(), playerName);
                            }}
                            disabled={!roomCode.trim()}
                        >
                            🚀 参加
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
