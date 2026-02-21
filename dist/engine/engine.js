// ─── Game Engine (side effects) ─────────────────────────────────
//
// One engine per room. Manages:
//   - state via reducer
//   - event log (for replay)
//   - tick scheduling (10s preview image gen)
//   - turn timer (30s)
//   - single-flight image generation
//   - worker IPC
import { initialRoomState } from "../domain/types.js";
import { reduce } from "../domain/reducer.js";
import { randomUUID } from "node:crypto";
export class GameEngine {
    state;
    events = [];
    broadcast;
    clock;
    worker;
    // Single-flight tracking
    inFlightRequestId = null;
    // Timers
    tickDisposable = null;
    turnTimerDisposable = null;
    // Seq counter (monotonic, engine-level)
    seqCounter = 0;
    constructor(roomCode, clock, worker, broadcast) {
        this.state = initialRoomState(roomCode);
        this.clock = clock;
        this.worker = worker;
        this.broadcast = broadcast;
    }
    // ── Core dispatch ──
    dispatch(event) {
        this.state = reduce(this.state, event);
        this.events.push(event);
        this.broadcast(this.state, event);
    }
    // ── Room actions ──
    createRoom() {
        this.dispatch({
            type: "ROOM_CREATED",
            timestamp: this.clock.now(),
            roomCode: this.state.roomCode,
        });
    }
    joinRoom(playerId, playerName) {
        this.dispatch({
            type: "PLAYER_JOINED",
            timestamp: this.clock.now(),
            playerId,
            playerName,
        });
    }
    async startGame() {
        if (this.state.phase !== "lobby" || this.state.players.length === 0)
            return;
        // Fetch topic from worker
        let topicImageUrl = "https://placeholder.test/topic.png";
        let topicText = null;
        try {
            const topic = await this.worker.generateTopic({
                roomCode: this.state.roomCode,
            });
            topicImageUrl = topic.topicImageUrl;
            topicText = topic.topicText ?? null;
        }
        catch (err) {
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
        const turnOrder = this.shuffle([...this.state.players.map((p) => p.id)]);
        // Start first turn
        this.startTurn(0, turnOrder);
    }
    // ── Turn management ──
    startTurn(playerIndex, order) {
        this.dispatch({
            type: "TURN_STARTED",
            timestamp: this.clock.now(),
            currentPlayerIndex: playerIndex,
            order,
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
    stopTimers() {
        this.tickDisposable?.dispose();
        this.tickDisposable = null;
        this.turnTimerDisposable?.dispose();
        this.turnTimerDisposable = null;
    }
    // ── Tick (10s interval) ──
    onTick() {
        this.dispatch({
            type: "TICK_10S",
            timestamp: this.clock.now(),
        });
        // Single-flight: skip if in-flight
        if (this.inFlightRequestId !== null)
            return;
        const prompt = this.getCurrentPrompt();
        if (!prompt)
            return;
        this.triggerImageGeneration(prompt, false);
    }
    // ── Turn timeout (30s) ──
    onTurnTimeout() {
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
        // Trigger final image generation
        if (prompt) {
            this.triggerImageGeneration(prompt, true).then(() => {
                if (isRoundOver) {
                    this.onRoundComplete();
                }
                else {
                    this.startTurn(nextIndex, currentOrder);
                }
            });
        }
        else {
            if (isRoundOver) {
                this.onRoundComplete();
            }
            else {
                this.startTurn(nextIndex, currentOrder);
            }
        }
    }
    // ── Image generation (single-flight, player→ai sequential) ──
    async triggerImageGeneration(prompt, isFinal) {
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
        }
        catch (err) {
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
        }
        catch (err) {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: `AI image gen failed: ${err instanceof Error ? err.message : String(err)}`,
            });
        }
        this.inFlightRequestId = null;
    }
    // ── Round completion ──
    async onRoundComplete() {
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
            }
            catch (err) {
                this.dispatch({
                    type: "ERROR",
                    timestamp: this.clock.now(),
                    message: `Scoring failed: ${err instanceof Error ? err.message : String(err)}`,
                });
            }
        }
        else {
            this.dispatch({
                type: "ERROR",
                timestamp: this.clock.now(),
                message: "No final images available for scoring",
            });
        }
    }
    // ── Prompt management ──
    appendPrompt(playerId, delta) {
        if (this.state.phase !== "playing" || !this.state.turn)
            return false;
        const activePlayerId = this.state.turn.order[this.state.turn.currentPlayerIndex];
        if (!activePlayerId || activePlayerId !== playerId)
            return false;
        this.dispatch({
            type: "PROMPT_APPENDED",
            timestamp: this.clock.now(),
            playerId,
            delta,
        });
        return true;
    }
    getCurrentPrompt() {
        if (this.state.prompts.length === 0)
            return null;
        return this.state.prompts.map((p) => p.delta).join("");
    }
    // ── Helpers ──
    getLatestFinalImage(kind) {
        const images = kind === "player" ? this.state.playerImages : this.state.aiImages;
        const finals = images.filter((img) => img.isFinal);
        return finals.length > 0 ? finals[finals.length - 1] : null;
    }
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }
    destroy() {
        this.stopTimers();
    }
}
//# sourceMappingURL=engine.js.map