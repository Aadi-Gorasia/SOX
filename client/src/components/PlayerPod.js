import React from 'react';
import './PlayerPod.css';

const formatTime = (ms) => {
    if (!ms || ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const PlayerPod = ({ player, time, isTurn, mark }) => {
    if (!player) {
        // Render a placeholder if player data isn't available yet
        return <div className="player-pod-container placeholder"></div>;
    }

    return (
        <div className={`player-pod-container ${isTurn ? 'active-turn' : ''}`}>
            <div className="player-avatar"></div>
            <div className="player-details">
                <span className="player-name">{player.username}</span>
                <span className="player-elo">({mark}) {player.elo}</span>
            </div>
            <div className="player-clock">
                {formatTime(time)}
            </div>
        </div>
    );
};

export default PlayerPod;