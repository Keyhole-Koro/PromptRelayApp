import type { ImageRecord } from "../types";
import { ImagePanel } from "./ImagePanel";

interface GameBoardProps {
    topicImageUrl: string | null;
    topicText: string | null;
    playerImages: ImageRecord[];
    aiImages: ImageRecord[];
}

function latestUrl(images: ImageRecord[]): string | null {
    if (images.length === 0) return null;
    return images[images.length - 1]?.url ?? null;
}

export function GameBoard({
    topicImageUrl,
    topicText,
    playerImages,
    aiImages,
}: GameBoardProps) {
    return (
        <section className="board">
            <div>
                <ImagePanel
                    title="🎯 お題"
                    imageUrl={topicImageUrl}
                    placeholder="お題画像を待機中"
                />
                {topicText && (
                    <p className="meta" style={{ marginTop: 8 }}>
                        お題テキスト: {topicText}
                    </p>
                )}
            </div>

            <ImagePanel
                title="🖼 プレイヤー画像"
                imageUrl={latestUrl(playerImages)}
                placeholder="生成待機中"
            />

            <ImagePanel
                title="🤖 AIリアルタイム"
                imageUrl={latestUrl(aiImages)}
                placeholder="生成待機中"
                size="small"
                className="ai-panel"
            />
        </section>
    );
}
