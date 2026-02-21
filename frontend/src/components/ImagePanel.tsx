interface ImagePanelProps {
    title: string;
    imageUrl: string | null;
    placeholder: string;
    size?: "large" | "small";
    className?: string;
    labelTone?: "topic" | "player" | "ai";
}

export function ImagePanel({
    title,
    imageUrl,
    placeholder,
    size = "large",
    className = "",
    labelTone,
}: ImagePanelProps) {
    return (
        <article className={`panel card ${className}`.trim()}>
            <div className={`image-frame ${size}`}>
                <div className={`image-label ${labelTone ? `image-label-${labelTone}` : ""}`.trim()}>{title}</div>
                {imageUrl ? (
                    <img src={imageUrl} alt={title} style={{ display: "block" }} />
                ) : (
                    <p className="placeholder">{placeholder}</p>
                )}
            </div>
        </article>
    );
}
