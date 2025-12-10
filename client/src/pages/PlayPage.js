// client/src/pages/PlayPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import './PlayPage.css';

// Component is unchanged
const TimeControlButton = ({ time, increment, name, onClick }) => (
    <button className="btn time-control-btn" onClick={onClick}>
        <span>{time}+{increment}</span>
        <span>{name}</span>
    </button>
);

const timeControls = [
    { time: '3', increment: '2', name: 'Blitz' },
    { time: '5', increment: '0', name: 'Blitz' },
    { time: '10', increment: '0', name: 'Rapid' },
];

const PlayPage = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [lobbyState, setLobbyState] = useState({ type: 'idle' });

    // --- LOGIC SECTION (UPDATED) ---
    useEffect(() => {
        if (!socket) return;
        const handleGameNavigation = ({ gameId }) => {
            if (gameId) navigate(`/game/${gameId}`);
        };
        socket.on('gameStarted', handleGameNavigation);
        socket.on('friendJoined', handleGameNavigation);
        return () => {
            socket.off('gameStarted', handleGameNavigation);
            socket.off('friendJoined', handleGameNavigation);
        };
    }, [socket, navigate]);

    // CHANGE: Added `preferredSymbol` parameter
    const handleFindGame = (timeControl, preferredSymbol) => {
        // Now we send the preference to the server
        socket?.emit('findGame', { timeControl, preferredSymbol });
        setLobbyState({ type: 'waiting', timeControl });
    };

    // CHANGE: Added `preferredSymbol` parameter
    const handleCreateFriendGame = (timeControl, preferredSymbol) => {
        // Also send the preference when creating a friend game
        socket?.emit('createFriendGame', { timeControl, preferredSymbol }, ({ gameId, error }) => {
            if (error) {
                alert(`Error: ${error}`);
                setLobbyState({ type: 'idle' });
            } else if (gameId) {
                setLobbyState({ type: 'friend-game', gameId, timeControl });
            }
        });
    };

    const handleCancel = () => {
        setLobbyState({ type: 'idle' });
    };

    const handleCopyLink = (gameId) => {
        const url = `${window.location.origin}/game/${gameId}`;
        navigator.clipboard.writeText(url).then(() => alert('Game link copied to clipboard!'));
    };
    // --- END OF LOGIC SECTION ---

    // Lobby JSX is unchanged
    if (lobbyState.type !== 'idle') {
        // ... (lobby rendering logic is the same)
        return (
            <div className="lobby-overlay">
                <div className="insane-card lobby-content">
                     {lobbyState.type === 'waiting' && (
                        <>
                            <h2>SEARCHING...</h2>
                            <p>MODE: {lobbyState.timeControl}</p>
                            <div className="spinner" />
                            <button className="btn btn-secondary" onClick={handleCancel}>CANCEL</button>
                        </>
                    )}
                    {lobbyState.type === 'friend-game' && (
                        <>
                            <h2>PRIVATE LOBBY</h2>
                            <p>SHARE THE LINK WITH A FRIEND</p>
                            <div className="link-container">
                                <input readOnly value={`${window.location.origin}/game/${lobbyState.gameId}`} />
                                <button className="btn btn-primary" onClick={() => handleCopyLink(lobbyState.gameId)}>COPY</button>
                            </div>
                            <p className='waiting-text'>WAITING FOR FRIEND...</p>
                            <button className="btn btn-secondary" onClick={handleCancel}>BACK</button>
                        </>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="page-container play-page">
            <div className="select-screen-wrapper">
                {/* --- PLAYER X PANEL --- */}
                <div className="player-panel player-x">
                    <h1 className="player-mark">X</h1>
                    <div className="modes-container">
                        <div className="mode-select">
                            <h2>PLAY ONLINE</h2>
                            <div className="time-controls">
                                {/* CHANGE: Pass 'X' as the preferred symbol */}
                                {timeControls.map(tc => <TimeControlButton key={`x-online-${tc.time}`} {...tc} onClick={() => handleFindGame(`${tc.time}+${tc.increment}`, 'X')} />)}
                            </div>
                        </div>
                        <div className="mode-select">
                            <h2>PRIVATE MATCH</h2>
                             <div className="time-controls">
                                {/* CHANGE: Pass 'X' as the preferred symbol */}
                                {timeControls.map(tc => <TimeControlButton key={`x-friend-${tc.time}`} {...tc} onClick={() => handleCreateFriendGame(`${tc.time}+${tc.increment}`, 'X')} />)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- VS. DIVIDER --- */}
                <div className="vs-divider">
                    <h2 className="vs-text">VS</h2>
                </div>

                {/* --- PLAYER O PANEL --- */}
                <div className="player-panel player-o">
                    <h1 className="player-mark">O</h1>
                    <div className="modes-container">
                         <div className="mode-select">
                            <h2>PLAY ONLINE</h2>
                            <div className="time-controls">
                                {/* CHANGE: Pass 'O' as the preferred symbol */}
                                {timeControls.map(tc => <TimeControlButton key={`o-online-${tc.time}`} {...tc} onClick={() => handleFindGame(`${tc.time}+${tc.increment}`, 'O')} />)}
                            </div>
                        </div>
                        <div className="mode-select">
                            <h2>PRIVATE MATCH</h2>
                             <div className="time-controls">
                                {/* CHANGE: Pass 'O' as the preferred symbol */}
                                {timeControls.map(tc => <TimeControlButton key={`o-friend-${tc.time}`} {...tc} onClick={() => handleCreateFriendGame(`${tc.time}+${tc.increment}`, 'O')} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlayPage;