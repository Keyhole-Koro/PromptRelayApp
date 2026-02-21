interface TopBarProps {
    wsStatus: "connecting" | "connected" | "disconnected" | "error";
    phase: string;
    roomCode: string;
}

export function TopBar({ wsStatus, phase, roomCode }: TopBarProps) {
    return (
        <header className="topbar">
            <h1>PromptRelay</h1>
            <div className="status-wrap">
                <span className="badge" data-status={wsStatus}>
                    WS: {wsStatus}
                </span>
                <span className="badge">phase: {phase}</span>
                <span className="badge">room: {roomCode}</span>
            </div>
        </header>
    );
}
