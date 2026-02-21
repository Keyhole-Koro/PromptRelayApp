// ─── Game Events (discriminated union) ──────────────────────────

export interface RoomCreatedEvent {
    type: "ROOM_CREATED";
    timestamp: number;
    roomCode: string;
}

export interface PlayerJoinedEvent {
    type: "PLAYER_JOINED";
    timestamp: number;
    playerId: string;
    playerName: string;
}

export interface GameStartedEvent {
    type: "GAME_STARTED";
    timestamp: number;
    topicImageUrl: string;
    topicText: string | null;
}

export interface TurnStartedEvent {
    type: "TURN_STARTED";
    timestamp: number;
    currentPlayerIndex: number;
    order: string[];
}

export interface Tick10sEvent {
    type: "TICK_10S";
    timestamp: number;
}

export interface PromptAppendedEvent {
    type: "PROMPT_APPENDED";
    timestamp: number;
    playerId: string;
    delta: string;
}

export interface ImageRequestedEvent {
    type: "IMAGE_REQUESTED";
    timestamp: number;
    requestId: string;
    seq: number;
    kind: "player" | "ai";
    prompt: string;
    isFinal: boolean;
}

export interface ImageReadyEvent {
    type: "IMAGE_READY";
    timestamp: number;
    requestId: string;
    seq: number;
    kind: "player" | "ai";
    prompt: string;
    imageUrl: string;
    isFinal: boolean;
}

export interface TurnEndedEvent {
    type: "TURN_ENDED";
    timestamp: number;
    nextPlayerIndex: number | null; // null if round over
}

export interface RoundCompletedEvent {
    type: "ROUND_COMPLETED";
    timestamp: number;
}

export interface ScoredEvent {
    type: "SCORED";
    timestamp: number;
    cosine: number;
    score100: number;
}

export interface ErrorEvent {
    type: "ERROR";
    timestamp: number;
    message: string;
}

export interface ReactionEvent {
    type: "REACTION";
    timestamp: number;
    reaction: string;
}

export interface ImageSelectedEvent {
    type: "IMAGE_SELECTED";
    timestamp: number;
    playerId: string;
    selectedSeq: number;
}

export type GameEvent =
    | RoomCreatedEvent
    | PlayerJoinedEvent
    | GameStartedEvent
    | TurnStartedEvent
    | Tick10sEvent
    | PromptAppendedEvent
    | ImageRequestedEvent
    | ImageReadyEvent
    | TurnEndedEvent
    | RoundCompletedEvent
    | ScoredEvent
    | ErrorEvent
    | ReactionEvent
    | ImageSelectedEvent;
