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
import "./GamePage.css"; // (Assuming this is the CSS I provided in the previous prompt)

const BattleChat = ({ messages, systemMessage, onSend, myUsername }) => {
  const [input, setInput] = useState("");
  const endRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) { 
      onSend(input); 
      setInput(""); 
    }
  };

  useEffect(() => { 
    endRef.current?.scrollIntoView({ behavior: "smooth" }); 
  }, [messages, systemMessage]);

  return (
    <div className="tech-panel chat-module">
      <div className="panel-label">Match Comms</div>
      <div className="chat-messages">
        {systemMessage && (
          <div className="chat-line system">
            [SYS] {systemMessage}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-line ${m.user?.toLowerCase() === myUsername?.toLowerCase() ? 'self' : 'opp'}`}>
            <span className="chat-user">{m.user}:</span> {m.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input 
          className="chat-input" 
          placeholder="Send a message..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          autoComplete="off"
        />
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
  const[viewIndex, setViewIndex] = useState(-1); 
  const[gameResultModal, setGameResultModal] = useState(null);
  const [stakesMsg, setStakesMsg] = useState(null); 
  const [hasClosedModal, setHasClosedModal] = useState(false);

  // Connection & Data Sync
  useEffect(() => {
    if (!socket || !gameId) return;
    
    // Request join room & state immediately on load/reload
    socket.emit("joinGame", gameId);
    socket.emit("requestGameState", { gameId });
    
    socket.on("updateGame", (data) => {
      if (data && (data.id === gameId || data._id === gameId)) {
        setGameState(data);
        setLoading(false);
        if (data.chat) setChatMessages(data.chat);
        if (data.gameWinner && !gameResultModal && !hasClosedModal) {
          setGameResultModal({...data, winner: data.gameWinner});
        }
      }
    });

    socket.on("gameEnded", (res) => setGameResultModal(res));
    socket.on("personalStakes", (d) => setStakesMsg(`Win: +${d.win} ELO | Loss: ${d.loss} ELO`));
    
    return () => { 
      socket.off("updateGame"); 
      socket.off("gameEnded"); 
      socket.off("personalStakes"); 
    };
  }, [socket, gameId, gameResultModal, hasClosedModal]);

  // Handle Archive/History viewing
  const displayedState = useMemo(() => {
    if (!gameState) return null;
    const totalMoves = gameState.moves?.length || 0;
    const isLive = viewIndex === -1 || viewIndex === totalMoves - 1;
    
    if (isLive) return { ...gameState, isHistoryView: false };
    
    const historical = getBoardStateAtMove(gameState.moves, viewIndex);
    return { ...historical, playerToMove: null, isHistoryView: true };
  },[gameState, viewIndex]);

  if (loading || !gameState) {
    return (
      <div className="game-root">
        <div className="loading-gate">Synchronizing Match Data...</div>
      </div>
    );
  }

  // ==========================================
  // RELOAD SAFE TURN CHECK
  // Finds your index based on your DB ID, then checks if it's your socket's turn
  // ==========================================
  const myIndex = gameState.playerDetails.findIndex(p => p.id === user?._id);
  const isMyTurn = !gameState.gameWinner && (gameState.playerToMove === gameState.players[myIndex]);

  return (
    <div className="game-root">
      <InteractiveBG />
      
      {gameResultModal && (
        <GameEndModal 
          result={gameResultModal} 
          currentUser={user} 
          onNewGame={() => navigate('/play')} 
          onClose={() => { setGameResultModal(null); setHasClosedModal(true); }} 
        />
      )}
      
      <div className="game-container">
        
        {/* Header */}
        <header className="game-header">
            <button className="exit-btn" onClick={() => navigate('/dashboard')}>Back to Arena</button>
            <div className="header-status">
              <span>Match ID: {gameId.slice(0,8)}</span>
              <span className="status-indicator">● LIVE</span>
            </div>
        </header>

        <div className="game-layout">
          
          {/* LEFT: HUD Stack */}
          <aside className="hud-stack">
            <PlayerHUD 
              player={gameState.playerDetails[0]} 
              time={gameState.playerTimes[0]} 
              isActive={!gameState.gameWinner && gameState.playerToMove === gameState.players[0]} 
              symbol="X" 
              baseTime={gameState.timeControl.base} 
            />
            
            <div className="hud-status-node">
                <div className="node-label">Match Status</div>
                <div className={`simulation-status ${isMyTurn ? 'active-status' : ''}`}>
                  {gameState.gameWinner ? "Concluded" : (isMyTurn ? "Your Turn" : "Wait")}
                </div>
            </div>
            
            <PlayerHUD 
              player={gameState.playerDetails[1]} 
              time={gameState.playerTimes[1]} 
              isActive={!gameState.gameWinner && gameState.playerToMove === gameState.players[1]} 
              symbol="O" 
              baseTime={gameState.timeControl.base} 
            />
          </aside>

          {/* CENTER: Battlefield */}
          <main className="battle-area">
            <div className="board-frame">
              
              {displayedState.isHistoryView && (
                <div className="archive-alert" onClick={() => setViewIndex(-1)}>
                  Viewing History — Return to Live
                </div>
              )}
              
              <div className="scaled-board-wrapper">
                <SuperBoard 
                  allBoards={displayedState.allBoards} 
                  activeBoard={displayedState.activeBoard} 
                  boardWinners={displayedState.boardWinners} 
                  gameWinner={gameState.gameWinner} 
                  isMyTurn={isMyTurn} // Passed explicitly
                  gameId={gameId} 
                />
              </div>
            </div>
          </main>

          {/* RIGHT: Intel & Chat */}
          <aside className="intel-stack">
            
            <div className="tech-panel history-panel">
              <MoveHistory 
                moves={gameState.moves} 
                currentMoveIndex={viewIndex === -1 ? gameState.moves.length - 1 : viewIndex} 
                onSelectMove={setViewIndex} 
              />
            </div>
            
            <div className="engagement-controls">
                <button 
                  className="tactical-btn" 
                  onClick={() => socket.emit("offerDraw", { gameId })} 
                  disabled={!!gameState.gameWinner}
                >
                  Draw
                </button>
                <button 
                  className="tactical-btn resign" 
                  onClick={() => window.confirm("Are you sure you want to resign?") && socket.emit("resign", { gameId })} 
                  disabled={!!gameState.gameWinner}
                >
                  Resign
                </button>
            </div>

            <BattleChat 
              messages={chatMessages} 
              systemMessage={stakesMsg} 
              onSend={(text) => socket.emit('sendChatMessage', { gameId, message: text })} 
              myUsername={user?.username} 
            />
            
          </aside>
        </div>
      </div>
    </div>
  );
}