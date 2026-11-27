import React, { useState, useEffect, useRef, useContext, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { AuthContext } from "../context/AuthContext";

// Components
import SuperBoard from "../components/SuperBoard";
import MoveHistory from "../components/MoveHistory";
import GameEndModal from "../components/GameEndModal";
import PlayerHUD from "../components/PlayerHUD";


// Utils
import { getBoardStateAtMove } from "../utils/boardLogic";
import "./GamePage.css"; // (Assuming this is the CSS I provided in the previous prompt)

const BattleChat = ({ messages, systemMessage, onSend, myUsername }) => {
  const [input, setInput] = useState("");
  const messagesRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input.trim()) { 
      onSend(input); 
      setInput(""); 
    }
  };

  useEffect(() => { 
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages, systemMessage]);

  return (
    <div className="tech-panel chat-module">
      <div className="panel-label">Chat</div>
      <div className="chat-messages" ref={messagesRef}>
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
  const [connected, setConnected] = useState(false);
  const [joinError, setJoinError] = useState('');

  // Rejoin on every connection, and only enable moves after fresh state arrives.
  useEffect(() => {
    if (!socket || !gameId) return;
    setGameState(null); setLoading(true); setJoinError(''); setHasClosedModal(false);
    const join = () => { setConnected(false); setJoinError(''); socket.emit('joinGame', gameId); };
    const disconnect = () => setConnected(false);
    const error = data => { setConnected(false); setLoading(false); setJoinError(data?.message || 'This game is unavailable.'); };
    const update = data => {
      if (!data || (data.id !== gameId && data._id !== gameId)) return;
      setGameState(data); setLoading(false); setConnected(socket.connected); setJoinError('');
      if (data.chat) setChatMessages(data.chat);
    };
    const ended = result => setGameResultModal(result);
    const stakes = data => setStakesMsg(data.rated === false ? 'Private game · Unrated' : `Win: +${data.win} Elo | Loss: ${data.loss} Elo`);
    socket.on('connect', join); socket.on('disconnect', disconnect);
    socket.on('connect_error', disconnect); socket.on('gameJoinError', error);
    socket.on('gameCancelled', error); socket.on('updateGame', update);
    socket.on('gameEnded', ended); socket.on('personalStakes', stakes);
    if (socket.connected) join();
    return () => {
      socket.off('connect', join); socket.off('disconnect', disconnect);
      socket.off('connect_error', disconnect); socket.off('gameJoinError', error);
      socket.off('gameCancelled', error); socket.off('updateGame', update);
      socket.off('gameEnded', ended); socket.off('personalStakes', stakes);
    };
  }, [socket, gameId]);

  useEffect(() => {
    if (gameState?.gameWinner && !hasClosedModal) {
      setGameResultModal(current => current || gameState.result || {...gameState, players: gameState.playerDetails, winner: gameState.gameWinner});
    }
  }, [gameState, hasClosedModal]);

  // Handle Archive/History viewing
  const displayedState = useMemo(() => {
    if (!gameState) return null;
    const totalMoves = gameState.moves?.length || 0;
    const isLive = viewIndex === -1 || viewIndex === totalMoves - 1;
    
    if (isLive) return { ...gameState, isHistoryView: false };
    
    const historical = getBoardStateAtMove(gameState.moves, viewIndex);
    return { ...historical, playerToMove: null, isHistoryView: true };
  },[gameState, viewIndex]);

  if (joinError) return <div className="game-root"><div className="game-unavailable" role="alert"><h1>Game unavailable</h1><p>{joinError}</p><button onClick={() => navigate('/play')}>Back to play</button><button onClick={() => window.location.reload()}>Try again</button></div></div>;
  if (loading || !gameState) {
    return (
      <div className="game-root">
        <div className="loading-gate">{socket?.connected ? 'Loading game…' : 'Connecting to your game…'}<button onClick={() => navigate('/play')}>Back to play</button></div>
      </div>
    );
  }

  // ==========================================
  // RELOAD SAFE TURN CHECK
  // Finds your index based on your DB ID, then checks if it's your socket's turn
  // ==========================================
  const myIndex = gameState.playerDetails.findIndex(p => p && String(p.id) === String(user?._id));
  const isMyTurn = connected && myIndex >= 0 && !gameState.waitingForOpponent && !gameState.gameWinner && (gameState.playerToMove === gameState.players[myIndex]);
  const drawOffer = gameState.drawOffer;
  const hasIncomingDrawOffer = drawOffer && String(drawOffer) !== String(user?._id);
  const drawOfferer = gameState.playerDetails.find(player =>
    String(player?.id) === String(drawOffer)
  );

  return (
    <div className="game-root">

      
      {gameResultModal && (
        <GameEndModal 
          gameId={gameResultModal.savedGameId || gameState.savedGameId}
          result={gameResultModal} 
          currentUser={user} 
          onNewGame={() => navigate('/play')} 
          onClose={() => { setGameResultModal(null); setHasClosedModal(true); }} 
        />
      )}
      
      <div className="game-container">
        
        {/* Header */}
        <header className="game-header">
            <button className="exit-btn" onClick={() => navigate('/dashboard')}>Back to play</button>
            <div className="header-status">
              <span>Match ID: {gameId.slice(0,8)}</span>
              <span className="status-indicator" role="status">{connected ? (gameState.gameWinner ? 'Finished' : '● Live') : 'Reconnecting… moves paused'}</span>
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
                  {gameState.waitingForOpponent ? "Waiting for opponent" : gameState.gameWinner ? "Game over" : (isMyTurn ? "Your Turn" : "Their turn")}
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
                  disabled={!connected || gameState.waitingForOpponent || !!gameState.gameWinner || !!drawOffer}
                >
                  {drawOffer ? 'Draw pending' : 'Offer draw'}
                </button>
                <button 
                  className="tactical-btn resign" 
                  onClick={() => window.confirm("Are you sure you want to resign?") && socket.emit("resign", { gameId })} 
                  disabled={!connected || gameState.waitingForOpponent || !!gameState.gameWinner}
                >
                  Resign
                </button>
            </div>
            {drawOffer && (
              <div className="game-draw-status" role="status">
                <p>
                  {hasIncomingDrawOffer
                    ? `${drawOfferer?.username || 'Your opponent'} offered a draw.`
                    : 'Draw offer sent. Waiting for your opponent.'}
                </p>
                {hasIncomingDrawOffer && (
                  <div className="game-draw-actions">
                    <button
                      className="tactical-btn"
                      disabled={!connected} onClick={() => socket.emit('acceptDraw', { gameId })}
                    >
                      Accept
                    </button>
                    <button
                      className="tactical-btn"
                      disabled={!connected} onClick={() => socket.emit('declineDraw', { gameId })}
                    >
                      Decline
                    </button>
                  </div>
                )}
              </div>
            )}

            <BattleChat 
              messages={chatMessages} 
              systemMessage={stakesMsg} 
              onSend={(text) => connected && socket.emit('sendChatMessage', { gameId, message: text })}
              myUsername={user?.username} 
            />
            
          </aside>
        </div>
      </div>
    </div>
  );
}