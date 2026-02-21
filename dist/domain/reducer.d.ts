import type { RoomState } from "./types.js";
import type { GameEvent } from "./events.js";
/**
 * Pure reducer: (state, event) → state
 * No side effects. No I/O. Deterministic.
 */
export declare function reduce(state: RoomState, event: GameEvent): RoomState;
//# sourceMappingURL=reducer.d.ts.map