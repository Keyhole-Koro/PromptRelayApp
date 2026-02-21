import { useCallback } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import { TopBar } from "./components/TopBar";
import { GameControls } from "./components/GameControls";
import { GameBoard } from "./components/GameBoard";
import { PromptInput } from "./components/PromptInput";
import { ScoreDisplay } from "./components/ScoreDisplay";
import { LogPanel } from "./components/LogPanel";
import { Particles } from "./components/Particles";
import { useEffect, useState } from "react";

function App() {
  const { roomState, wsStatus, logs, send } = useGameSocket();
  const [version, setVersion] = useState<string>("loading...");

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data: { name?: string; version?: string }) => {
        setVersion(data.version ? `${data.name ?? "prompt-relay"} v${data.version}` : "unknown");
      })
      .catch(() => setVersion("unavailable"));
  }, []);

  const phase = roomState?.phase ?? "lobby";
  const players = roomState?.players ?? [];
  const currentPlayer = roomState?.turn
    ? players[roomState.turn.currentPlayerIndex]
    : null;

  const handleCreateRoom = useCallback(
    (playerName: string) => {
      send({ action: "create_room", playerName });
    },
    [send]
  );

  const handleJoinRoom = useCallback(
    (roomCode: string, playerName: string) => {
      send({ action: "join_room", roomCode, playerName });
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

  const isPromptDisabled = phase === "scoring" || phase === "done";

  return (
    <div data-phase={phase}>
      <Particles />
      <div className="page">
        <TopBar
          wsStatus={wsStatus}
          phase={phase}
          roomCode={roomState?.roomCode ?? "-"}
        />

        <GameControls
          players={players}
          currentPlayerName={currentPlayer?.name ?? null}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onStartGame={handleStartGame}
        />

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
      </div>
      <div className="version-badge">{version}</div>
    </div>
  );
}

export default App;
