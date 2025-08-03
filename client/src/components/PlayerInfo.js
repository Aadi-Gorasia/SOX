// client/src/components/PlayerInfo.js
import React from 'react';
import { useGame } from '../context/GameContext';
import { useSocket } from '../context/SocketContext'; // We need this to know who "we" are
import './PlayerInfo.css';

const formatTime = (ms) => {
  if (!ms || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const PlayerInfo = () => {
  const { gameState } = useGame();
  const socket = useSocket();

  if (!gameState || !gameState.playerDetails || !socket) {
    return <div className="player-info-bar-placeholder"></div>;
  }

  const { playerTimes, timeControl, playerDetails, players, playerToMove } = gameState;
  const [player1, player2] = playerDetails;

  // --- THIS IS THE NEW LOGIC ---
  // Determine if it's player 1's turn
  const isPlayer1Turn = playerToMove === players[0];
  // ----------------------------

  const player1TimePercentage = (playerTimes[0] / timeControl.base) * 100;
  const player2TimePercentage = (playerTimes[1] / timeControl.base) * 100;

  return (
    <div className="player-info-bar">
      {/* Add the 'active-player' class conditionally */}
      <div className={`player-card ${isPlayer1Turn ? 'active-player' : ''}`}>
        <div className="player-name">{player1.username} (X)</div>
        <div className="player-elo">{player1.elo}</div>
      </div>
      
      <div className="timer-container">
        <div className={`timer ${isPlayer1Turn ? 'active-timer' : ''} ${playerTimes[0] < 10000 ? 'low-time' : ''}`}>
          <div className="time-bar" style={{ width: `${player1TimePercentage}%` }}></div>
          <span className="time-text">{formatTime(playerTimes[0])}</span>
        </div>
        <div className={`timer ${!isPlayer1Turn ? 'active-timer' : ''} ${playerTimes[1] < 10000 ? 'low-time' : ''}`}>
          <div className="time-bar" style={{ width: `${player2TimePercentage}%` }}></div>
          <span className="time-text">{formatTime(playerTimes[1])}</span>
        </div>
      </div>
      
      {/* Add the 'active-player' class conditionally */}
      <div className={`player-card right ${!isPlayer1Turn ? 'active-player' : ''}`}>
        <div className="player-name">{player2.username} (O)</div>
        <div className="player-elo">{player2.elo}</div>
      </div>
    </div>
  );
};

export default PlayerInfo;