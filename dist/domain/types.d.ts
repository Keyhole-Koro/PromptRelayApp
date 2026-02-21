export type Phase = "lobby" | "playing" | "scoring" | "done";
export interface PlayerInfo {
    id: string;
    name: string;
    joinOrder: number;
}
export interface PromptEntry {
    playerId: string;
    delta: string;
    timestamp: number;
}
export interface ImageRecord {
    url: string;
    requestId: string;
    seq: number;
    kind: "player" | "ai";
    isFinal: boolean;
}
export interface ScoreResult {
    cosine: number;
    score100: number;
}
export interface TurnState {
    currentPlayerIndex: number;
    startedAt: number;
    durationMs: number;
    order: string[];
    seq: number;
}
export interface RoomState {
    roomCode: string;
    phase: Phase;
    players: PlayerInfo[];
    turn: TurnState | null;
    prompts: PromptEntry[];
    playerImages: ImageRecord[];
    aiImages: ImageRecord[];
    lastProcessedSeq: number;
    topicImageUrl: string | null;
    topicText: string | null;
    score: ScoreResult | null;
    errors: string[];
}
export declare function initialRoomState(roomCode: string): RoomState;
//# sourceMappingURL=types.d.ts.map