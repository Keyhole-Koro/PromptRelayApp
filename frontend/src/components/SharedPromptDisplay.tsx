import type { PromptEntry } from "../types";

interface SharedPromptDisplayProps {
    prompts: PromptEntry[];
}

export function SharedPromptDisplay({ prompts }: SharedPromptDisplayProps) {
    const fullPrompt = prompts.map(p => p.delta).join("");

    return (
        <section className="shared-prompt card">
            <h2>📜 現在のプロンプト</h2>
            <div className="shared-prompt-content">
                {fullPrompt ? (
                    <span className="text">{fullPrompt}</span>
                ) : (
                    <span className="meta italic">まだプロンプトがありません</span>
                )}
            </div>
        </section>
    );
}
