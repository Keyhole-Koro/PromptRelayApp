// web/main.ts
var wsStatusEl = document.getElementById("wsStatus");
var gameStatusEl = document.getElementById("gameStatus");
var roomStatusEl = document.getElementById("roomStatus");
var currentTurnEl = document.getElementById("currentTurn");
var playersEl = document.getElementById("players");
var playerNameEl = document.getElementById("playerName");
var joinRoomCodeEl = document.getElementById("joinRoomCode");
var createRoomBtn = document.getElementById("createRoomBtn");
var joinRoomBtn = document.getElementById("joinRoomBtn");
var startGameBtn = document.getElementById("startGameBtn");
var topicImageEl = document.getElementById("topicImage");
var playerImageEl = document.getElementById("playerImage");
var aiImageEl = document.getElementById("aiImage");
var topicPlaceholderEl = document.getElementById("topicPlaceholder");
var playerPlaceholderEl = document.getElementById("playerPlaceholder");
var aiPlaceholderEl = document.getElementById("aiPlaceholder");
var topicTextEl = document.getElementById("topicText");
var promptInputEl = document.getElementById("promptInput");
var autosendInfoEl = document.getElementById("autosendInfo");
var logEl = document.getElementById("log");
var versionBadgeEl = document.getElementById("versionBadge");
var timerBarEl = document.getElementById("timerBar");
var scoreDisplayEl = document.getElementById("scoreDisplay");
var scoreValueEl = document.getElementById("scoreValue");
var particlesEl = document.getElementById("particles");
var ws = null;
var roomState = null;
var wsReady = false;
var nextAutosendInSec = 10;
function spawnParticles() {
  const COLORS = [
    "rgba(56,182,255,0.35)",
    "rgba(160,120,240,0.30)",
    "rgba(0,212,200,0.25)",
    "rgba(255,130,200,0.20)",
    "rgba(255,200,100,0.25)"
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
function log(message) {
  const ts = (/* @__PURE__ */ new Date()).toLocaleTimeString();
  logEl.textContent += `[${ts}] ${message}
`;
  logEl.scrollTop = logEl.scrollHeight;
}
function latestImage(images) {
  if (images.length === 0) return null;
  return images[images.length - 1] ?? null;
}
function updateImage(img, placeholder, url) {
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
function render(state) {
  roomState = state;
  document.body.dataset.phase = state.phase;
  gameStatusEl.textContent = `phase: ${state.phase}`;
  roomStatusEl.textContent = `room: ${state.roomCode}`;
  const currentPlayer = state.turn ? state.players[state.turn.currentPlayerIndex] : null;
  currentTurnEl.textContent = `Current turn: ${currentPlayer ? currentPlayer.name : "-"}`;
  playersEl.textContent = `Players: ${state.players.map((p) => p.name).join(", ") || "-"}`;
  updateImage(topicImageEl, topicPlaceholderEl, state.topicImageUrl);
  updateImage(playerImageEl, playerPlaceholderEl, latestImage(state.playerImages)?.url ?? null);
  updateImage(aiImageEl, aiPlaceholderEl, latestImage(state.aiImages)?.url ?? null);
  topicTextEl.textContent = state.topicText ? `\u304A\u984C\u30C6\u30AD\u30B9\u30C8: ${state.topicText}` : "";
  if (state.score) {
    scoreValueEl.textContent = String(Math.round(state.score.score100));
    scoreDisplayEl.classList.add("visible");
  } else {
    scoreDisplayEl.classList.remove("visible");
  }
}
function send(action) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(action));
}
function connectWs() {
  ws = new WebSocket(`ws://${location.host}/ws`);
  ws.addEventListener("open", () => {
    wsReady = true;
    wsStatusEl.textContent = "WS: connected";
    log("websocket connected");
  });
  ws.addEventListener("message", (evt) => {
    try {
      const msg = JSON.parse(String(evt.data));
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
    setTimeout(connectWs, 2e3);
  });
  ws.addEventListener("error", () => {
    wsStatusEl.textContent = "WS: error";
    log("websocket error");
  });
}
function getPlayerName() {
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
setInterval(() => {
  nextAutosendInSec = nextAutosendInSec <= 1 ? 10 : nextAutosendInSec - 1;
  autosendInfoEl.textContent = `next autosend: ${nextAutosendInSec}s`;
  const pct = (nextAutosendInSec - 1) / 9 * 100;
  timerBarEl.style.width = `${pct}%`;
}, 1e3);
setInterval(() => {
  nextAutosendInSec = 10;
  const delta = promptInputEl.value;
  if (!delta.trim()) return;
  if (!wsReady || !roomState) return;
  send({ action: "update_prompt", delta });
  promptInputEl.value = "";
  log(`delta sent (${delta.length} chars)`);
}, 1e4);
async function loadVersion() {
  try {
    const res = await fetch("/api/version");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.version) {
      versionBadgeEl.textContent = `${data.name ?? "prompt-relay"} v${data.version}`;
      return;
    }
    versionBadgeEl.textContent = "version: unknown";
  } catch {
    versionBadgeEl.textContent = "version: unavailable";
  }
}
spawnParticles();
connectWs();
void loadVersion();
//# sourceMappingURL=main.js.map
