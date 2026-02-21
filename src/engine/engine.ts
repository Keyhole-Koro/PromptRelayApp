// ─── Game Engine (side effects) ─────────────────────────────────
//
// One engine per room. Manages:
//   - state via reducer
//   - event log (for replay)
//   - tick scheduling (10s preview image gen)
//   - turn timer (30s)
//   - single-flight image generation
//   - worker IPC

import type { Clock, Disposable } from "../infra/clock.js";
import type { WorkerClient } from "../infra/workerClient.js";
import type { RoomState } from "../domain/types.js";
import type { GameEvent } from "../domain/events.js";
import { initialRoomState } from "../domain/types.js";
import { reduce } from "../domain/reducer.js";
import { randomUUID } from "node:crypto";

export type BroadcastFn = (state: RoomState, event: GameEvent) => void;

export class GameEngine {
    state: RoomState;
    events: GameEvent[] = [];
    private broadcast: BroadcastFn;
    private clock: Clock;
    private worker: WorkerClient;

    // Single-flight tracking
    inFlightRequestId: string | null = null;

    // Timers
    private tickDisposable: Disposable | null = null;
    private turnTimerDisposable: Disposable | null = null;

    // Seq counter (monotonic, engine-level)
    private seqCounter = 0;

    constructor(
        roomCode: string,
        clock: Clock,
        worker: WorkerClient,
        broadcast: BroadcastFn,
    ) {
        this.state = initialRoomState(roomCode);
        this.clock = clock;
        this.worker = worker;
        this.broadcast = broadcast;
    }

    // ── Core dispatch ──

    dispatch(event: GameEvent): void {
        this.state = reduce(this.state, event);
        this.events.push(event);
        this.broadcast(this.state, event);
    }

    // ── Room actions ──

    createRoom(): void {
        this.dispatch({
            type: "ROOM_CREATED",
            timestamp: this.clock.now(),
            roomCode: this.state.roomCode,
        });
    }

    joinRoom(playerId: string, playerName: string): void {
        this.dispatch({
            type: "PLAYER_JOINED",
            timestamp: this.clock.now(),
            playerId,
            playerName,
        });
    }

