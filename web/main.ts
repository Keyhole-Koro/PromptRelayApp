const statusEl = document.getElementById("status") as HTMLParagraphElement | null;
const healthEl = document.getElementById("health") as HTMLSpanElement | null;
const logEl = document.getElementById("log") as HTMLPreElement | null;

function setStatus(text: string): void {
  if (statusEl) statusEl.textContent = text;
}

function appendLog(line: string): void {
  if (!logEl) return;
  const ts = new Date().toISOString();
  logEl.textContent += `[${ts}] ${line}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

async function checkHealth(): Promise<void> {
  try {
    const res = await fetch(`http://${location.host}/api/health`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { status?: string };
    if (healthEl) healthEl.textContent = data.status ?? "ok";
  } catch (err) {
    if (healthEl) healthEl.textContent = "unreachable";
    appendLog(`health check failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function connectWebSocket(): void {
  const wsUrl = `ws://${location.host}/ws`;
  const ws = new WebSocket(wsUrl);

  ws.addEventListener("open", () => {
    setStatus(`WS connected: ${wsUrl}`);
    appendLog("websocket connected");
  });

  ws.addEventListener("message", (event) => {
    appendLog(`message: ${String(event.data)}`);
  });

  ws.addEventListener("error", () => {
    setStatus("WS error");
    appendLog("websocket error");
  });

  ws.addEventListener("close", () => {
    setStatus("WS disconnected (retrying in 2s)");
    appendLog("websocket closed");
    window.setTimeout(connectWebSocket, 2000);
  });
}

void checkHealth();
connectWebSocket();
