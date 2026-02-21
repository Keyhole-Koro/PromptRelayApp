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
        if (draft.length === 0) return;
        onSendDelta(draft);
        setDraft("");
    }, [disabled, isMyTurn, draft, onSendDelta]);

    useEffect(() => {
        if (!disabled && isMyTurn) return;
        if (draft.length === 0) return;
        onSendDelta(draft);
        setDraft("");
    }, [disabled, isMyTurn, draft, onSendDelta]);

    useEffect(() => {
        if (disabled || !isMyTurn) return;
        if (draft.length === 0) return;
        const t = setInterval(() => {
            flushDraft();
        }, 250);
        return () => clearInterval(t);
    }, [disabled, isMyTurn, draft, flushDraft]);

    return (
        <section className={`prompt card ${isMyTurn && !disabled ? "my-turn" : ""}`}>
            <div className="prompt-header">
                <h2>📝 プロンプト入力</h2>
            </div>
            <textarea
                id="promptInput"
                placeholder={isMyTurn && !disabled ? "続きをここに入力してストーリーを繋げましょう" : "ここに全員のプロンプトが表示されます"}
                value={isMyTurn && !disabled ? fullPrompt + draft : fullPrompt}
                onChange={(e) => {
                    if (disabled || !isMyTurn) return;
                    const val = e.target.value;
                    // Allow appending to the existing prompt
                    if (val.startsWith(fullPrompt)) {
                        setDraft(val.substring(fullPrompt.length));
                    } else if (fullPrompt.startsWith(val)) {
                        // Handled deleting into the immutable part by resetting draft
                        setDraft("");
                    }
                }}
                onBlur={flushDraft}
                readOnly={disabled || !isMyTurn}
                className={isMyTurn && !disabled ? "active-input is-typing" : "active-input"}
            />
        </section>
    );
}
