import { useState, useCallback } from "react";
import { useEffect } from "react";

interface PromptInputProps {
    disabled: boolean;
    isMyTurn: boolean;
    fullPrompt: string;
    onSendDelta: (delta: string) => void;
}

export function PromptInput({ disabled, isMyTurn, fullPrompt, onSendDelta }: PromptInputProps) {
    const [draft, setDraft] = useState("");
    const flushDraft = useCallback(() => {
        if (disabled || !isMyTurn) return;
        if (!draft.trim()) return;
        onSendDelta(draft);
        setDraft("");
    }, [disabled, isMyTurn, draft, onSendDelta]);

    useEffect(() => {
        if (disabled || !isMyTurn || !draft.trim()) return;
        const t = setTimeout(() => {
            flushDraft();
        }, 300);
        return () => clearTimeout(t);
    }, [disabled, isMyTurn, draft, flushDraft]);

    return (
        <section className={`prompt card ${isMyTurn && !disabled ? "my-turn" : ""}`}>
            <div className="prompt-header">
                <h2>📝 プロンプト入力（WS同期）</h2>
            </div>
            <textarea
                id="promptInput"
                placeholder="ここに全員のプロンプトがリアルタイム同期表示されます"
                value={fullPrompt}
                readOnly
                className="active-input"
            />
            <div className="join-row">
                <input
                    placeholder={isMyTurn ? "追記したいテキストを入力（自動同期）" : "あなたのターンではありません"}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    disabled={disabled}
                    className={isMyTurn && !disabled ? "active-input" : ""}
                />
            </div>
        </section>
    );
}
