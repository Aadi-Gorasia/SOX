// client/src/pages/DashboardPage.js
import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './DashboardPage.css';

const THEMES = [
  'arcade', 'glass', 'wood', 'terminal', 'paper', 
  'ocean', 'sunset', 'midnight', 'forest', 'candy',
  'cyberpunk', 'blueprint', 'royal', 'concrete', 'vaporwave'
];

const WinLossBar = ({ wins, losses }) => {
  const total = wins + losses;
  const winPct = total > 0 ? (wins / total) * 100 : 50;
  return (
    <div className="theme-ratio-box">
      <div className="ratio-header">
        <span className="tx-win">W: {wins}</span>
        <span className="tx-loss">L: {losses}</span>
      </div>
      <div className="theme-progress-track">
        <div className="theme-progress-fill" style={{ width: `${winPct}%` }}></div>
      </div>
    </div>
  );
};

const TimeControlPod = ({ time, increment, type, onClick }) => (
  <button className="theme-pod" onClick={onClick}>
    <div className="pod-inner">
      <div className="pod-type">{type}</div>
      <div className="pod-time">{time}<small>+{increment}</small></div>
      <div className="pod-btn">PLAY</div>
    </div>
  </button>
);

const BattleLogEntry = ({ result, opponent, eloChange }) => (
  <div className={`log-row ${result.toLowerCase()}`}>
    <div className="log-left">
      <span className="log-res">{result[0]}</span>
      <span className="log-vs">vs {opponent}</span>
    </div>
    <span className="log-elo">{eloChange > 0 ? '+' : ''}{eloChange}</span>
  </div>
);

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [games, setGames] = useState([]);
  const [currentTheme, setCurrentTheme] = useState(localStorage.getItem('sox-theme') || 'arcade');

  useEffect(() => {
    localStorage.setItem('sox-theme', currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    const fetchGameHistory = async () => {
      const token = localStorage.getItem('token');
      if (token) axios.defaults.headers.common['x-auth-token'] = token;
      try {
        const res = await axios.get('http://localhost:5000/api/games/history');
        setGames(res.data);
      } catch (err) { console.error(err); }
    };
    if (user) fetchGameHistory();
  }, [user]);

  const handleFindGame = (tc) => {
    if (socket) socket.emit('findGame', { timeControl: tc });
  };

  if (!user) return <div className="loading-screen">LOADING ASSETS...</div>;

  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  const recentGames = games.slice(0, 8).map((g) => {
    const opponent = g.players.find((p) => p._id !== user._id);
    const result = g.status === 'DRAW'
      ? 'DRAW'
      : g.winner && g.winner._id === user._id
      ? 'WIN'
      : 'LOSS';

    return {
      id: g._id,
      result,
      opponent: opponent ? opponent.username : 'Unknown',
      eloChange: g.eloChange || 0
    };
  });

  return (
    <div className="theme-wrapper" data-theme={currentTheme}>
      <div className="theme-bg-layer"></div>

      <div className="theme-switcher">
        <span>SKIN:</span>
        <div className="theme-scroll">
          {THEMES.map(t => (
            <button 
              key={t} 
              className={`theme-btn ${currentTheme === t ? 'active' : ''}`}
              onClick={() => setCurrentTheme(t)}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-layout">
        <header className="dash-header">
          <div className="user-block">
            <div className="user-avatar">{user.username[0].toUpperCase()}</div>
            <div className="user-details">
              <h1>{user.username}</h1>
              <div className="user-badges">
                LVL {Math.floor(user.elo/100)} • {user.elo} ELO
              </div>
            </div>
          </div>

          <div className="header-stats">
            <div className="h-stat">
              <label>WR</label>
              <strong>{winRate}%</strong>
            </div>
            <div className="h-stat">
              <label>MATCHES</label>
              <strong>{totalGames}</strong>
            </div>
          </div>
        </header>

        <div className="dash-grid">
          <section className="dash-panel stats-panel">
            <h3 className="panel-title">STATISTICS</h3>
            <WinLossBar wins={user.wins} losses={user.losses} />
            <div className="stat-rows">
              <div className="s-row"><span>Wins</span><b className="tx-win">{user.wins}</b></div>
              <div className="s-row"><span>Losses</span><b className="tx-loss">{user.losses}</b></div>
              <div className="s-row"><span>Draws</span><b className="tx-draw">{user.draws}</b></div>
            </div>
          </section>

          <section className="dash-panel play-panel">
            <h2 className="play-title">READY TO PLAY?</h2>
            <div className="pods-container">
              <TimeControlPod time="3" increment="2" type="BLITZ" onClick={() => handleFindGame('3+2')} />
              <TimeControlPod time="5" increment="0" type="BLITZ" onClick={() => handleFindGame('5+0')} />
              <TimeControlPod time="10" increment="0" type="RAPID" onClick={() => handleFindGame('10+0')} />
            </div>
          </section>

          <section className="dash-panel log-panel">
            <div className="panel-header-row">
              <h3 className="panel-title">HISTORY</h3>
              <div className="live-dot">LIVE</div>
            </div>
            <div className="log-list">
              {recentGames.length > 0
                ? recentGames.map(g => <BattleLogEntry key={g.id} {...g} />)
                : <div className="empty-log">No Data</div>
              }
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
