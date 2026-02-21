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
    const [isComposing, setIsComposing] = useState(false);

    const flushDraft = useCallback(() => {
        if (disabled || !isMyTurn) return;
        if (isComposing) return;
        if (draft.length === 0) return;
        onSendDelta(draft);
        setDraft("");
    }, [disabled, isMyTurn, isComposing, draft, onSendDelta]);

    useEffect(() => {
        if (!disabled && isMyTurn) return;
        if (draft.length === 0) return;
        onSendDelta(draft);
        setDraft("");
    }, [disabled, isMyTurn, draft, onSendDelta]);

    useEffect(() => {
        if (disabled || !isMyTurn) return;
        if (isComposing) return;
        if (draft.length === 0) return;
        const t = setTimeout(() => {
            flushDraft();
        }, 900);
        return () => clearTimeout(t);
    }, [disabled, isMyTurn, isComposing, draft, flushDraft]);

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
                    // Keep the committed shared part immutable, and treat anything after it as local draft.
                    if (val.length <= fullPrompt.length) {
                        setDraft("");
                        return;
                    }
                    setDraft(val.slice(fullPrompt.length));
                }}
                onCompositionStart={() => {
                    setIsComposing(true);
                }}
                onCompositionEnd={(e) => {
                    setIsComposing(false);
                    const val = e.currentTarget.value;
                    if (val.length <= fullPrompt.length) {
                        setDraft("");
                        return;
                    }
                    setDraft(val.slice(fullPrompt.length));
                }}
                onBlur={flushDraft}
                readOnly={disabled || !isMyTurn}
                className={isMyTurn && !disabled ? "active-input is-typing" : "active-input"}
            />
        </section>
    );
}
