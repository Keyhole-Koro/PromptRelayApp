// ─── Room Manager ───────────────────────────────────────────────
import { GameEngine } from "./engine.js";
export class RoomManager {
    rooms = new Map();
    clock;
    worker;
    constructor(clock, worker) {
        this.clock = clock;
        this.worker = worker;
    }
    /**
     * Generate a unique 3-digit room code (100–999).
     */
    generateCode() {
        for (let i = 0; i < 100; i++) {
            const code = String(100 + Math.floor(Math.random() * 900));
            if (!this.rooms.has(code))
                return code;
        }
        throw new Error("Could not generate unique room code");
    }
    createRoom(broadcast) {
        const code = this.generateCode();
        const engine = new GameEngine(code, this.clock, this.worker, broadcast);
        engine.createRoom();
        this.rooms.set(code, engine);
        return engine;
    }
    getRoom(code) {
        return this.rooms.get(code);
    }
    deleteRoom(code) {
        const engine = this.rooms.get(code);
        if (engine) {
            engine.destroy();
            this.rooms.delete(code);
        }
    }
    get size() {
        return this.rooms.size;
    }
}
//# sourceMappingURL=roomManager.js.map