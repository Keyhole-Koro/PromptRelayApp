type Phase = "lobby" | "playing" | "scoring" | "done";

interface PlayerInfo {
  id: string;
  name: string;
  joinOrder: number;
}

interface TurnState {
  currentPlayerIndex: number;
  startedAt: number;
  durationMs: number;
  seq: number;
}

interface ImageRecord {
  url: string;
  requestId: string;
  seq: number;
  kind: "player" | "ai";
  isFinal: boolean;
}

interface ScoreResult {
  cosine: number;
  score100: number;
}

interface RoomState {
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

type IncomingMessage =
  | { type: "room_state"; state: RoomState }
  | { type: "event"; event: unknown }
  | { type: "error"; message: string };

// ── DOM refs ──────────────────────────────────────────
const wsStatusEl = document.getElementById("wsStatus") as HTMLSpanElement;
const gameStatusEl = document.getElementById("gameStatus") as HTMLSpanElement;
const roomStatusEl = document.getElementById("roomStatus") as HTMLSpanElement;
const currentTurnEl = document.getElementById("currentTurn") as HTMLParagraphElement;
const playersEl = document.getElementById("players") as HTMLParagraphElement;
const playerNameEl = document.getElementById("playerName") as HTMLInputElement;
const joinRoomCodeEl = document.getElementById("joinRoomCode") as HTMLInputElement;
const createRoomBtn = document.getElementById("createRoomBtn") as HTMLButtonElement;
const joinRoomBtn = document.getElementById("joinRoomBtn") as HTMLButtonElement;
const startGameBtn = document.getElementById("startGameBtn") as HTMLButtonElement;
const topicImageEl = document.getElementById("topicImage") as HTMLImageElement;
const playerImageEl = document.getElementById("playerImage") as HTMLImageElement;
const aiImageEl = document.getElementById("aiImage") as HTMLImageElement;
const topicPlaceholderEl = document.getElementById("topicPlaceholder") as HTMLParagraphElement;
const playerPlaceholderEl = document.getElementById("playerPlaceholder") as HTMLParagraphElement;
const aiPlaceholderEl = document.getElementById("aiPlaceholder") as HTMLParagraphElement;
const topicTextEl = document.getElementById("topicText") as HTMLParagraphElement;
const promptInputEl = document.getElementById("promptInput") as HTMLTextAreaElement;
const autosendInfoEl = document.getElementById("autosendInfo") as HTMLParagraphElement;
const logEl = document.getElementById("log") as HTMLPreElement;
const versionBadgeEl = document.getElementById("versionBadge") as HTMLDivElement;
const timerBarEl = document.getElementById("timerBar") as HTMLDivElement;
const scoreDisplayEl = document.getElementById("scoreDisplay") as HTMLElement;
const scoreValueEl = document.getElementById("scoreValue") as HTMLElement;
const particlesEl = document.getElementById("particles") as HTMLDivElement;

let ws: WebSocket | null = null;
let roomState: RoomState | null = null;
let wsReady = false;
let nextAutosendInSec = 10;

// ── Particles ─────────────────────────────────────────
function spawnParticles(): void {
  const COLORS = [
    "rgba(56,182,255,0.35)",
    "rgba(160,120,240,0.30)",
    "rgba(0,212,200,0.25)",
    "rgba(255,130,200,0.20)",
    "rgba(255,200,100,0.25)",
  ];

  for (let i = 0; i < 30; i++) {
    const p = document.createElement("div");
    p.className = "particle";
    const size = Math.random() * 4 + 2;
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const left = Math.random() * 100;
    const duration = Math.random() * 15 + 10;
    const delay = Math.random() * 20;

    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${left}%;
      background: ${color};
      box-shadow: 0 0 ${size * 3}px ${color};
      animation-duration: ${duration}s;
      animation-delay: ${delay}s;
    `;
    particlesEl.appendChild(p);
  }
}

// ── Logging ───────────────────────────────────────────
function log(message: string): void {
  const ts = new Date().toLocaleTimeString();
  logEl.textContent += `[${ts}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

// ── Image helpers ─────────────────────────────────────
function latestImage(images: ImageRecord[]): ImageRecord | null {
  if (images.length === 0) return null;
  return images[images.length - 1] ?? null;
}

function updateImage(img: HTMLImageElement, placeholder: HTMLElement, url: string | null): void {
  if (url) {
    img.src = url;
    img.style.display = "block";
    placeholder.style.display = "none";
  } else {
    img.removeAttribute("src");
    img.style.display = "none";
    placeholder.style.display = "block";
  }
}

// ── Render ────────────────────────────────────────────
function render(state: RoomState): void {
  roomState = state;

  // Phase on body for CSS hooks
  document.body.dataset.phase = state.phase;

  gameStatusEl.textContent = `phase: ${state.phase}`;
  roomStatusEl.textContent = `room: ${state.roomCode}`;

  const currentPlayer = state.turn ? state.players[state.turn.currentPlayerIndex] : null;
  currentTurnEl.textContent = `Current turn: ${currentPlayer ? currentPlayer.name : "-"}`;
  playersEl.textContent = `Players: ${state.players.map((p) => p.name).join(", ") || "-"}`;

  updateImage(topicImageEl, topicPlaceholderEl, state.topicImageUrl);
  updateImage(playerImageEl, playerPlaceholderEl, latestImage(state.playerImages)?.url ?? null);
  updateImage(aiImageEl, aiPlaceholderEl, latestImage(state.aiImages)?.url ?? null);

  topicTextEl.textContent = state.topicText ? `お題テキスト: ${state.topicText}` : "";

  // Score display
  if (state.score) {
    scoreValueEl.textContent = String(Math.round(state.score.score100));
    scoreDisplayEl.classList.add("visible");
  } else {
    scoreDisplayEl.classList.remove("visible");
  }
}

// ── WebSocket ─────────────────────────────────────────
function send(action: Record<string, unknown>): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(action));
}

function connectWs(): void {
  ws = new WebSocket(`ws://${location.host}/ws`);

  ws.addEventListener("open", () => {
    wsReady = true;
    wsStatusEl.textContent = "WS: connected";
    log("websocket connected");
  });

  ws.addEventListener("message", (evt) => {
    try {
      const msg = JSON.parse(String(evt.data)) as IncomingMessage;
      if (msg.type === "room_state") {
        render(msg.state);
      } else if (msg.type === "error") {
        log(`error: ${msg.message}`);
      } else {
        log("event received");
      }
    } catch (err) {
      log(`invalid message: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  ws.addEventListener("close", () => {
    wsReady = false;
    wsStatusEl.textContent = "WS: disconnected (retrying)";
    log("websocket closed");
    setTimeout(connectWs, 2000);
  });

  ws.addEventListener("error", () => {
    wsStatusEl.textContent = "WS: error";
    log("websocket error");
  });
}

// ── Player actions ────────────────────────────────────
function getPlayerName(): string {
  const name = playerNameEl.value.trim();
  return name || "Player";
}

createRoomBtn.addEventListener("click", () => {
  send({ action: "create_room", playerName: getPlayerName() });
  log("create_room sent");
});

joinRoomBtn.addEventListener("click", () => {
  const roomCode = joinRoomCodeEl.value.trim().toUpperCase();
  if (!roomCode) return;
  send({ action: "join_room", roomCode, playerName: getPlayerName() });
  log(`join_room sent: ${roomCode}`);
});

startGameBtn.addEventListener("click", () => {
  send({ action: "start_game" });
  log("start_game sent");
});

// ── Timer bar + autosend ──────────────────────────────
setInterval(() => {
  nextAutosendInSec = nextAutosendInSec <= 1 ? 10 : nextAutosendInSec - 1;
  autosendInfoEl.textContent = `next autosend: ${nextAutosendInSec}s`;
  // Animate timer bar
  const pct = ((nextAutosendInSec - 1) / 9) * 100;
  timerBarEl.style.width = `${pct}%`;
}, 1000);

setInterval(() => {
  nextAutosendInSec = 10;
  const delta = promptInputEl.value;
  if (!delta.trim()) return;
  if (!wsReady || !roomState) return;
  send({ action: "update_prompt", delta });
  promptInputEl.value = "";
  log(`delta sent (${delta.length} chars)`);
}, 10_000);

// ── Version ───────────────────────────────────────────
async function loadVersion(): Promise<void> {
  try {
    const res = await fetch("/api/version");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { name?: string; version?: string };
    if (data.version) {
      versionBadgeEl.textContent = `${data.name ?? "prompt-relay"} v${data.version}`;
      return;
    }
    versionBadgeEl.textContent = "version: unknown";
  } catch {
    versionBadgeEl.textContent = "version: unavailable";
  }
}

// ── Init ──────────────────────────────────────────────
spawnParticles();
connectWs();
void loadVersion();
