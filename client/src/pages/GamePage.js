import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";

// Components
import SuperBoard from "../components/SuperBoard";
import MoveHistory from "../components/MoveHistory";
import GameEndModal from "../components/GameEndModal";
import PlayerHUD from "../components/PlayerHUD";
import InteractiveBG from "../components/InteractiveBG";

// Utils
import { getBoardStateAtMove } from "../utils/boardLogic";
import "./GamePage.css";

const BattleChat = ({ messages, systemMessage, onSend, myUsername }) => {
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) { onSend(input); setInput(""); }
  };
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, systemMessage]);

  return (
    <div className="tech-panel chat-module">
      <div className="panel-label hp-mono">ENCRYPTED_COMMS_LOG</div>
      <div className="chat-messages">
        {systemMessage && <div className="chat-line system hp-mono text-sulfur">[!] {systemMessage}</div>}
        {messages.map((m, i) => (
          <div key={i} className={`chat-line ${m.user?.toLowerCase() === myUsername?.toLowerCase() ? 'self' : 'opp'}`}>
            <span className="hp-mono text-titanium">[{m.user?.toUpperCase()}]:</span>
            <span className="text-titanium"> {m.text}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input className="chat-input hp-mono" placeholder="SECURE_INPUT..." value={input} onChange={(e) => setInput(e.target.value)} />
      </form>
    </div>
  );
};

export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useContext(AuthContext); 
  
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  const [viewIndex, setViewIndex] = useState(-1); 
  const [gameResultModal, setGameResultModal] = useState(null);
  const [stakesMsg, setStakesMsg] = useState(null); 
  const [hasClosedModal, setHasClosedModal] = useState(false);

  useEffect(() => {
    if (!socket || !gameId) return;
    socket.emit("joinGame", gameId);
    socket.emit("requestGameState", { gameId });
    socket.on("updateGame", (data) => {
      if (data && (data.id === gameId || data._id === gameId)) {
        setGameState(data);
        setLoading(false);
        if (data.chat) setChatMessages(data.chat);
        if (data.gameWinner && !gameResultModal && !hasClosedModal) setGameResultModal({...data, winner: data.gameWinner});
      }
    });
    socket.on("gameEnded", (res) => setGameResultModal(res));
    socket.on("personalStakes", (d) => setStakesMsg(`WIN: +${d.win} | LOSS: ${d.loss}`));
    return () => { socket.off("updateGame"); socket.off("gameEnded"); socket.off("personalStakes"); };
  }, [socket, gameId, gameResultModal, hasClosedModal]);

  const displayedState = useMemo(() => {
    if (!gameState) return null;
    const totalMoves = gameState.moves?.length || 0;
    const isLive = viewIndex === -1 || viewIndex === totalMoves - 1;
    if (isLive) return { ...gameState, isHistoryView: false };
    const historical = getBoardStateAtMove(gameState.moves, viewIndex);
    return { ...historical, playerToMove: null, isHistoryView: true };
  }, [gameState, viewIndex]);

  if (loading || !gameState) return <div className="loading-gate Archivo">SYNCHRONIZING_VECTORS...</div>;

  return (
    <div className="game-root">
      <InteractiveBG />
      {gameResultModal && (
        <GameEndModal result={gameResultModal} currentUser={user} onNewGame={() => navigate('/play')} onClose={() => { setGameResultModal(null); setHasClosedModal(true); }} />
      )}
      <div className="game-container">
        <header className="game-header hp-mono">
            <button className="exit-btn Archivo" onClick={() => navigate('/dashboard')}>[ EXIT_SESSION ]</button>
            <div className="header-status text-titanium">SIM_ID: {gameId.slice(0,8)} <span className="text-sulfur ml-6">UPLINK: SECURE</span></div>
        </header>

        <div className="game-layout">
          {/* LEFT COLUMN (300px) */}
          <aside className="hud-stack">
            <PlayerHUD player={gameState.playerDetails[0]} time={gameState.playerTimes[0]} isActive={!gameState.gameWinner && gameState.playerToMove === gameState.players[0]} symbol="X" baseTime={gameState.timeControl.base} />
            <div className="hud-status-node">
                <div className="node-label hp-mono text-titanium">CORE_STABILITY</div>
                <div className="simulation-status Archivo">{gameState.gameWinner ? "RESOLVED" : (socket.id === gameState.playerToMove ? "INPUT_REQUIRED" : "WAITING")}</div>
                <div className="hp-mono text-xs text-titanium opacity-50 mt-2">RECURSION_V2.4</div>
            </div>
            <PlayerHUD player={gameState.playerDetails[1]} time={gameState.playerTimes[1]} isActive={!gameState.gameWinner && gameState.playerToMove === gameState.players[1]} symbol="O" baseTime={gameState.timeControl.base} />
          </aside>

          {/* CENTER COLUMN (SCALED 80%) */}
          <main className="battle-area">
            <div className="board-frame">
              <div className="corner-tl"></div><div className="corner-tr"></div>
              <div className="corner-bl"></div><div className="corner-br"></div>
              {displayedState.isHistoryView && (
                <div className="archive-alert Archivo" onClick={() => setViewIndex(-1)}>
                  PROJECTING_ARCHIVE // RETURN_TO_LIVE
                </div>
              )}
              <div className="scaled-board-wrapper">
                <SuperBoard allBoards={displayedState.allBoards} activeBoard={displayedState.activeBoard} boardWinners={displayedState.boardWinners} gameWinner={gameState.gameWinner} playerToMove={displayedState.playerToMove} gameId={gameId} />
              </div>
            </div>
          </main>

          {/* RIGHT COLUMN (320px) */}
          <aside className="intel-stack">
            <div className="tech-panel history-panel">
              <div className="panel-label hp-mono text-titanium">NEURAL_HISTORY</div>
              <MoveHistory moves={gameState.moves} currentMoveIndex={viewIndex === -1 ? gameState.moves.length - 1 : viewIndex} onSelectMove={setViewIndex} />
            </div>
            <div className="engagement-controls">
                <button className="tactical-btn Archivo" onClick={() => socket.emit("offerDraw", { gameId })} disabled={!!gameState.gameWinner}>STALEMATE</button>
                <button className="tactical-btn resign Archivo" onClick={() => window.confirm("ABORT?") && socket.emit("resign", { gameId })} disabled={!!gameState.gameWinner}>ABORT</button>
            </div>
            <BattleChat messages={chatMessages} systemMessage={stakesMsg} onSend={(text) => socket.emit('sendChatMessage', { gameId, message: text })} myUsername={user?.username} />
          </aside>
        </div>
      </div>
    </div>
  );
}