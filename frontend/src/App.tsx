import { useCallback, useEffect, useState } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import { TopBar } from "./components/TopBar";
import { GameBoard } from "./components/GameBoard";
import { PromptInput } from "./components/PromptInput";
import { ScoreDisplay } from "./components/ScoreDisplay";
import { LogPanel } from "./components/LogPanel";
import { Particles } from "./components/Particles";
import { HomeScreen } from "./components/HomeScreen";
import { LobbyScreen } from "./components/LobbyScreen";

type Screen = "home" | "lobby" | "game";

function App() {
  const { roomState, wsStatus, logs, send } = useGameSocket();
  const [screen, setScreen] = useState<Screen>("home");
  const [version, setVersion] = useState<string>("loading...");
  const [pendingSolo, setPendingSolo] = useState(false);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data: { name?: string; version?: string }) => {
        setVersion(data.version ? `${data.name ?? "prompt-relay"} v${data.version}` : "unknown");
      })
      .catch(() => setVersion("unavailable"));
  }, []);

  // Auto-transition: when phase becomes "playing", switch to game screen
  useEffect(() => {
    if (roomState?.phase === "playing" || roomState?.phase === "scoring" || roomState?.phase === "done") {
      setScreen("game");
      setPendingSolo(false);
    }
  }, [roomState?.phase]);

  // For solo mode: once we're in lobby (room created), auto-start
  useEffect(() => {
    if (pendingSolo && roomState?.phase === "lobby" && roomState.players.length > 0) {
      send({ action: "start_game" });
      setPendingSolo(false);
    }
  }, [pendingSolo, roomState?.phase, roomState?.players.length, send]);

  const handleSoloPlay = useCallback(
    (playerName: string) => {
      setPendingSolo(true);
      send({ action: "create_room", playerName });
    },
    [send]
  );

  const handleCreateRoom = useCallback(
    (playerName: string) => {
      send({ action: "create_room", playerName });
      setScreen("lobby");
    },
    [send]
  );

  const handleJoinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      send({ action: "join_room", roomCode, playerName });
      setScreen("lobby");
    },
    [send]
  );

  const handleStartGame = useCallback(() => {
    send({ action: "start_game" });
  }, [send]);

  const handleSendDelta = useCallback(
    (delta: string) => {
      send({ action: "update_prompt", delta });
    },
    [send]
  );

  const handleBackToHome = useCallback(() => {
    setScreen("home");
  }, []);

  const phase = roomState?.phase ?? "lobby";
  const players = roomState?.players ?? [];
  const currentPlayer = roomState?.turn
    ? players[roomState.turn.currentPlayerIndex]
    : null;
  const isPromptDisabled = phase === "scoring" || phase === "done";

  return (
    <div data-phase={phase}>
      <Particles />
      <div className="page">
        {screen === "home" && (
          <HomeScreen
            onSoloPlay={handleSoloPlay}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {screen === "lobby" && (
          <LobbyScreen
            roomCode={roomState?.roomCode ?? "---"}
            players={players}
            onStartGame={handleStartGame}
            onBack={handleBackToHome}
          />
        )}

        {screen === "game" && (
          <>
            <TopBar
              wsStatus={wsStatus}
              phase={phase}
              roomCode={roomState?.roomCode ?? "-"}
            />

            <div className="game-info-bar">
              <p className="meta">
                Current turn: {currentPlayer?.name ?? "-"} &nbsp;|&nbsp;
                Players: {players.map((p) => p.name).join(", ") || "-"}
              </p>
            </div>

            <ScoreDisplay score={roomState?.score ?? null} />

            <GameBoard
              topicImageUrl={roomState?.topicImageUrl ?? null}
              topicText={roomState?.topicText ?? null}
              playerImages={roomState?.playerImages ?? []}
              aiImages={roomState?.aiImages ?? []}
            />

            <PromptInput
              disabled={isPromptDisabled}
              onSendDelta={handleSendDelta}
            />

            <LogPanel logs={logs} />
          </>
        )}
      </div>
      <div className="version-badge">{version}</div>
    </div>
  );
}

export default App;
