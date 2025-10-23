// client/src/pages/DashboardPage.js
import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import './DashboardPage.css';

// A reusable card component for the time controls
const TimeControlCard = ({ time, type, onClick }) => (
    <div className="time-control-card" onClick={onClick}>
        <span>{time}</span>
        <span className="type">{type}</span>
    </div>
);

const DashboardPage = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    // Placeholder stats - you would fetch this from your backend
    const stats = {
        wins: 49,
        losses: 55,
        draws: 0,
    };
    const totalGames = stats.wins + stats.losses + stats.draws;
    const winRate = totalGames > 0 ? Math.round((stats.wins / totalGames) * 100) : 0;
    
    // Handler for starting a new game
    const handleFindGame = (timeControl) => {
        // Navigate to the play page, which handles the matchmaking logic
        navigate('/play', { state: { preselectedTimeControl: timeControl } });
    };


    if (!user) {
        return <div className="spinner"></div>; // Show spinner while user data loads
    }

    return (
        <div className="dashboard-container">
            {/* --- Welcome Header --- */}
            <div className="welcome-header">
                <h1>
                    Welcome, <span className="gradient-text">{user.username}</span>
                </h1>
                <p>Current Rating: {user.elo}</p>
            </div>

            {/* --- Dashboard Grid --- */}
            <div className="dashboard-grid">
                {/* New Game Card */}
                <div className="insane-card new-game-card">
                    <h2 className="card-header">New Game</h2>
                    <div className="card-content">
                        <p>Choose your tempo to find a match.</p>
                        <div className="time-controls">
                            <TimeControlCard time="3+2" type="Blitz" onClick={() => handleFindGame('3+2')} />
                            <TimeControlCard time="5+0" type="Blitz" onClick={() => handleFindGame('5+0')} />
                            <TimeControlCard time="10+0" type="Rapid" onClick={() => handleFindGame('10+0')} />
                        </div>
                    </div>
                </div>

                {/* Career Stats Card */}
                <div className="insane-card stats-card">
                    <h2 className="card-header">Career Stats</h2>
                    <div className="card-content stats-content">
                        <div className="win-rate-chart">
                            <CircularProgressbar
                                value={winRate}
                                text={`${winRate}%`}
                                strokeWidth={10}
                                styles={buildStyles({
                                    textColor: 'var(--text-primary)',
                                    pathColor: 'var(--color-win)',
                                    trailColor: 'var(--panel-border)',
                                    textSize: '24px',
                                })}
                            />
                            <span>WIN RATE</span>
                        </div>
                        <ul className="stats-list">
                            <li><span className="dot win"></span> Wins: <strong>{stats.wins}</strong></li>
                            <li><span className="dot loss"></span> Losses: <strong>{stats.losses}</strong></li>
                            <li><span className="dot draw"></span> Draws: <strong>{stats.draws}</strong></li>
                        </ul>
                    </div>
                </div>

                {/* Recent Games Card (Structure Only) */}
                <div className="insane-card recent-games-card">
                    <h2 className="card-header">Recent Games</h2>
                    <div className="card-content">
                        {/* You would map over recent games data here */}
                        <p>No recent games to show.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;