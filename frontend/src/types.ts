export type Phase = "lobby" | "playing" | "scoring" | "done";

export interface PlayerInfo {
    id: string;
    name: string;
    joinOrder: number;
}

export interface TurnState {
    currentPlayerIndex: number;
    startedAt: number;
    durationMs: number;
    seq: number;
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

export interface RoomState {
    roomCode: string;
    phase: Phase;
    players: PlayerInfo[];
    turn: TurnState | null;
    prompts: { playerId: string; delta: string; timestamp: number }[];
    playerImages: ImageRecord[];
    aiImages: ImageRecord[];
    topicImageUrl: string | null;
    topicText: string | null;
    score: ScoreResult | null;
    errors: string[];
}

export type IncomingMessage =
    | { type: "room_state"; state: RoomState }
    | { type: "event"; event: unknown }
    | { type: "error"; message: string };
