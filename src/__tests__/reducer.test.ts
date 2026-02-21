import { describe, it, expect } from "vitest";
import { reduce } from "../domain/reducer.js";
import { initialRoomState } from "../domain/types.js";
import { replay } from "../domain/replay.js";
import type { GameEvent } from "../domain/events.js";
import type { RoomState } from "../domain/types.js";

// ─── helpers ──

const ts = () => Date.now();

function createAndJoin(roomCode = "123"): { state: RoomState; events: GameEvent[] } {
    const events: GameEvent[] = [
        { type: "ROOM_CREATED", timestamp: ts(), roomCode },
        { type: "PLAYER_JOINED", timestamp: ts(), playerId: "p1", playerName: "Alice" },
        { type: "PLAYER_JOINED", timestamp: ts(), playerId: "p2", playerName: "Bob" },
    ];
    const state = replay(events);
    return { state, events };
}

// ─── Test (a): Room create → join ──

describe("reducer", () => {
    it("(a) creates a room and adds players", () => {
        const { state } = createAndJoin();
        expect(state.phase).toBe("lobby");
        expect(state.players).toHaveLength(2);
        expect(state.players[0].name).toBe("Alice");
        expect(state.players[1].name).toBe("Bob");
        expect(state.players[0].joinOrder).toBe(0);
        expect(state.players[1].joinOrder).toBe(1);
        expect(state.roomCode).toBe("123");
    });

    it("rejects duplicate player join", () => {
        const { state } = createAndJoin();
        const next = reduce(state, {
            type: "PLAYER_JOINED",
            timestamp: ts(),
            playerId: "p1",
            playerName: "Alice Again",
        });
        expect(next.players).toHaveLength(2);
    });

    it("rejects joining when room is full (10 players)", () => {
        let state = initialRoomState("999");
        state = reduce(state, { type: "ROOM_CREATED", timestamp: ts(), roomCode: "999" });
        for (let i = 0; i < 10; i++) {
            state = reduce(state, {
                type: "PLAYER_JOINED",
                timestamp: ts(),
                playerId: `p${i}`,
                playerName: `Player${i}`,
            });
        }
        expect(state.players).toHaveLength(10);

        // 11th player should be rejected
        state = reduce(state, {
            type: "PLAYER_JOINED",
            timestamp: ts(),
            playerId: "p10",
            playerName: "ExtraPlayer",
        });
        expect(state.players).toHaveLength(10);
    });

    // ─── Test (e): Stale IMAGE_READY is rejected ──

    it("(e) ignores IMAGE_READY with stale seq", () => {
        const { state: lobbyState } = createAndJoin();

        // Start game and turn
        let state = reduce(lobbyState, {
            type: "GAME_STARTED",
            timestamp: ts(),
            topicImageUrl: "https://test/topic.png",
            topicText: "cat",
        });
        state = reduce(state, {
            type: "TURN_STARTED",
            timestamp: ts(),
            currentPlayerIndex: 0,
            order: ["p1", "p2"],
        });

        // Process an IMAGE_READY with seq=5
        state = reduce(state, {
            type: "IMAGE_REQUESTED",
            timestamp: ts(),
            requestId: "r1",
            seq: 5,
            kind: "player",
            prompt: "a cat",
            isFinal: false,
        });
        state = reduce(state, {
            type: "IMAGE_READY",
            timestamp: ts(),
            requestId: "r1",
            seq: 5,
            kind: "player",
            imageUrl: "https://test/img5.png",
            isFinal: false,
        });
        expect(state.lastProcessedSeq).toBe(5);
        expect(state.playerImages).toHaveLength(1);

        // Now send a stale IMAGE_READY with seq=3 → should be ignored
        state = reduce(state, {
            type: "IMAGE_READY",
            timestamp: ts(),
            requestId: "r-old",
            seq: 3,
            kind: "player",
            imageUrl: "https://test/img3-stale.png",
            isFinal: false,
        });
        expect(state.lastProcessedSeq).toBe(5); // unchanged
        expect(state.playerImages).toHaveLength(1); // still 1

        // A newer IMAGE_READY with seq=7 → should be accepted
        state = reduce(state, {
            type: "IMAGE_READY",
            timestamp: ts(),
            requestId: "r2",
            seq: 7,
            kind: "player",
            imageUrl: "https://test/img7.png",
            isFinal: false,
        });
        expect(state.lastProcessedSeq).toBe(7);
        expect(state.playerImages).toHaveLength(2);
    });

    // ─── Prompt append ──

    it("appends prompts correctly", () => {
        const { state: lobbyState } = createAndJoin();
        let state = reduce(lobbyState, {
            type: "GAME_STARTED",
            timestamp: ts(),
            topicImageUrl: "https://test/topic.png",
            topicText: null,
        });
        state = reduce(state, {
            type: "TURN_STARTED",
            timestamp: ts(),
            currentPlayerIndex: 0,
            order: ["p1", "p2"],
        });
        state = reduce(state, {
            type: "PROMPT_APPENDED",
            timestamp: ts(),
            playerId: "p1",
            delta: "a cute ",
        });
        state = reduce(state, {
            type: "PROMPT_APPENDED",
            timestamp: ts(),
            playerId: "p2",
            delta: "cat on a skateboard",
        });
        expect(state.prompts).toHaveLength(2);
        expect(state.prompts.map((p) => p.delta).join("")).toBe("a cute cat on a skateboard");
    });

    // ─── Replay ──

    it("replay reconstructs state from events", () => {
        const events: GameEvent[] = [
            { type: "ROOM_CREATED", timestamp: 1000, roomCode: "456" },
            { type: "PLAYER_JOINED", timestamp: 1001, playerId: "p1", playerName: "Alice" },
            { type: "PLAYER_JOINED", timestamp: 1002, playerId: "p2", playerName: "Bob" },
            {
                type: "GAME_STARTED",
                timestamp: 1003,
                topicImageUrl: "https://test/t.png",
                topicText: "dog",
            },
            { type: "TURN_STARTED", timestamp: 1004, currentPlayerIndex: 0, order: ["p1", "p2"] },
            {
                type: "PROMPT_APPENDED",
                timestamp: 1005,
                playerId: "p1",
                delta: "hello world",
            },
        ];

        const state = replay(events);
        expect(state.roomCode).toBe("456");
        expect(state.phase).toBe("playing");
        expect(state.players).toHaveLength(2);
        expect(state.prompts).toHaveLength(1);
        expect(state.turn?.currentPlayerIndex).toBe(0);
        expect(state.topicText).toBe("dog");
    });

    // ─── Error event ──

    it("records errors without crashing state", () => {
        const { state: lobbyState } = createAndJoin();
        const state = reduce(lobbyState, {
            type: "ERROR",
            timestamp: ts(),
            message: "Worker crashed",
        });
        expect(state.errors).toHaveLength(1);
        expect(state.errors[0]).toBe("Worker crashed");
        expect(state.phase).toBe("lobby"); // unchanged
    });
});
