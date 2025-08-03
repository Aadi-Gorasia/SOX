// client/src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './DashboardPage.css';

const GameHistoryItem = ({ game, profileUser }) => {
  const opponent = game.players.find(p => p._id !== profileUser._id);
  const result = game.status === 'DRAW' ? 'Draw' : (game.winner && game.winner._id === profileUser._id ? 'Win' : 'Loss');
  const resultClass = result.toLowerCase();
  return (
    <div className="game-history-item">
      <div className={`result-indicator ${resultClass}`}></div>
      <div className="game-details">
        <span className="game-opponent">vs {opponent ? opponent.username : '...'}</span>
        <span className="game-timecontrol">{game.timeControl}</span>
      </div>
      <div className={`game-result ${resultClass}`}>{result}</div>
    </div>
  );
};

const ProfilePage = () => {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true); setError('');
      try {
        const res = await axios.get(`http://localhost:5000/api/users/profile/${username}`);
        setProfileData(res.data);
      } catch (err) { setError(err.response ? err.response.data.msg : 'Connection Error'); }
      finally { setLoading(false); }
    };
    fetchProfile();
  }, [username]);
  if (loading) return <main className="dashboard-main"><h2>Loading Profile...</h2></main>;
  if (error) return <main className="dashboard-main"><h2>{error}</h2></main>;
  if (!profileData) return <main className="dashboard-main"><h2>User not found.</h2></main>;
  const { user, games } = profileData;
  return (
    <main className="dashboard-main">
      <h1>{user.username}'s Profile</h1>
      <div className="stats-grid">
        <div className="stat-card"><h3>ELO Rating</h3><p className="stat-value">{user.elo}</p></div>
        <div className="stat-card"><h3>Wins</h3><p className="stat-value green">{user.wins}</p></div>
        <div className="stat-card"><h3>Losses</h3><p className="stat-value red">{user.losses}</p></div>
        <div className="stat-card"><h3>Draws</h3><p className="stat-value">{user.draws}</p></div>
      </div>
      <div className="recent-games">
        <h2>Game History</h2>
        {games.length > 0 ? (
          <div className="game-history-list">{games.map(game => (<GameHistoryItem key={game._id} game={game} profileUser={user} />))}</div>
        ) : (<p>This player has no games.</p>)}
      </div>
    </main>
  );
};
export default ProfilePage;