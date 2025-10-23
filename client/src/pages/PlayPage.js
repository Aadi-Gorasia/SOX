// client/src/pages/PlayPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useSocket } from '../context/SocketContext';
import DisplayBoard from '../components/DisplayBoard';
import './PlayPage.css';

// --- Reusable Time Control Card (No changes) ---
const TimeControlCard = ({ time, increment, name, onClick }) => (
    <motion.div
        className="time-control-card"
        onClick={onClick}
        whileHover={{ scale: 1.05, y: -5 }}
        whileTap={{ scale: 0.98 }}
    >
        <div className="time-display">{time}|{increment}</div>
        <div className="time-name">{name}</div>
    </motion.div>
);

const timeControls = [
    { time: '3', increment: '2', name: 'Blitz' },
    { time: '5', increment: '0', name: 'Blitz' },
    { time: '10', increment: '0', name: 'Rapid' },
];

// --- Main Page Component (FIXED) ---
const PlayPage = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [lobbyState, setLobbyState] = useState({ type: 'idle' });

    useEffect(() => {
        if (!socket) return;

        const handleGameNavigation = ({ gameId }) => {
            if (gameId) {
                navigate(`/game/${gameId}`);
            }
        };

        // Listen for BOTH events that mean a game is ready to be joined
        socket.on('gameStarted', handleGameNavigation);
        socket.on('friendJoined', handleGameNavigation); // <-- BUG FIX: Listen for friend joining

        // Cleanup function to prevent memory leaks and duplicate listeners
        return () => {
            socket.off('gameStarted', handleGameNavigation);
            socket.off('friendJoined', handleGameNavigation);
        };
    }, [socket, navigate]);

    const handleFindGame = (timeControl) => {
        socket?.emit('findGame', { timeControl });
        setLobbyState({ type: 'waiting', timeControl });
    };

    const handleCreateFriendGame = (timeControl) => {
        socket?.emit('createFriendGame', { timeControl }, ({ gameId, error }) => {
            if (error) {
                alert(`Error: ${error}`);
                setLobbyState({ type: 'idle' });
            } else if (gameId) {
                setLobbyState({ type: 'friend-game', gameId, timeControl });
            }
        });
    };

    const handleCancel = () => {
        // We should also tell the server we are cancelling,
        // especially if we are waiting for a random game.
        // This requires a 'cancelFindGame' event on the server, which is good practice.
        // For now, we just reset the UI state.
        setLobbyState({ type: 'idle' });
    };

    const handleCopyLink = (gameId) => {
        const url = `${window.location.origin}/game/${gameId}`;
        navigator.clipboard.writeText(url).then(() => alert('Game link copied!'));
    };

    // No changes to the JSX rendering part
    const renderLobbyOrMenu = () => {
        if (lobbyState.type !== 'idle') {
            return (
                <div className="lobby-container">
                    <div className="insane-card game-lobby-view">
                        <div className="card-content">
                            {lobbyState.type === 'waiting' && (
                                <>
                                    <h2 className="lobby-title">Searching...</h2>
                                    <p className="lobby-subtitle">Mode: {lobbyState.timeControl}</p>
                                    <div className="spinner"></div>
                                    <button className="btn btn-danger" onClick={handleCancel}>Cancel</button>
                                </>
                            )}
                            {lobbyState.type === 'friend-game' && (
                                <>
                                    <h2 className="lobby-title">Game Created!</h2>
                                    <p className="lobby-subtitle">Share the link with a friend:</p>
                                    <div className="link-container">
                                        <input type="text" readOnly className="form-input" value={`${window.location.origin}/game/${lobbyState.gameId}`} />
                                        <button className="btn btn-primary" onClick={() => handleCopyLink(lobbyState.gameId)}>Copy</button>
                                    </div>
                                    <p className="lobby-subtitle" style={{marginTop: '1rem'}}>Waiting for friend to join...</p>
                                    <button className="btn btn-secondary" onClick={handleCancel}>Back</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <motion.div
                className="play-options-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <section className="insane-card play-panel">
                    <h2 className="card-header">Play Online</h2>
                    <div className="card-content">
                        <p className="panel-description">Challenge a random opponent.</p>
                        <div className="time-control-grid">
                            {timeControls.map(tc => <TimeControlCard key={`${tc.time}-${tc.increment}-online`} {...tc} onClick={() => handleFindGame(`${tc.time}+${tc.increment}`)} />)}
                        </div>
                    </div>
                </section>
                <section className="insane-card play-panel">
                    <h2 className="card-header">Play with a Friend</h2>
                    <div className="card-content">
                        <p className="panel-description">Create a private game link.</p>
                        <div className="time-control-grid">
                            {timeControls.map(tc => <TimeControlCard key={`${tc.time}-${tc.increment}-friend`} {...tc} onClick={() => handleCreateFriendGame(`${tc.time}+${tc.increment}`)} />)}
                        </div>
                    </div>
                </section>
            </motion.div>
        );
    };

    return (
        <div className="page-container play-page-container">
            <div className="play-page-grid">
                <div className="play-page-board-viewer">
                    <DisplayBoard />
                </div>
                {renderLobbyOrMenu()}
            </div>
        </div>
    );
};

export default PlayPage;