import type { Clock } from "../infra/clock.js";
import type { WorkerClient } from "../infra/workerClient.js";
import { GameEngine, type BroadcastFn } from "./engine.js";
export declare class RoomManager {
    private rooms;
    private clock;
    private worker;
    constructor(clock: Clock, worker: WorkerClient);
    /**
     * Generate a unique 3-digit room code (100–999).
     */
    private generateCode;
    createRoom(broadcast: BroadcastFn): GameEngine;
    getRoom(code: string): GameEngine | undefined;
    deleteRoom(code: string): void;
    get size(): number;
}
//# sourceMappingURL=roomManager.d.ts.map