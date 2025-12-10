import React, { useState, useEffect, useRef, useContext } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";
import SuperBoard from "../components/SuperBoard";
import MoveHistory from "../components/MoveHistory";
import "./GamePage.css";

// --- DEFAULT AVATAR ---
const DefaultAvatar = () => (
  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="hud-avatar-img">
    <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="#555"/>
    <path d="M20 21C20 18.2386 17.7614 16 15 16H9C6.23858 16 4 18.2386 4 21" stroke="#555" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

// --- CHAT COMPONENT ---
const BattleChat = ({ messages, onSend, myUsername }) => {
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
  }, [messages]);

  return (
    <div className="tech-panel chat-module">
      <div className="panel-header">COMMS_LINK</div>
      
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="system-msg">System Ready...</div>
        )}
        
        {messages.map((m, i) => {
          // Normalize for case-insensitive comparison
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
  const socket = useSocket();
  const { user } = useContext(AuthContext); 
  
  const [gameState, setGameState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chatMessages, setChatMessages] = useState([]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    if (!socket || !gameId) return;

    const handleUpdate = (newGameState) => {
      if (newGameState && (newGameState.id === gameId || newGameState._id === gameId)) {
        setGameState(newGameState);
        setLoading(false);
        if (newGameState.chat) {
          setChatMessages(newGameState.chat);
        }
      }
    };

    const handleDrawOffer = () => {
      const accept = window.confirm("Opponent has offered a draw. Do you accept?");
      socket.emit(accept ? "acceptDraw" : "declineDraw", gameId);
    };

    socket.emit("joinGame", gameId);
    socket.emit("requestGameState", { gameId });
    
    socket.on("updateGame", handleUpdate);
    socket.on("drawOffered", handleDrawOffer);
    
    return () => {
      socket.off("updateGame", handleUpdate);
      socket.off("drawOffered", handleDrawOffer);
    };
  }, [socket, gameId]);

  // --- ACTIONS ---
  const handleSendChat = (text) => {
    // 1. Try to get username from Auth Context
    let myName = user?.username;
    
    // 2. Fallback: Try to find my name in the game details if Auth is slow
    if (!myName && gameState && user?._id) {
        const me = gameState.playerDetails.find(p => p && p.id === user._id);
        if (me) myName = me.username;
    }

    // 3. Optimistic Update (Show immediately)
    if (myName) {
        setChatMessages(prev => [...prev, { user: myName, text }]);
    }

    // 4. Send to server
    socket.emit('sendChatMessage', { gameId, message: text });
  };

  const handleResign = () => {
    if (window.confirm("Are you sure you want to resign?")) {
      socket.emit("resign", { gameId });
    }
  };

  const handleOfferDraw = () => {
    if (window.confirm("Offer a draw?")) {
      socket.emit("offerDraw", gameId);
    }
  };

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
    return (
      <div className="gamepage" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" />
      </div>
    );
  }

  const {
    players = [],
    playerDetails = [],
    playerToMove,
    playerTimes = [0, 0],
    allBoards,
    activeBoard,
    boardWinners,
    gameWinner,
    moves = [],
  } = gameState;

  const p1 = playerDetails[0] || { username: "Player 1", elo: 1000 };
  const p2 = playerDetails[1] || { username: "Player 2", elo: 1000 };
  
  const isP1Turn = playerToMove === players?.[0];
  const isP2Turn = playerToMove === players?.[1];
  const gameOver = !!gameWinner;

  return (
    <div className="gamepage">
      <div className="gamepage-inner">
        <div className="game-main-area">
          <div className="board-container">
            <div className="board-shell">
              <SuperBoard
                allBoards={allBoards}
                activeBoard={activeBoard}
                boardWinners={boardWinners}
                gameWinner={gameWinner}
                playerToMove={playerToMove}
                players={players}
                gameId={gameId}
              />
            </div>
          </div>
          <div className="side-column">
            <div className="tech-panel history-module">
              <div className="panel-header">MOVE_LOG</div>
              <div className="history-content">
                <MoveHistory moves={moves} userId={p1._id} />
              </div>
            </div>
            <div className="game-controls">
                <button className="ctrl-btn draw-btn" onClick={handleOfferDraw} disabled={gameOver}>½ DRAW</button>
                <button className="ctrl-btn resign-btn" onClick={handleResign} disabled={gameOver}>🏳 RESIGN</button>
            </div>
            <BattleChat 
              messages={chatMessages} 
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