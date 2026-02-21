// ─── Domain Types ───────────────────────────────────────────────
export function initialRoomState(roomCode) {
    return {
        roomCode,
        phase: "lobby",
        players: [],
        turn: null,
        prompts: [],
        playerImages: [],
        aiImages: [],
        lastProcessedSeq: 0,
        topicImageUrl: null,
        topicText: null,
        score: null,
        errors: [],
    };
}
//# sourceMappingURL=types.js.map