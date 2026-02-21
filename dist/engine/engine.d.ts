import type { Clock } from "../infra/clock.js";
import type { WorkerClient } from "../infra/workerClient.js";
import type { RoomState } from "../domain/types.js";
import type { GameEvent } from "../domain/events.js";
export type BroadcastFn = (state: RoomState, event: GameEvent) => void;
export declare class GameEngine {
    state: RoomState;
    events: GameEvent[];
    private broadcast;
    private clock;
    private worker;
    inFlightRequestId: string | null;
    private tickDisposable;
    private turnTimerDisposable;
    private seqCounter;
    constructor(roomCode: string, clock: Clock, worker: WorkerClient, broadcast: BroadcastFn);
    dispatch(event: GameEvent): void;
    createRoom(): void;
    joinRoom(playerId: string, playerName: string): void;
    startGame(): Promise<void>;
    private startTurn;
    private stopTimers;
    private onTick;
    private onTurnTimeout;
    private triggerImageGeneration;
    private onRoundComplete;
    appendPrompt(playerId: string, delta: string): boolean;
    getCurrentPrompt(): string | null;
    private getLatestFinalImage;
    private shuffle;
    destroy(): void;
}
//# sourceMappingURL=engine.d.ts.map