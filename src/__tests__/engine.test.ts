import { describe, it, expect, beforeEach } from "vitest";
import { GameEngine } from "../engine/engine.js";
import { FakeClock } from "../infra/clock.js";
import { FakeWorkerClient } from "../infra/workerClient.js";
import type { RoomState } from "../domain/types.js";
import type { GameEvent } from "../domain/events.js";

describe("engine", () => {
    let clock: FakeClock;
    let worker: FakeWorkerClient;
    let engine: GameEngine;
    let broadcasts: Array<{ state: RoomState; event: GameEvent }>;

    beforeEach(() => {
        clock = new FakeClock();
        worker = new FakeWorkerClient();
        broadcasts = [];
        engine = new GameEngine("100", clock, worker, (state, event) => {
            broadcasts.push({ state: { ...state }, event });
        });
    });

    function setupGame(): void {
        engine.createRoom();
        engine.joinRoom("p1", "Alice");
        engine.joinRoom("p2", "Bob");
    }

    async function startGameAndTurn(): Promise<void> {
        setupGame();
        await engine.startGame();
        // After startGame: GAME_STARTED dispatched, TURN_STARTED dispatched
        // Add a prompt so tick has something to generate from
        engine.appendPrompt("p1", "a cute cat");
    }

    // ─── Test (b): Tick at 10s → IMAGE_REQUESTED ──

    it("(b) emits IMAGE_REQUESTED after 10s tick", async () => {
        await startGameAndTurn();

        // Clear broadcasts to focus on tick
        broadcasts.length = 0;

        // Advance 10 seconds → tick fires
        clock.advance(10_000);

        // Wait for async image generation to complete
        await new Promise((r) => setTimeout(r, 50));

        const imageRequested = broadcasts.filter(
            (b) => b.event.type === "IMAGE_REQUESTED",
        );
        expect(imageRequested.length).toBeGreaterThanOrEqual(1);
        expect(imageRequested[0].event.type).toBe("IMAGE_REQUESTED");
        if (imageRequested[0].event.type === "IMAGE_REQUESTED") {
            expect(imageRequested[0].event.kind).toBe("player");
            expect(imageRequested[0].event.isFinal).toBe(false);
        }
    });

    // ─── Test (c): In-flight skip ──

    it("(c) skips IMAGE_REQUESTED if in-flight", async () => {
        await startGameAndTurn();

        // Simulate slow worker: responses take 15 seconds
        worker.delayMs = 15_000;

        broadcasts.length = 0;

        // First tick at 10s → starts image gen (but worker is slow)
        clock.advance(10_000);

        // The image gen is in-flight now
        expect(engine.inFlightRequestId).not.toBeNull();

        // Second tick at 20s → should skip because still in-flight
        clock.advance(10_000);

        // Only the first tick should have produced IMAGE_REQUESTED (for player kind)
        const imageRequested = broadcasts.filter(
            (b) => b.event.type === "IMAGE_REQUESTED",
        );
        // First tick produced 1 IMAGE_REQUESTED (player); second tick should be skipped
        expect(imageRequested).toHaveLength(1);
    });

    // ─── Test (d): Turn timeout → final generation ──

    it("(d) triggers TURN_ENDED and final image generation after 30s", async () => {
        await startGameAndTurn();
        broadcasts.length = 0;

        // Advance 30 seconds → turn timeout
        clock.advance(30_000);

        // Wait for async
        await new Promise((r) => setTimeout(r, 50));

        const turnEnded = broadcasts.filter((b) => b.event.type === "TURN_ENDED");
        expect(turnEnded).toHaveLength(1);

        const finalImageReqs = broadcasts.filter(
            (b) => b.event.type === "IMAGE_REQUESTED" && b.event.type === "IMAGE_REQUESTED" && b.event.isFinal,
        );
        expect(finalImageReqs.length).toBeGreaterThanOrEqual(1);

        // Worker should have been called for final generation
        const finalCalls = worker.imageCalls.filter((c) => c.isFinal);
        expect(finalCalls.length).toBeGreaterThanOrEqual(1);
    });

    // ─── Test: Worker failure doesn't crash engine ──

    it("dispatches ERROR event when worker fails", async () => {
        setupGame();
        worker.shouldFail = true;

        await engine.startGame();

        // Should have an ERROR event for topic generation failure
        const errors = broadcasts.filter((b) => b.event.type === "ERROR");
        expect(errors.length).toBeGreaterThanOrEqual(1);

        // Game should still proceed (GAME_STARTED should still fire)
        const gameStarted = broadcasts.filter(
            (b) => b.event.type === "GAME_STARTED",
        );
        expect(gameStarted).toHaveLength(1);

        // Engine state should not be crashed
        expect(engine.state.phase).toBe("playing");
    });
});
