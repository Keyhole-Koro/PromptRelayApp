import type { RoomState, IncomingMessage } from "../types";

export class MockPlayerClient {
    private ws: WebSocket | null = null;
    private cancelled = false;
    private timer: ReturnType<typeof setTimeout> | null = null;
    private playerId: string | null = null;

    private playerName: string;
    private roomCode: string;

    constructor(playerName: string, roomCode: string) {
        this.playerName = playerName;
        this.roomCode = roomCode;
    }

    public connect() {
        const proto = location.protocol === "https:" ? "wss:" : "ws:";
        this.ws = new WebSocket(`${proto}//${location.host}/ws`);

        this.ws.addEventListener("open", () => {
            if (this.cancelled) return;
            // join the room as soon as we connect
            this.send({ action: "join_room", roomCode: this.roomCode, playerName: this.playerName });
        });

        this.ws.addEventListener("message", (evt) => {
            if (this.cancelled) return;
            try {
                const msg = JSON.parse(String(evt.data)) as IncomingMessage;
                if (msg.type === "connected") {
                    this.playerId = msg.playerId;
                } else if (msg.type === "room_state") {
                    this.handleRoomState(msg.state);
                }
            } catch (err) {
                // ignore
            }
        });
    }

    public disconnect() {
        this.cancelled = true;
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    private send(action: Record<string, unknown>) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        this.ws.send(JSON.stringify(action));
    }

    private handleRoomState(state: RoomState) {
        if (state.phase !== "playing") return;
        if (!state.turn || !this.playerId) return;

        // Is it my turn?
        const activePlayerId = state.turn.order[state.turn.currentPlayerIndex];
        if (activePlayerId === this.playerId) {
            // It's my turn, schedule a move if not already scheduled
            if (!this.timer) {
                const delayMs = 3000 + Math.random() * 4000; // 3 to 7 seconds dummy delay
                this.timer = setTimeout(() => {
                    this.timer = null;
                    if (this.cancelled) return;

                    const words = ["美しい", "サイバーパンクな", "東京の", "夜景", "近未来的な", "ネオンが輝く", "車が空を飛ぶ"];
                    const randomWord = words[Math.floor(Math.random() * words.length)];
                    this.send({ action: "update_prompt", delta: ` ${randomWord}` });
                }, delayMs);
            }
        } else {
            // Not my turn, cancel any pending move
            if (this.timer) {
                clearTimeout(this.timer);
                this.timer = null;
            }

            // Random chance to send a reaction while waiting
            if (Math.random() < 0.05) { // 5% chance on each state update to react
                const emojis = ["🔥", "👀", "👍", "🤔", "✨", "💯", "🎉", "🚀"];
                const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
                this.send({ action: "send_reaction", reaction: randomEmoji });
            }
        }
    }
}
