import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import InteractiveBG from '../components/InteractiveBG';
import './DashboardPage.css'; // Inherit global dashboard wrap classes
import './PlayPage.css';

const PlayPage = () => {
    const socket = useSocket();
    const navigate = useNavigate();
    const [latency, setLatency] = useState(0);
    
    // UI CORE STATE
    const [lobbyState, setLobbyState] = useState('IDLE'); // IDLE, QUEUING, PRIVATE
    const [config, setConfig] = useState({
        time: 10,
        inc: 0,
        symbol: 'X',
        protocol: 'CLASSIC' // CLASSIC, HARDCORE (Future proofing)
    });
    
    const [searchTimer, setSearchTimer] = useState(0);
    const [gameId, setGameId] = useState(null);

    const presets =[
        { tc: '1+0', m: 1, s: 0, label: 'BULLET' },
        { tc: '3+0', m: 3, s: 0, label: 'BLITZ' },
        { tc: '3+2', m: 3, s: 2, label: 'BLITZ' },
        { tc: '5+0', m: 5, s: 0, label: 'RAPID' },
        { tc: '10+0', m: 10, s: 0, label: 'RAPID' },
        { tc: '30+0', m: 30, s: 0, label: 'ZENITH' },
    ];

    useEffect(() => {
      if (!socket) return;
      const measure = () => {
        const start = Date.now();
        socket.emit('ping_latency');
        socket.once('pong_latency', () => setLatency(Date.now() - start));
      };
      const interval = setInterval(measure, 5000);
      measure();
      return () => clearInterval(interval);
    },[socket]);

    // SOCKET SYNC
    useEffect(() => {
        if (!socket) return;
        const onStart = ({ gameId }) => navigate(`/game/${gameId}`);
        socket.on('gameStarted', onStart);
        socket.on('friendJoined', onStart);
        return () => {
            socket.off('gameStarted', onStart);
            socket.off('friendJoined', onStart);
            socket.emit('cancelFindGame');
        };
    },[socket, navigate]);

    // TIMER LOGIC
    useEffect(() => {
        let interval;
        if (lobbyState === 'QUEUING') {
            interval = setInterval(() => setSearchTimer(t => t + 1), 1000);
        } else {
            setSearchTimer(0);
        }
        return () => clearInterval(interval);
    }, [lobbyState]);

    // ACTIONS
    const triggerMatchmaking = useCallback(() => {
        if (!socket) return;
        const tc = `${config.time}+${config.inc}`;
        socket.emit('findGame', { timeControl: tc, preferredSymbol: config.symbol });
        setLobbyState('QUEUING');
    }, [socket, config]);

    const cancelMatchmaking = () => {
        socket?.emit('cancelFindGame');
        setLobbyState('IDLE');
    };

    const triggerPrivate = useCallback(() => {
        if (!socket) return;
        const tc = `${config.time}+${config.inc}`;
        socket.emit('createFriendGame', { timeControl: tc, preferredSymbol: config.symbol }, ({ gameId, error }) => {
            if (error) return console.error(error);
            setGameId(gameId);
            setLobbyState('PRIVATE');
        });
    }, [socket, config]);

    const latencyClass = latency === 0 ? '' : latency > 100 ? 'latency-high' : 'latency-ok';

    return (
        <div className="dash-root">
            <InteractiveBG />
            
            {/* OVERLAY MODALS */}
            {lobbyState !== 'IDLE' && (
                <div className="search-overlay">
                    <div className="search-modal">
                        <div className="search-grid-bg">
                            {Array.from({ length: 9 }).map((_, i) => (
                                <div key={i} className={`search-cell ${i === 4 ? 'search-cell--center' : ''}`} />
                            ))}
                        </div>

                        {lobbyState === 'QUEUING' ? (
                            <>
                                <p className="search-label">Connecting to Global Arena</p>
                                <h2 className="search-tc">{config.time}+{config.inc}</h2>
                                <div className="search-pulse" />
                                <div className="search-label" style={{ textTransform: 'none', color: 'var(--text-1)' }}>
                                    Elapsed: {searchTimer}s
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="search-label">Secure Channel Established</p>
                                <h2 className="search-tc" style={{ fontSize: '32px', marginBottom: '10px' }}>Awaiting Opponent</h2>
                                <p className="search-label" style={{ textTransform: 'none' }}>Share this link to invite your opponent.</p>
                                
                                <div className="link-box">
                                    <input readOnly value={`${window.location.origin}/game/${gameId}`} />
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/game/${gameId}`);
                                    }}>Copy</button>
                                </div>
                                <div className="search-pulse" style={{ marginTop: '10px' }} />
                            </>
                        )}

                        <button className="search-abort" onClick={cancelMatchmaking}>Cancel Search</button>
                    </div>
                </div>
            )}

            <div className="dash-wrap">
                
                {/* Header Match with Dashboard */}
                <header className="dash-header">
                  <Link to="/dashboard" style={{ textDecoration: 'none' }}>
                    <div className="header-logo">
                        
                        <span className="logo-text">SOX</span>
                    </div>
                  </Link>
                  <div className="header-right">
                    <div className={`latency-badge ${latencyClass}`}>
                        <span className="latency-dot" />
                        {latency === 0 ? '—' : `${latency}ms`}
                    </div>
                  </div>
                </header>

                <div className="play-body">
                    
                    {/* LEFT: MATCH SETTINGS */}
                    <aside className="config-section">
                        <div className="config-label">Match Settings</div>
                        
                        {/* SYMBOL SELECT */}
                        <div className="symbol-grid">
                            <button 
                                className={`symbol-btn ${config.symbol === 'X' ? 'active-x' : ''}`}
                                onClick={() => setConfig({...config, symbol: 'X'})}
                            >
                                <span className="symbol-char">X</span>
                                <span className="symbol-name">Playing as X</span>
                            </button>
                            <button 
                                className={`symbol-btn ${config.symbol === 'O' ? 'active-o' : ''}`}
                                onClick={() => setConfig({...config, symbol: 'O'})}
                            >
                                <span className="symbol-char">O</span>
                                <span className="symbol-name">Playing as O</span>
                            </button>
                        </div>
                        
                        <div className="config-label">Time Control</div>
                        
                        {/* PRESETS */}
                        <div className="preset-grid">
                            {presets.map(p => (
                                <button 
                                    key={p.tc} 
                                    className={`preset-btn ${config.time === p.m && config.inc === p.s ? 'active-node' : ''}`}
                                    onClick={() => setConfig({...config, time: p.m, inc: p.s})}
                                >
                                    <span className="preset-tc">{p.tc}</span>
                                    <span className="preset-lbl">{p.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* SLIDERS */}
                        <div className="slider-group" style={{ marginTop: '2rem' }}>
                            <div className="slider-header">
                                <span>Minutes per side</span>
                                <span className="slider-val">{config.time}m</span>
                            </div>
                            <input 
                                type="range" min="1" max="60" value={config.time} 
                                onChange={(e) => setConfig({...config, time: parseInt(e.target.value)})}
                                className="play-slider"
                            />
                        </div>
                        
                        <div className="slider-group">
                            <div className="slider-header">
                                <span>Increment in seconds</span>
                                <span className="slider-val">{config.inc}s</span>
                            </div>
                            <input 
                                type="range" min="0" max="30" value={config.inc} 
                                onChange={(e) => setConfig({...config, inc: parseInt(e.target.value)})}
                                className="play-slider"
                            />
                        </div>
                    </aside>

                    {/* RIGHT: DEPLOYMENT SECTORS */}
                    <main className="deploy-section">
                        
                        <div className="deploy-grid">
                            {/* GLOBAL ARENA */}
                            <div className="deploy-card deploy-card--global">
                                <div className="deploy-bg-text">PLAY</div>
                                <div className="deploy-content">
                                    <h3 className="deploy-title">Ranked Match</h3>
                                    <p className="deploy-desc">Find an opponent in the global matchmaking pool. Your rating will be affected.</p>
                                    <button className="btn-deploy btn-deploy--primary" onClick={triggerMatchmaking}>
                                        Play Ranked
                                    </button>
                                </div>
                            </div>

                            {/* PRIVATE SIM */}
                            <div className="deploy-card">
                                <div className="deploy-bg-text">PVP</div>
                                <div className="deploy-content">
                                    <h3 className="deploy-title">Play a Friend</h3>
                                    <p className="deploy-desc">Generate a secure link to play an unranked match against someone you know.</p>
                                    <button className="btn-deploy btn-deploy--secondary" onClick={triggerPrivate}>
                                        Create Invite Link
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* SYSTEM LOGS */}
                       {/* In PlayPage.js Deploy Grid */}
<div className="deploy-card">
    <div className="deploy-bg-text">TRN</div>
    <div className="deploy-content">
        <h3 className="deploy-title">Tournament</h3>
        <p className="deploy-desc">Enter a 4-player Sit & Go bracket. Winner takes all ELO stakes.</p>
        <button className="btn-deploy btn-deploy--secondary" onClick={() => navigate('/tournament')}>
            Enter Lobby
        </button>
    </div>
</div>

                    </main>
                </div>
            </div>
        </div>
    );
};

export default PlayPage;