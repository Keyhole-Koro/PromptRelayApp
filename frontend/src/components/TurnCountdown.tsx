import { useState, useEffect, useRef } from "react";
import type { TurnState, PlayerInfo, Phase } from "../types";

interface TurnCountdownProps {
    players: PlayerInfo[];
    turn: TurnState | null;
    phase: Phase;
    myPlayerId: string | null;
    onCountdownActive: (isActive: boolean, isFirstTurnCountdown?: boolean) => void;
}

const STEPS = ["name", "3", "2", "1", "GO!"] as const;

export function TurnCountdown({ players, turn, phase, myPlayerId, onCountdownActive }: TurnCountdownProps) {
    const [step, setStep] = useState<number>(-1);
    const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
    const [isFirstTurn, setIsFirstTurn] = useState<boolean>(false);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);

    // Keep track so we don't spam the callback
    const isActiveRef = useRef(false);
    const isFirstDimmedRef = useRef(false);

    useEffect(() => {
        if (phase !== "playing" && phase !== "scoring") {
            setStep(-1);
            if (isActiveRef.current) {
                isActiveRef.current = false;
                isFirstDimmedRef.current = false;
                onCountdownActive(false, false);
            }
            return;
        }

        if (!turn || !turn.order.length) return;

        let rafId: number;

        const updateClock = () => {
            const now = Date.now();
            const isFirst = turn.seq === 0;

            if (isFirst) {
                // Game Start sequence: "最初は〇〇" -> 3 -> 2 -> 1 -> GO!
                const firstTurnDuration = 1500 + 1000 * 4; // 5.5s total before startedAt
                const timeUntilStart = turn.startedAt - now;

                if (timeUntilStart <= firstTurnDuration && timeUntilStart > -1000) {
                    // We are in the countdown window
                    const firstPlayerId = turn.order[turn.currentPlayerIndex];

                    if (targetPlayerId !== firstPlayerId) {
                        setTargetPlayerId(firstPlayerId ?? null);
                        setIsFirstTurn(true);
                        setIsGameOver(false);
                    }

                    const shouldBeDimmed = timeUntilStart > 0;
                    if (!isActiveRef.current || isFirstDimmedRef.current !== shouldBeDimmed) {
                        isActiveRef.current = true;
                        isFirstDimmedRef.current = shouldBeDimmed;
                        onCountdownActive(true, shouldBeDimmed);
                    }

                    // Determine step based on timeUntilStart (counting down to 0)
                    // timeUntilStart: 4500 -> 3000 (name) -> 2000 (3) -> 1000 (2) -> 0 (1) -> -1000 (GO!)
                    if (timeUntilStart > 3000) setStep(0); // name (1.5s)
                    else if (timeUntilStart > 2000) setStep(1); // 3 (1s)
                    else if (timeUntilStart > 1000) setStep(2); // 2 (1s)
                    else if (timeUntilStart > 0) setStep(3); // 1 (1s)
                    else if (timeUntilStart > -1000) setStep(4); // GO! (1s, ending EXACTLY 1s after turn starts)

                    rafId = requestAnimationFrame(updateClock);
                    return;
                }
            } else {
                // Subsequent turns: "次は〇〇" -> 3 -> 2 -> 1 -> GO!
                const subsequentDuration = 1000 * 5; // 5s total before NEXT turn starts
                const elapsed = now - turn.startedAt;
                const remaining = turn.durationMs - elapsed;

                if (remaining <= subsequentDuration && remaining > -1000) {
                    const nextIndex = turn.currentPlayerIndex + 1;
                    const isOver = nextIndex >= turn.order.length;

                    if (isOver) {
                        if (!isGameOver) {
                            setIsGameOver(true);
                            setTargetPlayerId(null);
                        }
                    } else {
                        const nextPlayerId = turn.order[nextIndex];
                        if (targetPlayerId !== nextPlayerId) {
                            setTargetPlayerId(nextPlayerId);
                            setIsGameOver(false);
                        }
                    }

                    if (isFirstTurn) setIsFirstTurn(false);

                    const shouldBeDimmed = false;
                    if (!isActiveRef.current || isFirstDimmedRef.current !== shouldBeDimmed) {
                        isActiveRef.current = true;
                        isFirstDimmedRef.current = shouldBeDimmed;
                        onCountdownActive(true, shouldBeDimmed);
                    }

                    // remaining: 5000 -> 3000 (name) -> 2000 (3) -> 1000 (2) -> 0 (1) -> -1000 (GO!)
                    if (remaining > 3000) setStep(0); // name (2s)
                    else if (remaining > 2000) setStep(1); // 3
                    else if (remaining > 1000) setStep(2); // 2
                    else if (remaining > 0) setStep(3); // 1
                    else if (remaining > -1000) setStep(4); // GO!

                    rafId = requestAnimationFrame(updateClock);
                    return;
                }
            }

            // If we are outside the countdown windows, clean up
            if (step !== -1) {
                setStep(-1);
            }
            if (isActiveRef.current) {
                isActiveRef.current = false;
                isFirstDimmedRef.current = false;
                onCountdownActive(false, false);
            }

            // Keep polling
            rafId = requestAnimationFrame(updateClock);
        };

        rafId = requestAnimationFrame(updateClock);

        return () => {
            cancelAnimationFrame(rafId);
            if (isActiveRef.current) {
                isActiveRef.current = false;
                isFirstDimmedRef.current = false;
                onCountdownActive(false, false);
            }
        };
    }, [phase, turn?.seq, turn?.startedAt, turn?.durationMs, turn?.currentPlayerIndex, players, onCountdownActive]);

    if (step < 0) return null;

    const currentStep = STEPS[step];

    const targetPlayer = players.find(p => p.id === targetPlayerId);
    const targetNameStr = targetPlayer?.name ?? "Player";
    const isTargetMe = targetPlayerId !== null && targetPlayerId === myPlayerId;

    let displayText: string = currentStep;
    if (currentStep === "name") {
        if (isGameOver) displayText = "最終結果へ！";
        else if (isFirstTurn) {
            displayText = isTargetMe ? "最初は… あなたの番！" : `最初は… ${targetNameStr} の番！`;
        } else {
            displayText = isTargetMe ? "次は… あなた！" : `次は… ${targetNameStr}`;
        }
    } else if (currentStep === "GO!" && isGameOver) {
        displayText = "終了！";
    }

    const isEmphasis = currentStep === "GO!";
    const isNumber = ["3", "2", "1"].includes(currentStep);

    return (
        <div className="countdown-overlay">
            <div
                key={`${isFirstTurn ? 'start' : turn?.seq}-${step}`}
                className={`countdown-text ${isEmphasis ? "countdown-go" : ""} ${isNumber ? "countdown-number" : ""} ${currentStep === "name" ? "countdown-name" : ""}`}
            >
                {displayText}
            </div>
        </div>
    );
}
