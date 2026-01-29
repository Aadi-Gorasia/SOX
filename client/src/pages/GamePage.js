import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";

// Components
import SuperBoard from "../components/SuperBoard";
import MoveHistory from "../components/MoveHistory";
import GameEndModal from "../components/GameEndModal";
import GameReview from "../components/GameReview";

// Utils
import { getBoardStateAtMove } from "../utils/boardLogic";

import "./GamePage.css";

// --- DEFAULT AVATAR ---
const DefaultAvatar = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="hud-avatar-img">
    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#555"/>
    <path d="M20 21C20 18.2386 17.7614 16 15 16H9C6.23858 16 4 18.2386 4 21" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// --- CHAT COMPONENT ---
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
      <div className="panel-header">COMMS_LINK</div>
      <div className="chat-messages">
        {/* Persistent System Message (Stakes) */}
        {systemMessage && (
          <div className="chat-bubble-row row-left">
            <div className="chat-bubble bubble-system">
              <div className="chat-text" style={{ color: '#ffd700', fontWeight: 'bold' }}>
                {systemMessage}
              </div>
            </div>
          </div>
        )}

        {/* Regular Chat */}
        {messages.length === 0 && !systemMessage && <div className="system-msg">System Ready...</div>}
        
        {messages.map((m, i) => {
          const msgUser = m.user ? m.user.toLowerCase() : "";
          const myUser = myUsername ? myUsername.toLowerCase() : "";
          const isMe = msgUser === myUser;

          return (
            <div key={i} className={`chat-bubble-row ${isMe ? 'row-right' : 'row-left'}`}>
              <div className={`chat-bubble ${isMe ? 'bubble-self' : 'bubble-opp'}`}>
                <div className="chat-name-header">{m.user || "Unknown"}</div>
                <div className="chat-text">{m.text}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      <form className="chat-input-area" onSubmit={handleSubmit}>
        <input 
          className="chat-input" 
          placeholder="Type message..." 
          value={input} 
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
};

// --- MAIN PAGE ---
export default function GamePage() {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user } = useContext(AuthContext); 
  
  // Game State
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);
  
  // UX State
  const [viewIndex, setViewIndex] = useState(-1); // -1 = Live, 0+ = History Index
  const [gameResultModal, setGameResultModal] = useState(null); // Data for popup
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [stakesMsg, setStakesMsg] = useState(null); 
  
  // FIX: Flag to prevent popup from reopening automatically
  const [hasClosedModal, setHasClosedModal] = useState(false);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket || !gameId) return;

    // 1. Handle Game Updates (Moves, Time, Chat)
    const handleUpdate = (newGameState) => {
      if (newGameState && (newGameState.id === gameId || newGameState._id === gameId)) {
        setGameState(newGameState);
        setLoading(false);
        if (newGameState.chat) setChatMessages(newGameState.chat);

        // FIX: Only show fallback popup if user hasn't closed it yet
        if (newGameState.gameWinner && !gameResultModal && !hasClosedModal) {
          const p1 = newGameState.playerDetails[0];
          const p2 = newGameState.playerDetails[1];
          setGameResultModal({
            winner: newGameState.gameWinner,
            reason: 'Game Over', 
            winnerId: newGameState.gameWinner === 'D' ? null : (newGameState.gameWinner === 'X' ? p1.id : p2.id),
            players: [
              { ...p1, change: 0, newElo: p1.elo }, 
              { ...p2, change: 0, newElo: p2.elo }
            ]
          });
        }
      }
    };

    // 2. Handle Official Game End (Exact ELO changes)
    const handleGameEnded = (result) => {
      setGameResultModal(result);
      setHasClosedModal(false); // Reset flag on new official result
    };

    // 3. Handle Draw Offers
    const handleDrawOffer = () => {
      const accept = window.confirm("Opponent has offered a draw. Do you accept?");
      socket.emit(accept ? "acceptDraw" : "declineDraw", { gameId });
    };

    // 4. Handle Personalized Stakes (The Whisper)
    const handlePersonalStakes = (data) => {
      const msg = `Stakes vs ${data.opponent}: Win +${data.win} | Draw ${data.draw >= 0 ? '+' : ''}${data.draw} | Loss ${data.loss}`;
      setStakesMsg(msg);
    };

    // Join & Listen
    socket.emit("joinGame", gameId);
    socket.emit("requestGameState", { gameId });
    
    socket.on("updateGame", handleUpdate);
    socket.on("gameEnded", handleGameEnded);
    socket.on("drawOffered", handleDrawOffer);
    socket.on("personalStakes", handlePersonalStakes);
    
    // Cleanup
    return () => {
      socket.off("updateGame", handleUpdate);
      socket.off("gameEnded", handleGameEnded);
      socket.off("drawOffered", handleDrawOffer);
      socket.off("personalStakes", handlePersonalStakes);
    };
  }, [socket, gameId, gameResultModal, hasClosedModal]); // Added hasClosedModal to deps

  // --- ACTIONS ---
  const handleSendChat = (text) => {
    let myName = user?.username;
    if (!myName && gameState && user?._id) {
        const me = gameState.playerDetails.find(p => p && p.id === user._id);
        if (me) myName = me.username;
    }
    if (myName) setChatMessages(prev => [...prev, { user: myName, text }]);
    socket.emit('sendChatMessage', { gameId, message: text });
  };

  const handleResign = () => {
    if (window.confirm("Are you sure you want to resign?")) {
      socket.emit("resign", { gameId });
    }
  };

  const handleOfferDraw = () => {
    if (window.confirm("Offer a draw?")) {
      socket.emit("offerDraw", { gameId });
    }
  };

  const handleRematch = () => {
    alert("Rematch requested (Backend implementation pending)");
  };

  // --- VIEW LOGIC (Time Travel) ---
  const handleHistoryClick = (index) => {
    setViewIndex(index);
    setIsReviewMode(false);
  };

  const displayedState = useMemo(() => {
    if (!gameState) return null;
    const totalMoves = gameState.moves ? gameState.moves.length : 0;
    const isLive = viewIndex === -1 || viewIndex === totalMoves - 1;

    if (isLive) {
      return {
        allBoards: gameState.allBoards,
        boardWinners: gameState.boardWinners,
        activeBoard: gameState.activeBoard,
        playerToMove: gameState.playerToMove,
        isHistoryView: false
      };
    } else {
      const { allBoards, boardWinners, activeBoard } = getBoardStateAtMove(gameState.moves, viewIndex);
      return {
        allBoards,
        boardWinners,
        activeBoard, 
        playerToMove: null, 
        isHistoryView: true
      };
    }
  }, [gameState, viewIndex]);

  // --- TIME FORMATTER ---
  const formatTime = (ms) => {
    if (ms == null) return "00:00";
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(totalSeconds / 60);
    const s = Math.floor(totalSeconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // --- RENDER ---
  if (loading || !gameState) {
    return <div className="gamepage"><div className="spinner" /></div>;
  }

  const {
    players = [],
    playerDetails = [],
    playerTimes = [0, 0],
    gameWinner,
    moves = [],
  } = gameState;

  const p1 = playerDetails[0] || { username: "Player 1", elo: 1000 };
  const p2 = playerDetails[1] || { username: "Player 2", elo: 1000 };
  
  const isP1Turn = displayedState.playerToMove === players?.[0];
  const isP2Turn = displayedState.playerToMove === players?.[1];
  const gameOver = !!gameWinner;

  return (
    <div className="gamepage">
      {/* GAME END POPUP */}
      {gameResultModal && (
        <GameEndModal 
          result={gameResultModal}
          currentUser={user}
          onRematch={handleRematch}
          onNewGame={() => navigate('/play')}
          onReview={() => {
            setGameResultModal(null);
            setHasClosedModal(true);
            setIsReviewMode(true);
          }}
          // FIX: Closing the modal sets the flag so it doesn't reopen
          onClose={() => {
            setGameResultModal(null);
            setHasClosedModal(true);
          }}
        />
      )}

      <div className="gamepage-inner">
        <div className="game-main-area">
          <div className="board-container">
            <div className="board-shell">
              
              {isReviewMode ? (
                <GameReview 
                  moves={moves} 
                  onExit={() => setIsReviewMode(false)}
                />
              ) : (
                <>
                  {displayedState.isHistoryView && (
                    <div className="history-overlay-warning" onClick={() => setViewIndex(-1)}>
                      Viewing Move {viewIndex + 1} / {moves.length} • Click to Return to Live
                    </div>
                  )}

                  <SuperBoard
                    allBoards={displayedState.allBoards}
                    activeBoard={displayedState.activeBoard}
                    boardWinners={displayedState.boardWinners}
                    gameWinner={gameWinner}
                    playerToMove={displayedState.playerToMove}
                    players={players}
                    gameId={gameId}
                  />
                </>
              )}
              
            </div>
          </div>

          <div className="side-column">
            <div className="tech-panel history-module">
              <div className="panel-header">MOVE_LOG</div>
              <div className="history-content">
                <MoveHistory 
                  moves={moves} 
                  currentMoveIndex={viewIndex === -1 ? moves.length - 1 : viewIndex}
                  onSelectMove={handleHistoryClick} 
                />
              </div>
            </div>

            <div className="game-controls">
                <button className="ctrl-btn draw-btn" onClick={handleOfferDraw} disabled={gameOver}>½ DRAW</button>
                <button className="ctrl-btn resign-btn" onClick={handleResign} disabled={gameOver}>?? RESIGN</button>
            </div>
            
            <BattleChat 
              messages={chatMessages} 
              systemMessage={stakesMsg}
              onSend={handleSendChat}
              myUsername={user?.username} 
            />
          </div>
        </div>

        <div className="game-bottom-hud">
          <div className="hud-player-block">
            <div className="hud-avatar">
              {p1.avatar ? <img src={p1.avatar} alt="p1" className="hud-avatar-img"/> : <DefaultAvatar />}
            </div>
            <div className="hud-details">
              <div className="hud-name">{p1.username}</div>
              <div className="hud-elo">PWR: {p1.elo || 1200}</div>
            </div>
          </div>

          <div className="hud-timers">
            <div className={`hud-timer-box ${!gameOver && isP1Turn ? 'active' : ''}`}>
              {formatTime(playerTimes[0])}
            </div>
            <div className={`hud-timer-box ${!gameOver && isP2Turn ? 'active' : ''}`}>
              {formatTime(playerTimes[1])}
            </div>
          </div>

          <div className="hud-player-block right-align">
            <div className="hud-details">
              <div className="hud-name">{p2.username}</div>
              <div className="hud-elo">PWR: {p2.elo || 1200}</div>
            </div>
            <div className="hud-avatar">
              {p2.avatar ? <img src={p2.avatar} alt="p2" className="hud-avatar-img"/> : <DefaultAvatar />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}