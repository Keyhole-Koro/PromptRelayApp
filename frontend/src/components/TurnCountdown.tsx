import { useState, useEffect, useRef } from "react";
import type { TurnState, PlayerInfo, Phase } from "../types";

interface TurnCountdownProps {
    players: PlayerInfo[];
    turn: TurnState | null;
    phase: Phase;
    onCountdownActive: (isActive: boolean, isFirstTurnCountdown?: boolean) => void;
}

const STEPS = ["name", "3", "2", "1", "GO!"] as const;

export function TurnCountdown({ players, turn, phase, onCountdownActive }: TurnCountdownProps) {
    const [step, setStep] = useState<number>(-1);
    const [targetName, setTargetName] = useState<string | null>(null);
    const [isFirstTurn, setIsFirstTurn] = useState<boolean>(false);
    const [isGameOver, setIsGameOver] = useState<boolean>(false);

    // Keep track so we don't spam the callback
    const isActiveRef = useRef(false);

    useEffect(() => {
        if (phase !== "playing" && phase !== "scoring") {
            setStep(-1);
            if (isActiveRef.current) {
                isActiveRef.current = false;
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
                    const firstPlayer = players.find(p => p.id === firstPlayerId);

                    if (targetName !== firstPlayer?.name) {
                        setTargetName(firstPlayer?.name ?? "Player");
                        setIsFirstTurn(true);
                        setIsGameOver(false);
                    }

                    if (!isActiveRef.current) {
                        isActiveRef.current = true;
                        onCountdownActive(true, true);
                    }

                    // Determine step based on timeUntilStart (counting down to 0)
                    // timeUntilStart: 5500 -> 4000 (name) -> 3000 (3) -> 2000 (2) -> 1000 (1) -> 0 (GO!) -> -1000 (Done)
                    if (timeUntilStart > 4000) setStep(0); // name (1.5s)
                    else if (timeUntilStart > 3000) setStep(1); // 3 (1s)
                    else if (timeUntilStart > 2000) setStep(2); // 2 (1s)
                    else if (timeUntilStart > 1000) setStep(3); // 1 (1s)
                    else if (timeUntilStart > 0) setStep(4); // GO! (1s, ending exactly at 0)
                    else {
                        // We are in the -1000 to 0 range (GO! phase actually extends slightly past 0 if we want it to linger)
                        // Actually, if we want GO! to linger for 1s AFTER the turn starts:
                        // Let's make GO! disappear exactly when the turn starts, OR linger for 1s.
                        // "GO! (1s, ending exactly at 0)" means it's visible from 1000ms until 0ms.
                        // Let's let it peek past 0 for a bit.
                    }

                    // Let GO linger for 1 second after 0
                    if (timeUntilStart <= 0 && timeUntilStart > -1000) {
                        setStep(4); // GO!
                    }

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
                            setTargetName(null);
                        }
                    } else {
                        const nextPlayerId = turn.order[nextIndex];
                        const nextPlayer = players.find(p => p.id === nextPlayerId);
                        if (targetName !== nextPlayer?.name) {
                            setTargetName(nextPlayer?.name ?? "Player");
                            setIsGameOver(false);
                        }
                    }

                    if (isFirstTurn) setIsFirstTurn(false);

                    if (!isActiveRef.current) {
                        isActiveRef.current = true;
                        onCountdownActive(true, false);
                    }

                    // remaining: 5000 -> 4000 (name) -> 3000 (3) -> 2000 (2) -> 1000 (1) -> 0 (GO!)
                    if (remaining > 4000) setStep(0); // name (1s)
                    else if (remaining > 3000) setStep(1); // 3
                    else if (remaining > 2000) setStep(2); // 2
                    else if (remaining > 1000) setStep(3); // 1
                    else if (remaining > 0) setStep(4); // GO!
                    else if (remaining > -1000) setStep(4); // Linger GO! for 1s into the next turn

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
                onCountdownActive(false, false);
            }
        };
    }, [phase, turn?.seq, turn?.startedAt, turn?.durationMs, turn?.currentPlayerIndex, players, onCountdownActive]);

    if (step < 0) return null;

    const currentStep = STEPS[step];

    let displayText: string = currentStep;
    if (currentStep === "name") {
        if (isGameOver) displayText = "最終結果へ！";
        else if (isFirstTurn) displayText = `最初は… ${targetName} の番！`;
        else displayText = `次は… ${targetName}`;
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
