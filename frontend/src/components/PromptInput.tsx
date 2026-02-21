import { useState, useEffect, useRef, useCallback } from "react";

interface PromptInputProps {
    disabled: boolean;
    onSendDelta: (delta: string) => void;
}

const INTERVAL_SEC = 10;

export function PromptInput({ disabled, onSendDelta }: PromptInputProps) {
    const [text, setText] = useState("");
    const [countdown, setCountdown] = useState(INTERVAL_SEC);
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

    const timerPct = ((countdown - 1) / (INTERVAL_SEC - 1)) * 100;

    return (
        <section className="prompt card">
            <h2>📝 プロンプト入力（10秒ごと自動送信）</h2>
            <textarea
                id="promptInput"
                placeholder="ここに追記していくと、10秒ごとにdelta送信されます"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={disabled}
            />
            <div className="timer-wrap">
                <div
                    className="timer-bar"
                    style={{ width: `${timerPct}%` }}
                />
            </div>
            <p className="meta">next autosend: {countdown}s</p>
        </section>
    );
}
