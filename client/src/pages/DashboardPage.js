// client/src/pages/DashboardPage.js
import React, { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import './DashboardPage.css';

const GameHistoryItem = ({ game, currentUser }) => {
  const opponent = game.players.find(p => p._id !== currentUser._id);
  const result = game.status === 'DRAW' ? 'Draw' : (game.winner && game.winner._id === currentUser._id ? 'Win' : 'Loss');
  const resultClass = result.toLowerCase();
  return (
    <div className="game-history-item">
      <div className={`result-indicator ${resultClass}`}></div>
      <div className="game-details">
        <span className="game-opponent">vs {opponent ? opponent.username : 'Unknown'}</span>
        <span className="game-timecontrol">{game.timeControl}</span>
      </div>
      <div className={`game-result ${resultClass}`}>{result}</div>
    </div>
  );
};

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const navigate = useNavigate();
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    const fetchGameHistory = async () => {
      const token = localStorage.getItem('token');
      if (token) { axios.defaults.headers.common['x-auth-token'] = token; }
      try { const res = await axios.get('http://localhost:5000/api/games/history'); setGames(res.data); }
      catch (err) { console.error("Could not fetch game history", err); }
      finally { setLoadingGames(false); }
    };
    if (user) { fetchGameHistory(); }
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleGameStarted = (data) => { navigate(`/play?gameId=${data.gameId}`); };
    const handleWaiting = () => { alert("Searching for an opponent..."); };
    socket.on('gameStarted', handleGameStarted);
    socket.on('waitingForOpponent', handleWaiting);
    return () => { socket.off('gameStarted', handleGameStarted); socket.off('waitingForOpponent', handleWaiting); };
  }, [socket, navigate]);

  const handleFindGame = (timeControl) => { if (socket) { socket.emit('findGame', { timeControl }); } };

  if (!user) { return <div className="loading-page"><h2>Loading...</h2></div>; }
  
  const totalGames = user.wins + user.losses + user.draws;
  const winRate = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;

  return (
    <div className="page-container dashboard-page">
      <div className="animated-bg"></div>
      <div className="dashboard-header">
        <h1>Welcome back, {user.username}.</h1>
        <p>Your current rating is <strong>{user.elo}</strong> with a <strong>{winRate}%</strong> win rate.</p>
      </div>

      <div className="dashboard-grid-insane">
        <div className="dashboard-card-insane play-card-insane">
          <h2>New Game</h2>
          <div className="time-controls-insane">
            <button onClick={() => handleFindGame('3+2')}><span>3</span>+2</button>
            <button onClick={() => handleFindGame('5+0')}><span>5</span>+0</button>
            <button onClick={() => handleFindGame('10+0')}><span>10</span>+0</button>
          </div>
        </div>
        <div className="dashboard-card-insane stats-card">
            <h2>Career Stats</h2>
            <div className="stats-content">
                <div className="stats-chart">
                    <div 
                        className="donut-chart"
                        style={{ background: `conic-gradient(
                            #A5D6A7 0% ${winRate}%, 
                            #EF9A9A ${winRate}% 100%
                        )`}}
                    >
                      <div className="donut-chart-inner">{winRate}%</div>
                    </div>
                </div>
                <div className="stats-legend">
                    <p><span className="legend-dot green"></span>Wins: <strong>{user.wins}</strong></p>
                    <p><span className="legend-dot red"></span>Losses: <strong>{user.losses}</strong></p>
                    <p><span className="legend-dot grey"></span>Draws: <strong>{user.draws}</strong></p>
                </div>
            </div>
        </div>
        <div className="dashboard-card-insane history-card-insane">
          <h2>Recent Games</h2>
          {loadingGames ? <p>Loading...</p> : games.length > 0 ? (
            <div className="game-history-list">{games.map(game => (<GameHistoryItem key={game._id} game={game} currentUser={user} />))}</div>
          ) : (<p>Play your first game!</p>)}
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;