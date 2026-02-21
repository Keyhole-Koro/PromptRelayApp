export type Phase = "lobby" | "playing" | "selecting" | "scoring" | "done";

export interface PlayerInfo {
    id: string;
    name: string;
    joinOrder: number;
}

export interface TurnState {
    currentPlayerIndex: number;
    startedAt: number;
    durationMs: number;
    order: string[];
    seq: number;
}

export interface ImageRecord {
    url: string;
    requestId: string;
    seq: number;
    kind: "player" | "ai";
    prompt: string;
    isFinal: boolean;
}

export interface ScoreResult {
    cosine: number;
    score100: number;
    breakdown?: {
        semantic: number;
        composition: number;
        color: number;
        detail: number;
    };
}

export interface PromptEntry {
    playerId: string;
    delta: string;
    timestamp: number;
}

export interface RoomState {
    roomCode: string;
    phase: Phase;
    players: PlayerInfo[];
    turn: TurnState | null;
    prompts: PromptEntry[];
    playerImages: ImageRecord[];
    aiImages: ImageRecord[];
    selectedImageSeq: number | null;
    topicImageUrl: string | null;
    topicText: string | null;
    score: ScoreResult | null;
    errors: string[];
}

export type IncomingMessage =
    | { type: "room_state"; state: RoomState }
    | { type: "event"; event: { type: string;[key: string]: any } }
    | { type: "error"; message: string }
    | { type: "connected"; playerId: string };
