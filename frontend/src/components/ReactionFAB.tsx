import { useState } from "react";

interface ReactionFABProps {
    onSendReaction: (emoji: string) => void;
}

const REACTIONS = ["😂", "🤯", "😮", "👏", "🔥", "✨", "👍", "❤️"];

export function ReactionFAB({ onSendReaction }: ReactionFABProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div
            className={`reaction-fab-container ${isOpen ? 'open' : ''}`}
            onMouseEnter={() => setIsOpen(true)}
            onMouseLeave={() => setIsOpen(false)}
        >
            <div className="reaction-fab-list">
                {REACTIONS.map(emoji => (
                    <button
                        key={emoji}
                        className="fab-reaction-btn"
                        onClick={() => onSendReaction(emoji)}
                        title={emoji}
                    >
                        {emoji}
                    </button>
                ))}
            </div>
            <button className="reaction-fab-main">
                <span className="fab-icon">⭐</span>
            </button>
        </div>
    );
}
