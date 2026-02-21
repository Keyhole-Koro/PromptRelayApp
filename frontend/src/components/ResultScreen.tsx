import type { RoomState } from "../types";

interface ResultScreenProps {
    roomState: RoomState | null;
    onBackToHome: () => void;
}

function getScoreClass(score: number): string {
    if (score >= 80) return "score-s";
    if (score >= 60) return "score-a";
    if (score >= 40) return "score-b";
    return "score-c";
}

function getScoreLabel(score: number): string {
    if (score >= 90) return "SS";
    if (score >= 80) return "S";
    if (score >= 70) return "A";
    if (score >= 60) return "B";
    if (score >= 40) return "C";
    return "D";
}

export function ResultScreen({ roomState, onBackToHome }: ResultScreenProps) {
    if (!roomState) return null;

    const { topicImageUrl, topicText, playerImages, aiImages, prompts, score, players, selectedImageSeq, phase } = roomState;
    const finalImage = selectedImageSeq
        ? playerImages.find(img => img.seq === selectedImageSeq) ?? playerImages[playerImages.length - 1]
        : (playerImages.length > 0 ? playerImages[playerImages.length - 1] : null);
    const scoreVal = score?.score100 ?? 0;
    const cosineVal = score?.cosine ?? 0;
    const winnerLabel = score?.winner === "player" ? "プレイヤー" : score?.winner === "ai" ? "AI" : "引き分け";
    const isJudging = phase === "scoring" && !score;

    return (
        <div className="result-overlay">
            <div className="result-modal">
                {/* Header */}
                <div className="result-header">
                    <h1 className="result-title">🎉 RESULT 🎉</h1>
                    <p className="result-subtitle">全ターン完了！みんなの協力の成果は…？</p>
                </div>

                {isJudging && (
                    <div className="result-score-hero">
                        <div className="score-numbers">
                            <div className="score-main">再現度を計測中...</div>
                        </div>
                    </div>
                )}

                {/* Score Hero */}
                {score && (
                    <div className="result-score-hero">
                        <div className={`score-rank-badge ${getScoreClass(scoreVal)}`}>
                            {getScoreLabel(scoreVal)}
                        </div>
                        <div className="score-numbers">
                            <div className="score-main">{Math.round(scoreVal)}<span className="score-unit">/ 100</span></div>
                            <div className="score-cosine">cosine: {cosineVal.toFixed(4)}</div>
                            <div className="score-cosine">プレイヤー: {Math.round(score.playerScore100)} / AI: {Math.round(score.aiScore100)}</div>
                            <div className="score-cosine">勝者は... {winnerLabel}</div>
                        </div>
                    </div>
                )}

                {/* Topic Image */}
                <div className="result-topic-card">
                    <span className="result-img-label">📷 お題</span>
                    {topicImageUrl ? (
                        <img src={topicImageUrl} alt="Topic" className="result-img" />
                    ) : (
                        <div className="result-img-placeholder">No Image</div>
                    )}
                    {topicText && <p className="result-img-caption">"{topicText}"</p>}
                </div>

                {/* Player VS AI */}
                <div className="result-comparison">
                    <div className="result-img-card">
                        <span className="result-img-label">🎨 みんなの作品</span>
                        {finalImage ? (
                            <img src={finalImage.url} alt="Player" className="result-img" />
                        ) : (
                            <div className="result-img-placeholder">画像なし</div>
                        )}
                    </div>

                    <div className="result-vs">VS</div>

                    <div className="result-img-card">
                        <span className="result-img-label">🤖 AIの作品</span>
                        {aiImages.length > 0 ? (
                            <img src={aiImages[aiImages.length - 1].url} alt="AI" className="result-img" />
                        ) : (
                            <div className="result-img-placeholder">画像なし</div>
                        )}
                    </div>
                </div>

                {/* Prompt Chain */}
                <div className="result-prompt-section">
                    <h3>📜 繋いだプロンプト</h3>
                    <div className="result-prompt-chain">
                        {prompts.length > 0 ? (
                            prompts.map((p, i) => {
                                const player = players.find((pl) => pl.id === p.playerId);
                                return (
                                    <span key={i} className="result-prompt-chip" title={player?.name ?? p.playerId}>
                                        <span className="chip-author">{player?.name?.charAt(0) ?? "?"}</span>
                                        {p.delta}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="meta">プロンプトなし</span>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="result-footer">
                    <button className="result-home-btn" onClick={onBackToHome}>
                        🏠 ホームに戻る
                    </button>
                </div>
            </div>
        </div>
    );
}
