// client/src/pages/PlayPage.js
import React, { useState, useEffect, useContext, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import SuperBoard from '../components/SuperBoard';
import './PlayPage.css';

const formatTime = (ms) => {
  if (!ms || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// --- PlayerPod Sub-component ---
const PlayerPod = ({ player, time, timeControl, isTurn, mark }) => {
  if (!player) return <div className="player-pod"></div>;
  const timePercentage = (time / timeControl.base) * 100;
  return (
    <div className={`player-pod ${isTurn ? 'active' : ''}`}>
      <div className="player-avatar"></div>
      <div className="player-details">
        <span className="player-name">{player.username} ({mark})</span>
        <span className="player-elo">{player.elo}</span>
      </div>
      <div className={`player-clock ${time < 10000 ? 'low-time' : ''}`}>
        <div className="time-bar" style={{ width: `${timePercentage}%` }}></div>
        <span className="time-text">{formatTime(time)}</span>
      </div>
    </div>
  );
};

// --- GameChat Sub-component ---
const GameChat = ({ gameId, chat }) => {
    const socket = useSocket();
    const { user } = useContext(AuthContext);
    const [message, setMessage] = useState('');
    const chatBodyRef = useRef(null);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [chat]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && socket) {
            socket.emit('sendChatMessage', { gameId, message });
            setMessage('');
        }
    };

    return (
        <div className="game-chat">
            <div className="chat-body" ref={chatBodyRef}>
                {(chat || []).map((msg, index) => (
                    <div key={index} className={`chat-message ${msg.sender === user.username ? 'my-message' : ''}`}>
                        <strong>{msg.sender}:</strong> {msg.text}
                    </div>
                ))}
            </div>
            <form onSubmit={handleSendMessage} className="chat-form">
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." autoComplete="off"/>
                <button type="submit">Send</button>
            </form>
        </div>
    );
};

// --- Main Play Page Component ---
const PlayPage = () => {
  const { gameState } = useGame();
  const socket = useSocket();
  const gameId = gameState?.id;

  useEffect(() => {
    if (!socket || !gameId) return;
    const handleDrawOffer = () => {
      if (window.confirm("Your opponent has offered a draw. Do you accept?")) {
        socket.emit('acceptDraw', gameId);
      } else {
        socket.emit('declineDraw', gameId);
      }
    };
    socket.on('drawOffered', handleDrawOffer);
    return () => socket.off('drawOffered', handleDrawOffer);
  }, [socket, gameId]);

  const handleResign = () => {
      if (window.confirm("Are you sure you want to resign?")) {
          socket.emit('resign', { gameId });
      }
  };

  const handleOfferDraw = () => {
      socket.emit('offerDraw', gameId);
      alert("Draw offer sent.");
  };

  if (!gameState) {
    return <div className="loading-text-centered">Waiting for game data...</div>;
  }

  const { players, playerDetails, playerToMove, gameWinner, chat, drawOffer } = gameState;
  const isPlayer1Turn = playerToMove === players[0];
  const [player1, player2] = playerDetails;

  return (
    <div className="play-page-grid">
      <div className="player-top">
        <PlayerPod player={player2} time={gameState.playerTimes[1]} timeControl={gameState.timeControl} isTurn={!isPlayer1Turn} mark="O" />
      </div>
      <div className="game-board-area">
        {/* THIS IS THE FIX: The SuperBoard is now rendered here */}
        <SuperBoard gameState={gameState} />
      </div>
      <div className="side-panel-area">
        <GameChat gameId={gameId} chat={chat} />
        <div className="game-actions-hud">
            { !gameWinner && (
              <>
                <button onClick={handleOfferDraw} disabled={!!drawOffer}>Offer Draw</button>
                <button onClick={handleResign} className="resign-btn">Resign</button>
              </>
            )}
        </div>
      </div>
      <div className="player-bottom">
        <PlayerPod player={player1} time={gameState.playerTimes[0]} timeControl={gameState.timeControl} isTurn={isPlayer1Turn} mark="X" />
      </div>
    </div>
  );
};
export default PlayPage;