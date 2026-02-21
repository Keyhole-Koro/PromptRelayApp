import type { RoomState } from "./types.js";
import type { GameEvent } from "./events.js";
import { initialRoomState } from "./types.js";
import { reduce } from "./reducer.js";

/**
 * Replay a sequence of events to reconstruct state.
 * Starts from a blank room state with the code from the first ROOM_CREATED event.
 */
export function replay(events: GameEvent[]): RoomState {
    const firstCreated = events.find((e) => e.type === "ROOM_CREATED");
    const roomCode = firstCreated?.type === "ROOM_CREATED" ? firstCreated.roomCode : "000";
    let state = initialRoomState(roomCode);
    for (const event of events) {
        state = reduce(state, event);
    }
    return state;
}
