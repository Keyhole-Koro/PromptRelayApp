import { useState, useEffect, useRef, useCallback } from "react";

interface PromptInputProps {
    disabled: boolean;
    isMyTurn: boolean;
    onSendDelta: (delta: string) => void;
}

const INTERVAL_SEC = 10;

export function PromptInput({ disabled, isMyTurn, onSendDelta }: PromptInputProps) {
    const [text, setText] = useState("");
    const [, setCountdown] = useState(INTERVAL_SEC);
    const textRef = useRef(text);
    textRef.current = text;

    const flush = useCallback(() => {
        const delta = textRef.current;
        if (delta.trim()) {
            onSendDelta(delta);
            setText("");
        }
        setCountdown(INTERVAL_SEC);
    }, [onSendDelta]);

    useEffect(() => {
        const tick = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    flush();
                    return INTERVAL_SEC;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, [flush]);

    return (
        <section className={`prompt card ${isMyTurn && !disabled ? "my-turn" : ""}`}>
            <div className="prompt-header">
                <h2>📝 プロンプト入力（10秒ごと自動送信）</h2>
            </div>
            <textarea
                id="promptInput"
                placeholder="ここに追記していくと、10秒ごとにdelta送信されます"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled}
                className={isMyTurn && !disabled ? "active-input" : ""}
            />
        </section>
    );
}
