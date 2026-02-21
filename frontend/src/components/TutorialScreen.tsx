import { useState, useEffect } from "react";

interface TutorialScreenProps {
    onClose: () => void;
}

const TUTORIAL_STEPS = [
    {
        title: "1. お題を見て描き始めよう！",
        desc: "AIが生成した『お題画像』が表示されます。\nそこから連想する要素をプロンプト（英語）で入力して、次の人にパスしましょう！",
        mockContent: (
            <div className="tutorial-mock">
                <div className="tutorial-mock-img-placeholder">
                    <span>🖼️ お題画像</span>
                </div>
                <div className="tutorial-mock-input">
                    A beautiful sunset...
                </div>
            </div>
        )
    },
    {
        title: "2. どんどん繋げて、AI画像を生成！",
        desc: "あなたの入力したプロンプトが前の結果に追加され、新しい画像が作られます。\n次の人はそれを見て、さらに連想を膨らませます！",
        mockContent: (
            <div className="tutorial-mock">
                <div className="tutorial-mock-input">
                    A beautiful sunset <span style={{ color: "var(--neon-pink)" }}>, over the ocean</span>...
                </div>
                <div className="tutorial-mock-img-placeholder" style={{ borderColor: "var(--neon-pink)" }}>
                    <span>🌊 海の夕焼け画像</span>
                </div>
            </div>
        )
    },
    {
        title: "3. ベストな一枚を選んで結果発表！",
        desc: "全員のターンが終わったら、最後に生成された画像の中から一番良いものを選びます。\n最初のお題にどれだけ近いかでスコアが決まる！",
        mockContent: (
            <div className="tutorial-mock tutorial-mock-horizontal">
                <div className="tutorial-mock-img-small"><span>🌅</span></div>
                <div className="tutorial-mock-img-small"><span>🌇</span></div>
                <div className="tutorial-mock-img-small selected"><span>✅</span></div>
            </div>
        )
    }
];

export function TutorialScreen({ onClose }: TutorialScreenProps) {
    const [step, setStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setStep((prev) => {
                if (prev >= TUTORIAL_STEPS.length - 1) {
                    return 0; // Loop back to start
                }
                return prev + 1;
            });
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    const currentStep = TUTORIAL_STEPS[step];

    return (
        <div className="tutorial-overlay">
            <div className="tutorial-modal">
                <button className="tutorial-close-btn" onClick={onClose}>×</button>

                <h2 className="tutorial-title">遊び方</h2>

                <div className="tutorial-content-wrap">
                    <div className="tutorial-mock-container" key={step}>
                        {currentStep.mockContent}
                    </div>

                    <div className="tutorial-text-container" key={`text-${step}`}>
                        <h3 className="tutorial-step-title">{currentStep.title}</h3>
                        <p className="tutorial-step-desc">
                            {currentStep.desc.split('\n').map((line, i) => (
                                <span key={i}>{line}<br /></span>
                            ))}
                        </p>
                    </div>
                </div>

                <div className="tutorial-dots">
                    {TUTORIAL_STEPS.map((_, i) => (
                        <div
                            key={i}
                            className={`tutorial-dot ${i === step ? "active" : ""}`}
                            onClick={() => setStep(i)}
                        />
                    ))}
                </div>

                {step === TUTORIAL_STEPS.length - 1 && (
                    <button className="tutorial-start-btn" onClick={onClose}>
                        さっそく遊ぶ！
                    </button>
                )}
            </div>
        </div>
    );
}
