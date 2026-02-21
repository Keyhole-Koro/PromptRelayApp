export interface TopicGenerateRequest {
    roomCode: string;
}
export interface TopicGenerateResponse {
    topicImageUrl: string;
    topicText?: string;
}
export interface ImageGenerateRequest {
    requestId: string;
    kind: "player" | "ai";
    prompt: string;
    isFinal: boolean;
}
export interface ImageGenerateResponse {
    imageUrl: string;
}
export interface ScoreRequest {
    playerImageUrl: string;
    aiImageUrl: string;
}
export interface ScoreResponse {
    cosine: number;
    score100: number;
}
export interface WorkerClient {
    generateTopic(req: TopicGenerateRequest): Promise<TopicGenerateResponse>;
    generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse>;
    calculateScore(req: ScoreRequest): Promise<ScoreResponse>;
}
export declare class HttpWorkerClient implements WorkerClient {
    generateTopic(req: TopicGenerateRequest): Promise<TopicGenerateResponse>;
    generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse>;
    calculateScore(req: ScoreRequest): Promise<ScoreResponse>;
}
export declare class FakeWorkerClient implements WorkerClient {
    topicCalls: TopicGenerateRequest[];
    imageCalls: ImageGenerateRequest[];
    scoreCalls: ScoreRequest[];
    /** Delay in ms to simulate async work. Set to 0 for sync tests. */
    delayMs: number;
    topicResponse: TopicGenerateResponse;
    imageResponse: ImageGenerateResponse;
    scoreResponse: ScoreResponse;
    shouldFail: boolean;
    private maybeDelay;
    generateTopic(req: TopicGenerateRequest): Promise<TopicGenerateResponse>;
    generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse>;
    calculateScore(req: ScoreRequest): Promise<ScoreResponse>;
}
//# sourceMappingURL=workerClient.d.ts.map