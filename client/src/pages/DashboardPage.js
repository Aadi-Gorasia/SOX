import React, { useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const [games, setGames] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/games/history');
        setGames(res.data);
      } catch (err) { console.error(err); }
    };
    if (user) fetchHistory();
  }, [user]);

  const handleFindGame = (tc) => {
    if (socket) socket.emit('findGame', { timeControl: tc });
  };

  if (!user) return <div className="brutal-loader">LOADING_SYSTEM...</div>;

  return (
    <div className="brutal-dash">
      <div className="dash-grid-wrapper">
        
        {/* LEFT COLUMN: THE ARENA */}
        <section className="arena-section">
          <div className="brutal-card hero-card">
            <div className="hero-text">
              <h1>SUPER<br/>TIC-TAC-TOE</h1>
              <p>NESTED GRID COMBAT // SELECT FREQUENCY</p>
            </div>
            <div className="hero-actions">
              <button className="brutal-btn mega" onClick={() => handleFindGame('10+0')}>
                QUICK MATCH
              </button>
            </div>
          </div>

          <div className="tc-grid">
            {['1+0', '3+2', '5+0', '10+0', '30+0'].map((tc) => (
              <button key={tc} className="tc-brutal-btn" onClick={() => handleFindGame(tc)}>
                <span className="tc-val">{tc.split('+')[0]}</span>
                <span className="tc-label">{tc.includes('+') ? `+${tc.split('+')[1]}` : 'MIN'}</span>
              </button>
            ))}
          </div>

          <div className="brutal-card history-card">
            <h2 className="card-label">BATTLE_LOG</h2>
            <div className="history-list">
              {games.length > 0 ? games.slice(0, 6).map((g) => {
                const isWin = g.winner?._id === user._id;
                return (
                  <div key={g._id} className={`history-row ${isWin ? 'win' : 'loss'}`}>
                    <span className="res-tag">{isWin ? 'VICTORY' : 'DEFEAT'}</span>
                    <span className="opp-name">VS_{g.players.find(p => p._id !== user._id)?.username || 'UNKNOWN'}</span>
                    <span className="elo-tag">{g.eloChange > 0 ? `+${g.eloChange}` : g.eloChange}</span>
                  </div>
                );
              }) : <div className="empty-state">NO RECENT DATA FOUND</div>}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: DATA & SOCIAL */}
        <aside className="data-sidebar">
          <div className="brutal-card user-card">
            <div className="user-profile">
              <div className="brutal-avatar">{user.username.substring(0,2).toUpperCase()}</div>
              <div className="user-meta">
                <h2>{user.username}</h2>
                <div className="rating-pill">{user.elo} ELO</div>
              </div>
            </div>
            <div className="stat-grid-brutal">
              <div className="s-box">
                <label>WINS</label>
                <strong>{user.wins}</strong>
              </div>
              <div className="s-box">
                <label>LOSSES</label>
                <strong>{user.losses}</strong>
              </div>
            </div>
          </div>

          <div className="brutal-card friends-card">
            <h2 className="card-label">COMM_LINK</h2>
            <div className="friends-placeholder">
              <p>OFFLINE_STATUS: 0 FRIENDS</p>
              <button className="brutal-btn small">INVITE_FRIEND</button>
            </div>
          </div>

          <div className="brutal-card premium-card">
            <h3>UNLIMITED_POWER</h3>
            <p>GET THE SOX PREMIUM PASS</p>
            <button className="brutal-btn gold">UPGRADE_NOW</button>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default DashboardPage;