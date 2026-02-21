// ─── Room Manager ───────────────────────────────────────────────

import type { Clock } from "../infra/clock.js";
import type { WorkerClient } from "../infra/workerClient.js";
import { GameEngine, type BroadcastFn } from "./engine.js";

export class RoomManager {
    private rooms = new Map<string, GameEngine>();
    private clock: Clock;
    private worker: WorkerClient;

    constructor(clock: Clock, worker: WorkerClient) {
        this.clock = clock;
        this.worker = worker;
    }

    /**
     * Generate a unique 3-digit room code (100–999).
     */
    private generateCode(): string {
        for (let i = 0; i < 100; i++) {
            const code = String(100 + Math.floor(Math.random() * 900));
            if (!this.rooms.has(code)) return code;
        }
        throw new Error("Could not generate unique room code");
    }

    createRoom(broadcast: BroadcastFn): GameEngine {
        const code = this.generateCode();
        const engine = new GameEngine(code, this.clock, this.worker, broadcast);
        engine.createRoom();
        this.rooms.set(code, engine);
        return engine;
    }

    getRoom(code: string): GameEngine | undefined {
        return this.rooms.get(code);
    }

    deleteRoom(code: string): void {
        const engine = this.rooms.get(code);
        if (engine) {
            engine.destroy();
            this.rooms.delete(code);
        }
    }

    get size(): number {
        return this.rooms.size;
    }
}
