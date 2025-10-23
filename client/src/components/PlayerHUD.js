// client/src/components/PlayerHUD.js
import React from 'react';
import './PlayerHUD.css';

const formatTime = (ms) => {
  if (ms === null || ms === undefined || ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const PlayerHUD = ({ player1, player2, playerTimes, timeControl, isPlayer1Turn }) => {
    // Render nothing if the data isn't ready, to prevent errors
    if (!player1 || !player2 || !playerTimes || !timeControl) {
        return <div className="player-hud-container placeholder"></div>;
    }
    
    // Calculate the percentage of time remaining for the visual bar
    const p1TimePercentage = (playerTimes[0] / timeControl.base) * 100;
    const p2TimePercentage = (playerTimes[1] / timeControl.base) * 100;

    return (
        <footer className="player-hud-container">
            {/* Player 1 Info */}
            <div className="player-info left">
                <h3>{player1.username}</h3>
                <span>{player1.elo}</span>
            </div>

            {/* Clocks Section */}
            <div className="clocks-container">
                <div className={`clock-wrapper ${isPlayer1Turn ? 'active' : ''}`}>
                    <div className="clock-time">{formatTime(playerTimes[0])}</div>
                    <div className="time-bar">
                        <div className="time-bar-fill" style={{width: `${p1TimePercentage}%`}}></div>
                    </div>
                </div>
                <div className={`clock-wrapper ${!isPlayer1Turn ? 'active' : ''}`}>
                    <div className="clock-time">{formatTime(playerTimes[1])}</div>
                    <div className="time-bar">
                        <div className="time-bar-fill" style={{width: `${p2TimePercentage}%`}}></div>
                    </div>
                </div>
            </div>

            {/* Player 2 Info */}
            <div className="player-info right">
                <h3>{player2.username}</h3>
                <span>{player2.elo}</span>
            </div>
        </footer>
    );
};

export default PlayerHUD;