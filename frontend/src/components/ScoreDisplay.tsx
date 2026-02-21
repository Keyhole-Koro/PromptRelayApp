import type { ScoreResult } from "../types";

interface ScoreDisplayProps {
    score: ScoreResult | null;
}

export function ScoreDisplay({ score }: ScoreDisplayProps) {
    if (!score) return null;

    return (
        <section className="card score-display">
            <div className="score-value">{Math.round(score.score100)}</div>
            <div className="score-label">similarity score</div>
        </section>
    );
}
