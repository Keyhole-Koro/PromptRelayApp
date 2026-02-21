// ─── Worker Client ──────────────────────────────────────────────

export interface TopicGenerateRequest {
    roomCode: string;
}
export interface TopicGenerateResponse {
    topicImageUrl: string;
    topicText?: string;
}

interface WorkerGenerateResponse {
    topic: {
        signedUrl: string;
        prompt: string;
    };
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

// ─── HTTP Worker Client (production) ────────────────────────────

const WORKER_BASE = "http://127.0.0.1:8091";

export class HttpWorkerClient implements WorkerClient {
    async generateTopic(req: TopicGenerateRequest): Promise<TopicGenerateResponse> {
        const res = await fetch(`${WORKER_BASE}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok) throw new Error(`Worker generate failed: ${res.status}`);
        const data = (await res.json()) as WorkerGenerateResponse;
        return {
            topicImageUrl: data.topic.signedUrl,
            topicText: data.topic.prompt,
        };
    }

    async generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse> {
        const res = await fetch(`${WORKER_BASE}/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok) throw new Error(`Worker preview failed: ${res.status}`);
        return (await res.json()) as ImageGenerateResponse;
    }

    async calculateScore(req: ScoreRequest): Promise<ScoreResponse> {
        const res = await fetch(`${WORKER_BASE}/v1/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok) throw new Error(`Worker score failed: ${res.status}`);
        return (await res.json()) as ScoreResponse;
    }
}

// ─── Fake Worker Client (testing) ───────────────────────────────

export class FakeWorkerClient implements WorkerClient {
    topicCalls: TopicGenerateRequest[] = [];
    imageCalls: ImageGenerateRequest[] = [];
    scoreCalls: ScoreRequest[] = [];

    /** Delay in ms to simulate async work. Set to 0 for sync tests. */
    delayMs = 0;

    topicResponse: TopicGenerateResponse = {
        topicImageUrl: "https://fake.test/topic.png",
        topicText: "A cat on a skateboard",
    };

    imageResponse: ImageGenerateResponse = {
        imageUrl: "https://fake.test/image.png",
    };

    scoreResponse: ScoreResponse = {
        cosine: 0.85,
        score100: 85,
    };

    shouldFail = false;

    private async maybeDelay(): Promise<void> {
        if (this.delayMs > 0) {
            await new Promise((r) => setTimeout(r, this.delayMs));
        }
    }

    async generateTopic(req: TopicGenerateRequest): Promise<TopicGenerateResponse> {
        this.topicCalls.push(req);
        await this.maybeDelay();
        if (this.shouldFail) throw new Error("Fake worker topic failure");
        return { ...this.topicResponse };
    }

    async generateImage(req: ImageGenerateRequest): Promise<ImageGenerateResponse> {
        this.imageCalls.push(req);
        await this.maybeDelay();
        if (this.shouldFail) throw new Error("Fake worker image failure");
        return { ...this.imageResponse };
    }

    async calculateScore(req: ScoreRequest): Promise<ScoreResponse> {
        this.scoreCalls.push(req);
        await this.maybeDelay();
        if (this.shouldFail) throw new Error("Fake worker score failure");
        return { ...this.scoreResponse };
    }
}
