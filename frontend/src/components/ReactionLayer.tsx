import { useEffect, useState } from "react";

interface ReactionProps {
    reaction: { emoji: string; id: string } | null;
}

interface FloatingEmoji {
    id: string;
    emoji: string;
    left: number;
    bottom: number;
}

export function ReactionLayer({ reaction }: ReactionProps) {
    const [emojis, setEmojis] = useState<FloatingEmoji[]>([]);

    useEffect(() => {
        if (!reaction) return;

        // 画面中央下付近から発生させる

        // ランダムに位置を散らす（Xは画面中央付近でばらけさせる）
        const leftPos = (window.innerWidth / 2) + (Math.random() * 100 - 50);
        const bottomPos = 60 + (Math.random() * 30);

        const newEmoji: FloatingEmoji = {
            id: reaction.id,
            emoji: reaction.emoji,
            left: leftPos,
            bottom: bottomPos,
        };

        setEmojis(prev => [...prev, newEmoji]);

        // Remove after animation (2000ms)
        setTimeout(() => {
            setEmojis(prev => prev.filter(e => e.id !== newEmoji.id));
        }, 2000);
    }, [reaction]);

    if (emojis.length === 0) return null;

    return (
        <div className="reaction-layer">
            {emojis.map(e => (
                <div
                    key={e.id}
                    className="floating-emoji"
                    style={{
                        left: `${e.left}px`,
                        bottom: `${e.bottom}px`,
                        // add slight random horizontal drift
                        animation: `float-pop-up 1.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards`
                    }}
                >
                    {e.emoji}
                </div>
            ))}
        </div>
    );
}
