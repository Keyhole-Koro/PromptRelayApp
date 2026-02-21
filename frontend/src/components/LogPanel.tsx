import { useEffect, useRef } from "react";

interface LogPanelProps {
    logs: string[];
}

export function LogPanel({ logs }: LogPanelProps) {
    const preRef = useRef<HTMLPreElement>(null);

    useEffect(() => {
        if (preRef.current) {
            preRef.current.scrollTop = preRef.current.scrollHeight;
        }
    }, [logs]);

    return (
        <section className="card">
            <h2>📋 ログ</h2>
            <pre ref={preRef} className="log-pre" aria-live="polite">
                {logs.join("\n")}
            </pre>
        </section>
    );
}
