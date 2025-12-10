// client/src/pages/DashboardPage.js
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './DashboardPage.css';

// --- WIN/LOSS RATIO BAR ---
const WinLossRatioBar = ({ wins, losses }) => {
  const total = wins + losses;
  const winPercentage = total > 0 ? Math.round((wins / total) * 100) : 50;

  return (
    <div className="ratio-bar-container">
      <div className="ratio-labels">
        <span>WIN</span>
        <span>LOSS</span>
      </div>
      <div
        className="ratio-bar"
        data-percentage={winPercentage} /* used by CSS ::after */
      >
        <div
          className="ratio-segment win-segment"
          style={{ width: `${winPercentage}%` }}
        />
        <div className="ratio-segment loss-segment" />
      </div>
    </div>
  );
};



// --- TIME CONTROL POD ---
const TimeControlPod = ({ time, increment, type, onClick }) => (
  <div className="time-control-pod" onClick={onClick}>
    <div className="pod-main-time">{time}</div>
    <div className="pod-increment">+{increment}</div>
    <div className="pod-type">{type}</div>
  </div>
);

// --- BATTLE LOG ENTRY ---
const BattleLogEntry = ({ result, opponent, eloChange }) => (
  <div className={`log-entry result-${result.toLowerCase()}`}>
    <div className="log-details">
      <span className="log-result">{result}</span>
      <span className="log-opponent">vs. {opponent}</span>
    </div>
    <span className="log-elo-change">
      ({eloChange > 0 ? '+' : ''}{eloChange})
    </span>
  </div>
);

// --- MAIN DASHBOARD PAGE ---
const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  // Fetch game history dynamically
  useEffect(() => {
    const fetchGameHistory = async () => {
      const token = localStorage.getItem('token');
      if (token) axios.defaults.headers.common['x-auth-token'] = token;
      try {
        const res = await axios.get('http://localhost:5000/api/games/history');
        setGames(res.data);
      } catch (err) {
        console.error("Could not fetch game history", err);
      } finally {
        setLoadingGames(false);
      }
    };
    if (user) fetchGameHistory();
  }, [user]);

  // Socket: handle matchmaking events
  useEffect(() => {
    if (!socket) return;

    const handleGameStarted = (data) => {
      navigate(`/play?gameId=${data.gameId}`);
    };
    const handleWaiting = () => {
      alert("Searching for an opponent...");
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('waitingForOpponent', handleWaiting);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('waitingForOpponent', handleWaiting);
    };
  }, [socket, navigate]);

  const handleFindGame = (timeControl) => {
    if (socket) {
      socket.emit('findGame', { timeControl });
    }
  };

  if (!user) {
    return (
      <div className="loading-page">
        <h2>Loading...</h2>
      </div>
    );
  }

  // Calculate stats
  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  // Build the recent battle log format
  const recentGames = games.slice(0, 6).map((g) => {
    const opponent = g.players.find((p) => p._id !== user._id);
    const result =
      g.status === 'DRAW'
        ? 'STALEMATE'
        : g.winner && g.winner._id === user._id
        ? 'VICTORY'
        : 'DEFEAT';
    const eloChange = g.eloChange || 0;
    return {
      id: g._id,
      result,
      opponent: opponent ? opponent.username : 'Unknown',
      eloChange,
    };
  });

  return (
    <div className="page-container dashboard-cockpit">
      {/* --- MAIN DISPLAY AREA --- */}
      <div className="main-display">
        {/* LEFT PANEL */}
        <div className="hud-panel left-panel">
          <div className="player-username">{user.username}</div>
          <div className="player-elo">PWR LEVEL: {user.elo}</div>
          <h3 className="hud-header">COMBAT EFFICIENCY</h3>
          <WinLossRatioBar wins={user.wins} losses={user.losses} />
        </div>

        {/* CENTER PANEL */}
        <div className="game-selection-core">
          <h1 className="core-title">SELECT BATTLE PROTOCOL</h1>
          <div className="pods-container">
            <TimeControlPod time="3" increment="2" type="BLITZ" onClick={() => handleFindGame('3+2')} />
            <TimeControlPod time="5" increment="0" type="BLITZ" onClick={() => handleFindGame('5+0')} />
            <TimeControlPod time="10" increment="0" type="RAPID" onClick={() => handleFindGame('10+0')} />
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="hud-panel right-panel">
          <ul className="record-list">
            <li>
              <span className="record-label">VICTORIES</span>
              <strong className="record-value win">{user.wins}</strong>
            </li>
            <li>
              <span className="record-label">DEFEATS</span>
              <strong className="record-value loss">{user.losses}</strong>
            </li>
            <li>
              <span className="record-label">STALEMATES</span>
              <strong className="record-value draw">{user.draws}</strong>
            </li>
          </ul>
        </div>
      </div>

      {/* --- BATTLE LOG SECTION --- */}
      <div className="battle-log-feed">
        <h3 className="hud-header">// BATTLE LOG //</h3>
        <div className="log-entries-container">
          {loadingGames ? (
            <div>Loading...</div>
          ) : recentGames.length > 0 ? (
            recentGames.map((game) => <BattleLogEntry key={game.id} {...game} />)
          ) : (
            <p>No recent games yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
