// client/src/pages/ProfilePage.js
import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './ProfilePage.css';

// --- UI State Components ---
const LoadingSpinner = ({ small = false }) => (
    <div className={`spinner ${small ? 'spinner-small' : ''}`}></div>
);

const ProfileLoader = () => (
    <div className="spinner-container" style={{ minHeight: '60vh' }}>
        <LoadingSpinner />
    </div>
);

const ErrorMessage = ({ message }) => (
    <div style={{ textAlign: 'center', minHeight: '60vh' }}>
        <h2>{message}</h2>
    </div>
);


// --- Reusable Sub-components ---
const StatCard = ({ label, children }) => (
    <div className="insane-card stat-card">
        <div className="card-content">
            <h3>{label}</h3>
            <div className="stat-value">{children}</div>
        </div>
    </div>
);

const GameHistoryItem = ({ game, profileUserId }) => {
    const opponent = game.players.find(p => p._id !== profileUserId);
    const getResult = () => {
        if (game.status === 'DRAW') return 'Draw';
        return game.winner?._id === profileUserId ? 'Win' : 'Loss';
    };
    
    const result = getResult();
    const resultClass = result.toLowerCase();

    return (
        <div className={`game-history-item ${resultClass}`}>
            <div className="game-details">
                <span className="game-opponent">vs {opponent ? opponent.username : 'Unknown'}</span>
                <span className="game-timecontrol">{game.timeControl || 'Standard'}</span>
            </div>
            <div className={`game-result`}>{result}</div>
        </div>
    );
};

// --- Main Page Component ---

// Helper to categorize time controls for filtering
const timeControlCategories = {
    '3+2': 'Blitz',
    '5+0': 'Blitz',
    '10+0': 'Rapid',
};

const ProfilePage = () => {
    const { username } = useParams();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('Overall'); // Tabs: Overall, Blitz, Rapid

    useEffect(() => {
        const fetchProfileData = async () => {
            setIsLoading(true);
            setError('');
            try {
                // IMPORTANT: Ensure your backend route is correct.
                const res = await axios.get(`/api/users/profile/${username}`);
                setProfileData(res.data);
            } catch (err) {
                setError(err.response?.data?.msg || 'Profile not found.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfileData();
    }, [username]);

    // Memoize the filtered games to avoid re-calculating on every render
    const filteredGames = useMemo(() => {
        if (!profileData?.games) return [];
        if (activeTab === 'Overall') return profileData.games;
        
        return profileData.games.filter(game => 
            timeControlCategories[game.timeControl] === activeTab
        );
    }, [profileData, activeTab]);

    // TODO: When your backend provides per-mode stats, this logic will need to be updated.
    // For now, we use the overall stats as a placeholder for all tabs.
    const displayStats = useMemo(() => {
        if (!profileData?.user) {
            return { wins: 0, losses: 0, draws: 0, elo: 0 };
        }
        
        // --- FUTURE IMPLEMENTATION ---
        // if (profileData.stats && profileData.stats[activeTab]) {
        //   return profileData.stats[activeTab];
        // }
        
        // Current placeholder logic:
        return profileData.user;

    }, [profileData, activeTab]);

    if (isLoading) return <div className="page-container"><ProfileLoader /></div>;
    if (error) return <div className="page-container"><ErrorMessage message={error} /></div>;
    if (!profileData) return <div className="page-container"><ErrorMessage message="User data could not be loaded." /></div>;

    const { user } = profileData;

    return (
        <div className="page-container profile-page">
            <header className="profile-header">
                <h1 className="profile-username">{user.username}</h1>
                <div className="profile-elo">
                    <span>{activeTab} ELO</span>
                    <p>{Math.round(displayStats.elo)}</p>
                </div>
            </header>

            <div className="profile-tabs">
                <button className={`tab-btn ${activeTab === 'Overall' ? 'active' : ''}`} onClick={() => setActiveTab('Overall')}>Overall</button>
                <button className={`tab-btn ${activeTab === 'Blitz' ? 'active' : ''}`} onClick={() => setActiveTab('Blitz')}>Blitz</button>
                <button className={`tab-btn ${activeTab === 'Rapid' ? 'active' : ''}`} onClick={() => setActiveTab('Rapid')}>Rapid</button>
            </div>

            <main className="profile-grid">
                <section className="stats-grid">
                    <StatCard label="Wins"><span className="win">{displayStats.wins}</span></StatCard>
                    <StatCard label="Losses"><span className="loss">{displayStats.losses}</span></StatCard>
                    <StatCard label="Draws"><span className="draw">{displayStats.draws}</span></StatCard>
                    <StatCard label="Total Games"><span>{displayStats.wins + displayStats.losses + displayStats.draws}</span></StatCard>
                </section>

                <section className="insane-card game-history-section">
                    <h2 className="card-header">{activeTab} Game History</h2>
                    <div className="card-content">
                        {filteredGames.length > 0 ? (
                            <div className="game-history-list">
                                {filteredGames.map(game => (
                                    <GameHistoryItem key={game._id} game={game} profileUserId={user._id} />
                                ))}
                            </div>
                        ) : (
                            <p>No games found for this category.</p>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default ProfilePage;