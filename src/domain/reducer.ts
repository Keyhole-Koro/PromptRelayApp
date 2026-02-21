import type { RoomState } from "./types.js";
import type { GameEvent } from "./events.js";
import { initialRoomState } from "./types.js";

/**
 * Pure reducer: (state, event) → state
 * No side effects. No I/O. Deterministic.
 */
export function reduce(state: RoomState, event: GameEvent): RoomState {
    switch (event.type) {
        case "ROOM_CREATED":
            return { ...initialRoomState(event.roomCode) };

        case "PLAYER_JOINED":
            // Max 10 players
            if (state.players.length >= 10) return state;
            // No duplicates
            if (state.players.some((p) => p.id === event.playerId)) return state;
            return {
                ...state,
                players: [
                    ...state.players,
                    {
                        id: event.playerId,
                        name: event.playerName,
                        joinOrder: state.players.length,
                    },
                ],
            };

        case "GAME_STARTED":
            if (state.phase !== "lobby") return state;
            if (state.players.length === 0) return state;
            return {
                ...state,
                phase: "playing",
                topicImageUrl: event.topicImageUrl,
                topicText: event.topicText ?? null,
            };

        case "TURN_STARTED":
            return {
                ...state,
                turn: {
                    currentPlayerIndex: event.currentPlayerIndex,
                    startedAt: event.timestamp,
                    durationMs: 30_000,
                    seq: state.turn?.seq ?? 0,
                },
            };

        case "TICK_10S":
            // Tick is informational for reducer; engine handles side effects
            return state;

        case "PROMPT_APPENDED":
            return {
                ...state,
                prompts: [
                    ...state.prompts,
                    {
                        playerId: event.playerId,
                        delta: event.delta,
                        timestamp: event.timestamp,
                    },
                ],
            };

        case "IMAGE_REQUESTED":
            return {
                ...state,
                turn: state.turn
                    ? { ...state.turn, seq: event.seq }
                    : state.turn,
            };

        case "IMAGE_READY": {
            // Reject stale responses (old requestId/seq)
            if (event.seq <= state.lastProcessedSeq) return state;

            const record = {
                url: event.imageUrl,
                requestId: event.requestId,
                seq: event.seq,
                kind: event.kind,
                isFinal: event.isFinal,
            };

            const updatedState = { ...state, lastProcessedSeq: event.seq };

            if (event.kind === "player") {
                return {
                    ...updatedState,
                    playerImages: [...state.playerImages, record],
                };
            } else {
                return {
                    ...updatedState,
                    aiImages: [...state.aiImages, record],
                };
            }
        }

        case "TURN_ENDED": {
            if (event.nextPlayerIndex === null) {
                // Round is about to complete
                return { ...state, turn: null };
            }
            return {
                ...state,
                turn: state.turn
                    ? {
                        ...state.turn,
                        currentPlayerIndex: event.nextPlayerIndex,
                    }
                    : null,
            };
        }

        case "ROUND_COMPLETED":
            return { ...state, phase: "scoring", turn: null };

        case "SCORED":
            return {
                ...state,
                phase: "done",
                score: { cosine: event.cosine, score100: event.score100 },
            };

        case "ERROR":
            return {
                ...state,
                errors: [...state.errors, event.message],
            };

        default: {
            // Exhaustiveness check
            const _exhaustive: never = event;
            return _exhaustive;
        }
    }
}
