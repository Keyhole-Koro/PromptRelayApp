interface ImagePanelProps {
    title: string;
    imageUrl: string | null;
    placeholder: string;
    size?: "large" | "small";
    className?: string;
}

export function ImagePanel({
    title,
    imageUrl,
    placeholder,
    size = "large",
    className = "",
}: ImagePanelProps) {
    return (
        <article className={`panel card ${className}`.trim()}>
            <h2>{title}</h2>
            <div className={`image-frame ${size}`}>
                {imageUrl ? (
                    <img src={imageUrl} alt={title} style={{ display: "block" }} />
                ) : (
                    <p className="placeholder">{placeholder}</p>
                )}
            </div>
        </article>
    );
}
