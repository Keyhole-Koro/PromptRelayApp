import { useCallback, useEffect, useState } from "react";
import { useGameSocket } from "./hooks/useGameSocket";
import { GameBoard } from "./components/GameBoard";
import { PromptInput } from "./components/PromptInput";
import { Particles } from "./components/Particles";
import { HomeScreen } from "./components/HomeScreen";
import { LobbyScreen } from "./components/LobbyScreen";
import { PlayerBar } from "./components/PlayerBar";
import { ReactionLayer } from "./components/ReactionLayer";
import { ReactionFAB } from "./components/ReactionFAB";
import { MockPlayerClient } from "./utils/MockPlayer";
import { ResultScreen } from "./components/ResultScreen";
import { TurnCountdown } from "./components/TurnCountdown";
import { ImageSelectionScreen } from "./components/ImageSelectionScreen";

type Screen = "home" | "lobby" | "game";

function App() {
  const { roomState, myPlayerId, lastReaction, send } = useGameSocket();
  const [screen, setScreen] = useState<Screen>("home");
  const [version, setVersion] = useState<string>("loading...");
  const [pendingSolo, setPendingSolo] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [mockClients, setMockClients] = useState<MockPlayerClient[]>([]);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [isFirstTurnCountdown, setIsFirstTurnCountdown] = useState(false);

  const handleCountdownActive = useCallback((isActive: boolean, isFirstSessionTurn?: boolean) => {
    setIsCountingDown(isActive);
    setIsFirstTurnCountdown(isActive && !!isFirstSessionTurn);
  }, []);

  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data: { name?: string; version?: string }) => {
        setVersion(data.version ? `${data.name ?? "prompt-relay"} v${data.version}` : "unknown");
      })
      .catch(() => setVersion("unavailable"));
  }, []);

  // Auto-transition: when phase becomes "playing", "selecting", "scoring", "done" switch to game screen
  useEffect(() => {
    if (roomState?.phase === "playing" || roomState?.phase === "selecting" || roomState?.phase === "scoring" || roomState?.phase === "done") {
      setScreen("game");
      setPendingSolo(false);
      setIsStartingGame(false);
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
    setIsStartingGame(true);
    send({ action: "start_game" });
  }, [send]);

  const handleSendDelta = useCallback(
    (delta: string) => {
      send({ action: "update_prompt", delta });
    },
    [send]
  );

  const handleSendReaction = useCallback(
    (emoji: string) => {
      send({ action: "send_reaction", reaction: emoji });
    },
    [send]
  );

  const handleSelectImage = useCallback(
    (seq: number) => {
      send({ action: "select_image", seq });
    },
    [send]
  );

  const handleAddMockPlayer = useCallback(() => {
    if (!roomState?.roomCode) return;
    const botName = `🤖 Bot ${mockClients.length + 1}`;
    const bot = new MockPlayerClient(botName, roomState.roomCode);
    bot.connect();
    setMockClients((prev) => [...prev, bot]);
  }, [roomState?.roomCode, mockClients.length]);

  const handleBackToHome = useCallback(() => {
    setScreen("home");
    setIsStartingGame(false);
    mockClients.forEach(client => client.disconnect());
    setMockClients([]);
  }, [mockClients]);

  const phase = roomState?.phase ?? "lobby";
  const players = roomState?.players ?? [];
  const currentPlayerId = roomState?.turn
    ? roomState.turn.order[roomState.turn.currentPlayerIndex]
    : null;
  const currentPlayer = currentPlayerId
    ? players.find((p) => p.id === currentPlayerId) ?? null
    : null;
  const isMyTurn = currentPlayer?.id === myPlayerId;
  const isPromptDisabled = phase === "selecting" || phase === "scoring" || phase === "done" || !isMyTurn;
  const fullPrompt = (roomState?.prompts ?? []).map((p) => p.delta).join("");

  return (
    <div data-phase={phase} data-my-turn={isMyTurn ? "true" : "false"}>
      <Particles />
      <ReactionLayer reaction={lastReaction} />
      <TurnCountdown
        players={players}
        turn={roomState?.turn ?? null}
        phase={phase}
        myPlayerId={myPlayerId}
        onCountdownActive={handleCountdownActive}
      />
      {phase === "playing" && (
        <ReactionFAB onSendReaction={handleSendReaction} />
      )}
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
            myPlayerId={myPlayerId}
            isStartingGame={isStartingGame}
            onStartGame={handleStartGame}
            onAddMockPlayer={handleAddMockPlayer}
            onBack={handleBackToHome}
          />
        )}

        {screen === "game" && (
          <div className={`game-screen ${isFirstTurnCountdown ? "first-turn-dimming" : ""}`}>
            <PlayerBar
              players={players}
              turn={roomState?.turn ?? null}
              myPlayerId={myPlayerId}
            />

            <GameBoard
              topicImageUrl={roomState?.topicImageUrl ?? null}
              topicText={roomState?.topicText ?? null}
              playerImages={roomState?.playerImages ?? []}
              aiImages={roomState?.aiImages ?? []}
            />

            <div className={`prompt-wrapper ${isCountingDown ? "is-counting-down" : ""}`}>
              {isCountingDown && (
                <div className="countdown-prompt-arrow">
                  ⬇️
                </div>
              )}
              <PromptInput
                disabled={isPromptDisabled}
                isMyTurn={isMyTurn}
                fullPrompt={fullPrompt}
                onSendDelta={handleSendDelta}
              />
            </div>

            {phase === "scoring" && (
              <div className="scoring-overlay">
                <div className="scoring-modal">
                  <div className="scoring-spinner" />
                  <p className="scoring-text">類似度を計算中...</p>
                </div>
              </div>
            )}

            {phase === "done" && (
              <ResultScreen
                roomState={roomState}
                onBackToHome={handleBackToHome}
              />
            )}

            {phase === "selecting" && (
              <ImageSelectionScreen
                images={roomState?.playerImages ?? []}
                onSelectImage={handleSelectImage}
              />
            )}
          </div>
        )}
      </div>
      <div className="version-badge">{version}</div>
    </div>
  );
}

export default App;
