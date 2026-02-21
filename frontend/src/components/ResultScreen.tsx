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

    const { topicImageUrl, topicText, aiImages, prompts, score, players, selectedImageSeq } = roomState;
    const finalImage = selectedImageSeq
        ? aiImages.find(img => img.seq === selectedImageSeq && img.isFinal) ?? aiImages.find(img => img.seq === selectedImageSeq)
        : (aiImages.length > 0 ? aiImages[aiImages.length - 1] : null);
    const scoreVal = score?.score100 ?? 0;
    const cosineVal = score?.cosine ?? 0;
    const breakdown = score?.breakdown;

    return (
        <div className="result-overlay">
            <div className="result-modal">
                {/* Header */}
                <div className="result-header">
                    <h1 className="result-title">🎉 RESULT 🎉</h1>
                    <p className="result-subtitle">全ターン完了！みんなの協力の成果は…？</p>
                </div>

                {/* Score Hero */}
                {score && (
                    <div className="result-score-hero">
                        <div className={`score-rank-badge ${getScoreClass(scoreVal)}`}>
                            {getScoreLabel(scoreVal)}
                        </div>
                        <div className="score-numbers">
                            <div className="score-main">{Math.round(scoreVal)}<span className="score-unit">/ 100</span></div>
                            <div className="score-cosine">cosine: {cosineVal.toFixed(4)}</div>
                        </div>
                    </div>
                )}

                {breakdown && (
                    <div className="result-breakdown card">
                        <h3>Score Breakdown</h3>
                        {[
                            { key: "semantic", label: "Semantic", value: breakdown.semantic },
                            { key: "composition", label: "Composition", value: breakdown.composition },
                            { key: "color", label: "Color", value: breakdown.color },
                            { key: "detail", label: "Detail", value: breakdown.detail },
                        ].map((item) => (
                            <div key={item.key} className="breakdown-row">
                                <div className="breakdown-head">
                                    <span>{item.label}</span>
                                    <span>{Math.round(item.value * 100)}</span>
                                </div>
                                <div className="breakdown-bar">
                                    <div className="breakdown-fill" style={{ width: `${Math.max(0, Math.min(100, item.value * 100))}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Images Comparison */}
                <div className="result-comparison">
                    <div className="result-img-card">
                        <span className="result-img-label">📷 お題</span>
                        {topicImageUrl ? (
                            <img src={topicImageUrl} alt="Topic" className="result-img" />
                        ) : (
                            <div className="result-img-placeholder">No Image</div>
                        )}
                        {topicText && <p className="result-img-caption">"{topicText}"</p>}
                    </div>

                    <div className="result-vs">VS</div>

                    <div className="result-img-card">
                        <span className="result-img-label">🎨 みんなの作品</span>
                        {finalImage ? (
                            <img src={finalImage.url} alt="Final" className="result-img" />
                        ) : (
                            <div className="result-img-placeholder">生成中…</div>
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
