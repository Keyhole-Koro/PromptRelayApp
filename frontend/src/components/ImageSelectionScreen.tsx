import { useState } from "react";
import type { ImageRecord } from "../types";

interface ImageSelectionScreenProps {
    images: ImageRecord[];
    onSelectImage: (seq: number) => void;
}

export function ImageSelectionScreen({ images, onSelectImage }: ImageSelectionScreenProps) {
    const finalImages = images.filter((img) => img.isFinal);
    const [selectedSeq, setSelectedSeq] = useState<number | null>(
        finalImages.length > 0 ? finalImages[finalImages.length - 1].seq : null
    );

    if (finalImages.length === 0) {
        return (
            <div className="selection-screen">
                <h2>画像選択</h2>
                <div className="selection-empty">評価できる画像がありません</div>
            </div>
        );
    }

    return (
        <div className="selection-screen">
            <h2 className="selection-title">どの画像を評価しますか？</h2>

            <div className="selection-carousel">
                {finalImages.map((img) => {
                    const isSelected = img.seq === selectedSeq;
                    return (
                        <div
                            key={img.seq}
                            className={`selection-card ${isSelected ? "selected" : ""}`}
                            onClick={() => setSelectedSeq(img.seq)}
                        >
                            <img src={img.url} alt="Generated" className="selection-image" />
                            <div className="selection-prompt-box">
                                <p className="selection-prompt-text">{img.prompt}</p>
                            </div>
                            {isSelected && (
                                <div className="selection-check">
                                    ✓
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="selection-actions">
                <button
                    className="btn btn-primary btn-large"
                    disabled={selectedSeq === null}
                    onClick={() => {
                        if (selectedSeq !== null) {
                            onSelectImage(selectedSeq);
                        }
                    }}
                >
                    決定！
                </button>
            </div>
        </div>
    );
}
