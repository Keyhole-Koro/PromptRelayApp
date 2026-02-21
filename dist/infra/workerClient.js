// ─── Worker Client ──────────────────────────────────────────────
// ─── HTTP Worker Client (production) ────────────────────────────
const WORKER_BASE = "http://127.0.0.1:8091";
export class HttpWorkerClient {
    async generateTopic(req) {
        const res = await fetch(`${WORKER_BASE}/v1/topic:generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok)
            throw new Error(`Worker topic:generate failed: ${res.status}`);
        return (await res.json());
    }
    async generateImage(req) {
        const res = await fetch(`${WORKER_BASE}/preview`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok)
            throw new Error(`Worker preview failed: ${res.status}`);
        return (await res.json());
    }
    async calculateScore(req) {
        const res = await fetch(`${WORKER_BASE}/v1/score`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(req),
        });
        if (!res.ok)
            throw new Error(`Worker score failed: ${res.status}`);
        return (await res.json());
    }
}
// ─── Fake Worker Client (testing) ───────────────────────────────
export class FakeWorkerClient {
    topicCalls = [];
    imageCalls = [];
    scoreCalls = [];
    /** Delay in ms to simulate async work. Set to 0 for sync tests. */
    delayMs = 0;
    topicResponse = {
        topicImageUrl: "https://fake.test/topic.png",
        topicText: "A cat on a skateboard",
    };
    imageResponse = {
        imageUrl: "https://fake.test/image.png",
    };
    scoreResponse = {
        cosine: 0.85,
        score100: 85,
    };
    shouldFail = false;
    async maybeDelay() {
        if (this.delayMs > 0) {
            await new Promise((r) => setTimeout(r, this.delayMs));
        }
    }
    async generateTopic(req) {
        this.topicCalls.push(req);
        await this.maybeDelay();
        if (this.shouldFail)
            throw new Error("Fake worker topic failure");
        return { ...this.topicResponse };
    }
    async generateImage(req) {
        this.imageCalls.push(req);
        await this.maybeDelay();
        if (this.shouldFail)
            throw new Error("Fake worker image failure");
        return { ...this.imageResponse };
    }
    async calculateScore(req) {
        this.scoreCalls.push(req);
        await this.maybeDelay();
        if (this.shouldFail)
            throw new Error("Fake worker score failure");
        return { ...this.scoreResponse };
    }
}
//# sourceMappingURL=workerClient.js.map