    async startGame(): Promise<void> {
        if (this.state.phase !== "lobby" || this.state.players.length === 0) return;

        // Fetch topic from worker
        let topicImageUrl = "https://placeholder.test/topic.png";
        let topicText: string | null = null;
        try {
            const topic = await this.worker.generateTopic({
                roomCode: this.state.roomCode,
            });
            topicImageUrl = topic.topicImageUrl;
            topicText = topic.topicText ?? null;
        } catch (err) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `Topic generation failed: ${err instanceof Error ? err.message : String(err)}`,
            });
        }

        this.dispatch({
            type: "GAME_STARTED",
            timestamp: this.clock.now(),
            topicImageUrl,
            topicText,
        });

        // Start first turn
        this.startTurn(0);
    }

    // ── Turn management ──

    private startTurn(playerIndex: number): void {
        this.dispatch({
            type: "TURN_STARTED",
            timestamp: this.clock.now(),
            currentPlayerIndex: playerIndex,
        });

        // Start 10s tick interval
        this.tickDisposable?.dispose();
        this.tickDisposable = this.clock.setInterval(() => {
            this.onTick();
        }, 10_000);

        // Start 30s turn timer
        this.turnTimerDisposable?.dispose();
        this.turnTimerDisposable = this.clock.setTimeout(() => {
            this.onTurnTimeout();
        }, 30_000);
    }

    private stopTimers(): void {
        this.tickDisposable?.dispose();
        this.tickDisposable = null;
        this.turnTimerDisposable?.dispose();
        this.turnTimerDisposable = null;
    }

    // ── Tick (10s interval) ──

    private onTick(): void {
        this.dispatch({
            type: "TICK_10S",
            timestamp: this.clock.now(),
        });

        // Single-flight: skip if in-flight
        if (this.inFlightRequestId !== null) return;

        const prompt = this.getCurrentPrompt();
        if (!prompt) return;

        this.triggerImageGeneration(prompt, false);
    }

    // ── Turn timeout (30s) ──

    private onTurnTimeout(): void {
        this.stopTimers();

        const prompt = this.getCurrentPrompt();
        const currentIndex = this.state.turn?.currentPlayerIndex ?? 0;
        const nextIndex = currentIndex + 1;
        const isRoundOver = nextIndex >= this.state.players.length;

        this.dispatch({
            type: "TURN_ENDED",
            timestamp: this.clock.now(),
            nextPlayerIndex: isRoundOver ? null : nextIndex,
        });

        // Trigger final image generation
        if (prompt) {
            this.triggerImageGeneration(prompt, true).then(() => {
                if (isRoundOver) {
                    this.onRoundComplete();
                } else {
                    this.startTurn(nextIndex);
                }
            });
        } else {
            if (isRoundOver) {
                this.onRoundComplete();
            } else {
                this.startTurn(nextIndex);
            }
        }
    }

    // ── Image generation (single-flight, player→ai sequential) ──

    private async triggerImageGeneration(prompt: string, isFinal: boolean): Promise<void> {
        const seq = ++this.seqCounter;
        const requestId = randomUUID();

        this.inFlightRequestId = requestId;

        // Player image
        this.dispatch({
            type: "IMAGE_REQUESTED",
            timestamp: this.clock.now(),
            requestId,
            seq,
            kind: "player",
            prompt,
            isFinal,
        });

        try {
            const playerResult = await this.worker.generateImage({
                requestId,
                kind: "player",
                prompt,
                isFinal,
            });

            this.dispatch({
                type: "IMAGE_READY",
                timestamp: this.clock.now(),
                requestId,
                seq,
                kind: "player",
                imageUrl: playerResult.imageUrl,
                isFinal,
            });
        } catch (err) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `Player image gen failed: ${err instanceof Error ? err.message : String(err)}`,
            });
        }

        // AI image (sequential, same single-flight)
        const aiSeq = ++this.seqCounter;
        const aiRequestId = randomUUID();

        this.dispatch({
            type: "IMAGE_REQUESTED",
            timestamp: this.clock.now(),
            requestId: aiRequestId,
            seq: aiSeq,
            kind: "ai",
            prompt,
            isFinal,
        });

        try {
            const aiResult = await this.worker.generateImage({
                requestId: aiRequestId,
                kind: "ai",
                prompt,
                isFinal,
            });

            this.dispatch({
                type: "IMAGE_READY",
                timestamp: this.clock.now(),
                requestId: aiRequestId,
                seq: aiSeq,
                kind: "ai",
                imageUrl: aiResult.imageUrl,
                isFinal,
            });
        } catch (err) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `AI image gen failed: ${err instanceof Error ? err.message : String(err)}`,
            });
        }

        this.inFlightRequestId = null;
    }

    // ── Round completion ──

    private async onRoundComplete(): Promise<void> {
        this.dispatch({
            type: "ROUND_COMPLETED",
            timestamp: this.clock.now(),
        });

        // Get latest final images for scoring
        const playerImg = this.getLatestFinalImage("player");
        const aiImg = this.getLatestFinalImage("ai");

        if (playerImg && aiImg) {
            try {
                const scoreResult = await this.worker.calculateScore({
                    playerImageUrl: playerImg.url,
                    aiImageUrl: aiImg.url,
                });
                this.dispatch({
                    type: "SCORED",
                    timestamp: this.clock.now(),
                    cosine: scoreResult.cosine,
                    score100: scoreResult.score100,
                });
            } catch (err) {
                this.dispatch({
                    type: "ERROR",
                    timestamp: this.clock.now(),
                    message: `Scoring failed: ${err instanceof Error ? err.message : String(err)}`,
                });
            }
        } else {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: "No final images available for scoring",
            });
        }
    }

    // ── Prompt management ──

    appendPrompt(playerId: string, delta: string): void {
        this.dispatch({
            type: "PROMPT_APPENDED",
            timestamp: this.clock.now(),
            playerId,
            delta,
        });
    }

    getCurrentPrompt(): string | null {
        if (this.state.prompts.length === 0) return null;
        return this.state.prompts.map((p) => p.delta).join("");
    }

    // ── Helpers ──

    private getLatestFinalImage(kind: "player" | "ai") {
        const images = kind === "player" ? this.state.playerImages : this.state.aiImages;
        const finals = images.filter((img) => img.isFinal);
        return finals.length > 0 ? finals[finals.length - 1] : null;
    }

    destroy(): void {
        this.stopTimers();
    }
}
