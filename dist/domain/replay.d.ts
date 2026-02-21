import type { RoomState } from "./types.js";
import type { GameEvent } from "./events.js";
/**
 * Replay a sequence of events to reconstruct state.
 * Starts from a blank room state with the code from the first ROOM_CREATED event.
 */
export declare function replay(events: GameEvent[]): RoomState;
//# sourceMappingURL=replay.d.ts.map