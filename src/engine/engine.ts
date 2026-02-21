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
import { pickTopicFromPool } from "../infra/topicPool.js";
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

        // Fetch topic from local pool instead of worker
        let topicImageUrl = "https://placeholder.test/topic.png";
        let topicText: string | null = null;
        try {
            const topic = await pickTopicFromPool();
            topicImageUrl = `/api/pool/${topic.servePath}/${topic.imageFile}`;
            topicText = topic.prompt;
        } catch (err) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `Topic pool failed: ${err instanceof Error ? err.message : String(err)}`,
            });
        }

        this.dispatch({
            type: "GAME_STARTED",
            timestamp: this.clock.now(),
            topicImageUrl,
            topicText: null, // Never reveal the topic prompt to players
        });

        const turnOrder = this.shuffle([...this.state.players.map((p) => p.id)]);

        // Start first turn with a 4.5s delay for the initial intro countdown
        this.startTurn(0, turnOrder, 4500);
    }

    // ── Turn management ──

    private getTurnDurationMs(): number {
        const count = this.state.players.length;
        if (count <= 1) return 90_000;
        if (count === 2) return 70_000;
        if (count === 3) return 50_000;
        return 30_000; // 4+
    }

    private startTurn(playerIndex: number, order: string[], delayMs: number = 0): void {
        const startedAt = this.clock.now() + delayMs;
        const turnDuration = this.getTurnDurationMs();
        this.dispatch({
            type: "TURN_STARTED",
            timestamp: startedAt,
            currentPlayerIndex: playerIndex,
            order,
            durationMs: turnDuration,
        });

        // Start 10s tick interval (relative to real start time)
        this.tickDisposable?.dispose();
        // Since we handle the delay manually below, just reset it to null initially
        this.tickDisposable = null;

        if (delayMs > 0) {
            let timeoutDisp: Disposable | null = null;
            let intervalDisp: Disposable | null = null;

            timeoutDisp = this.clock.setTimeout(() => {
                intervalDisp = this.clock.setInterval(() => {
                    this.onTick();
                }, 10_000);
            }, delayMs);

            this.tickDisposable = {
                dispose: () => {
                    timeoutDisp?.dispose();
                    intervalDisp?.dispose();
                }
            };
        } else {
            this.tickDisposable = this.clock.setInterval(() => {
                this.onTick();
            }, 10_000);
        }

        // Turn timer (dynamic duration + delayMs wait)
        this.turnTimerDisposable?.dispose();
        this.turnTimerDisposable = this.clock.setTimeout(() => {
            this.onTurnTimeout();
        }, turnDuration + delayMs);
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
        const currentOrder = this.state.turn?.order ?? this.state.players.map((p) => p.id);
        const isRoundOver = nextIndex >= currentOrder.length;

        this.dispatch({
            type: "TURN_ENDED",
            timestamp: this.clock.now(),
            nextPlayerIndex: isRoundOver ? null : nextIndex,
        });

        // Trigger final image generation in the background (don't block next turn)
        if (prompt) {
            this.triggerImageGeneration(prompt, true);
        }

        if (isRoundOver) {
            // Wait a moment for the last image gen to start, then go to selection
            this.clock.setTimeout(() => this.onRoundComplete(), 1000);
        } else {
            // Start next turn immediately — don't wait for image generation
            this.startTurn(nextIndex, currentOrder);
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
            const playerResult = await this.worker.generatePlayerImage({
                requestId,
                prompt,
            });

            this.dispatch({
                type: "IMAGE_READY",
                timestamp: this.clock.now(),
                requestId,
                seq,
                kind: "player",
                prompt,
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
            // AI references only the topic image to create its own prompt
            const themeImageUrl = this.state.topicImageUrl ?? "";

            const aiResult = await this.worker.generateAiImage({
                requestId: aiRequestId,
                themeImageUrl,
                recentImageUrl: themeImageUrl,
                recentPrompt: prompt,
            });

            this.dispatch({
                type: "IMAGE_READY",
                timestamp: this.clock.now(),
                requestId: aiRequestId,
                seq: aiSeq,
                kind: "ai",
                prompt: aiResult.prompt,
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
        // Enter "selecting" phase — frontend shows ImageSelectionScreen
    }

    async selectImage(playerId: string, seq: number): Promise<void> {
        if (this.state.phase !== "selecting") return;

        const playerImg = this.state.playerImages.find((img) => img.seq === seq);
        if (!playerImg) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `Selected image seq ${seq} not found`,
            });
            return;
        }

        // Find the latest AI image
        const aiImg = this.state.aiImages[this.state.aiImages.length - 1];

        this.dispatch({
            type: "IMAGE_SELECTED",
            timestamp: this.clock.now(),
            playerId,
            selectedSeq: seq,
        });

        if (!this.state.topicImageUrl || !aiImg) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: "Missing images for scoring",
            });
            // Fallback so game doesn't get stuck
            this.dispatch({
                type: "SCORED",
                timestamp: this.clock.now(),
                cosine: 0, score100: 0, playerScore100: 0, aiScore100: 0, winner: "draw",
            });
            return;
        }

        try {
            const scoreResult = await this.worker.calculateScore({
                topicImageUrl: this.state.topicImageUrl,
                playerImageUrl: playerImg.url,
                aiImageUrl: aiImg.url,
            });
            this.dispatch({
                type: "SCORED",
                timestamp: this.clock.now(),
                cosine: scoreResult.cosine,
                score100: scoreResult.score100,
                playerScore100: scoreResult.playerScore100,
                aiScore100: scoreResult.aiScore100,
                winner: scoreResult.winner,
            });
        } catch (err) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `Scoring failed: ${err instanceof Error ? err.message : String(err)}`,
            });
            // Fallback so game doesn't get stuck
            this.dispatch({
                type: "SCORED",
                timestamp: this.clock.now(),
                cosine: 0, score100: 0, playerScore100: 0, aiScore100: 0, winner: "draw",
            });
        }
    }

    // ── Prompt management ──

    appendPrompt(playerId: string, delta: string): boolean {
        if (this.state.phase !== "playing" || !this.state.turn) return false;
        const activePlayerId = this.state.turn.order[this.state.turn.currentPlayerIndex];
        if (!activePlayerId || activePlayerId !== playerId) return false;
        this.dispatch({
            type: "PROMPT_APPENDED",
            timestamp: this.clock.now(),
            playerId,
            delta,
        });
        return true;
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

    private shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    destroy(): void {
        this.stopTimers();
    }
}
