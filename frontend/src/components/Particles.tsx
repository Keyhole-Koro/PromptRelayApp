import { useEffect, useRef } from "react";

const COLORS = [
    "rgba(56,182,255,0.35)",
    "rgba(160,120,240,0.30)",
    "rgba(0,212,200,0.25)",
    "rgba(255,130,200,0.20)",
    "rgba(255,200,100,0.25)",
];

export function Particles() {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        for (let i = 0; i < 30; i++) {
            const p = document.createElement("div");
            p.className = "particle";
            const size = Math.random() * 4 + 2;
            const color = COLORS[Math.floor(Math.random() * COLORS.length)];
            const left = Math.random() * 100;
            const duration = Math.random() * 15 + 10;
            const delay = Math.random() * 20;

            p.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${left}%;
        background: ${color};
        box-shadow: 0 0 ${size * 3}px ${color};
        animation-duration: ${duration}s;
        animation-delay: ${delay}s;
      `;
            el.appendChild(p);
        }

        return () => {
            el.innerHTML = "";
        };
    }, []);

    return <div ref={containerRef} className="particles" />;
}
