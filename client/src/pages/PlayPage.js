import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import InteractiveBG from '../components/InteractiveBG';
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


    const presets = [
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
      }, [socket]);

    // SOCKET SYNC
    useEffect(() => {
        if (!socket) return;
        const onStart = ({ gameId }) => navigate(`/game/${gameId}`);
        socket.on('gameStarted', onStart);
        socket.on('friendJoined', onStart);
        return () => {
            socket.off('gameStarted');
            socket.off('friendJoined');
        };
    }, [socket, navigate]);

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

    const triggerPrivate = useCallback(() => {
        if (!socket) return;
        const tc = `${config.time}+${config.inc}`;
        socket.emit('createFriendGame', { timeControl: tc, preferredSymbol: config.symbol }, ({ gameId, error }) => {
            if (error) return console.error(error);
            setGameId(gameId);
            setLobbyState('PRIVATE');
        });
    }, [socket, config]);

    return (
        <div className="pp-console">
            <InteractiveBG />
            
            {/* TERMINAL OVERLAY */}
            {lobbyState !== 'IDLE' && (
                <div className="pp-terminal-overlay">
                    <div className="pp-terminal-frame">
                        <div className="corner-tl"></div><div className="corner-tr"></div>
                        <div className="corner-bl"></div><div className="corner-br"></div>
                        
                        <div className="terminal-header hp-mono text-sulfur">
                            {lobbyState === 'QUEUING' ? '>> UPLINKING_TO_GLOBAL_NETWORK' : '>> SECURE_CHANNEL_ESTABLISHED'}
                        </div>

                        {lobbyState === 'QUEUING' ? (
                            <div className="terminal-body">
                                <h2 className="Archivo text-6xl mb-4">SEARCHING</h2>
                                <div className="scanning-line"></div>
                                <div className="hp-mono text-titanium mt-8">
                                    ESTABLISHED_NODE: {config.time}+{config.inc} —— T-PLUS: {searchTimer}s
                                </div>
                            </div>
                        ) : (
                            <div className="terminal-body">
                                <h2 className="Archivo text-3xl mb-8">HANDSHAKE_REQUIRED</h2>
                                <div className="link-generator">
                                    <input readOnly value={`${window.location.origin}/game/${gameId}`} className="hp-mono" />
                                    <button onClick={() => {
                                        navigator.clipboard.writeText(`${window.location.origin}/game/${gameId}`);
                                    }} className="Archivo">COPY_ID</button>
                                </div>
                                <div className="hp-mono text-titanium animate-pulse">AWAITING_OPPONENT_SYNC...</div>
                            </div>
                        )}
                        <button className="pp-abort Archivo" onClick={() => setLobbyState('IDLE')}>TERMINATE_PROCESS</button>
                    </div>
                </div>
            )}

            <div className="pp-hud">
                {/* TOP HUD */}
                <header className="pp-top-hud">
                    <div className="hud-branding">
                        <span className="hp-mono text-sulfur">PROTOCOL_STATION</span>
                        <h1 className="Archivo text-5xl">ENGAGEMENT<span className="text-sulfur">_01</span></h1>
                    </div>
                    <div className="hud-stats hp-mono text-titanium">
                        <div className="stat-unit"><span>LATENCY:</span> <span className="text-sulfur">{latency}MS</span></div>
                        <div className="stat-unit"><span>BUFFER:</span> <span className="text-sulfur">99.8%</span></div>
                    </div>
                </header>

                <div className="pp-main-layout">
                    {/* LEFT: NEURAL CONFIG */}
                    <section className="pp-config-panel">
                        <div className="panel-label hp-mono text-titanium">NEURAL_CONFIGURATION</div>
                        
                        {/* SYMBOL SELECT */}
                        <div className="config-block">
                            <label className="hp-mono text-titanium mb-4 block">IDENTIFIER_ASSIGNMENT</label>
                            <div className="symbol-grid">
                                <button 
                                    className={`sym-card ${config.symbol === 'X' ? 'active-x' : ''}`}
                                    onClick={() => setConfig({...config, symbol: 'X'})}
                                >
                                    <span className="Archivo">X</span>
                                    <span className="hp-mono text-xs">COBALT_UNIT</span>
                                </button>
                                <button 
                                    className={`sym-card ${config.symbol === 'O' ? 'active-o' : ''}`}
                                    onClick={() => setConfig({...config, symbol: 'O'})}
                                >
                                    <span className="Archivo">O</span>
                                    <span className="hp-mono text-xs">CRIMSON_UNIT</span>
                                </button>
                            </div>
                        </div>
                        <br />
                        <br />
                        <div className="config-block mt-8">
                            <label className="hp-mono text-titanium mb-4 block">PRESET_FREQUENCIES</label>
                            <br />
                            <br />
                            <div className="preset-grid">
                                {presets.map(p => (
                                    <button 
                                        key={p.tc} 
                                        className={`preset-node ${config.time === p.m && config.inc === p.s ? 'active-node' : ''}`}
                                        onClick={() => setConfig({...config, time: p.m, inc: p.s})}
                                    >
                                        <span className="Archivo">{p.tc}</span>
                                        <span className="hp-mono text-xs">{p.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <br />
                        <br />
                        {/* TIME CUSTOMIZER */}
                        <div className="config-block mt-12">
                            <label className="hp-mono text-titanium mb-4 block">TEMPORAL_PARAMETERS</label>
                            <br />
                            <br />
                            <div className="slider-group">
                                <div className="slider-header hp-mono text-titanium">
                                    <span>BASE_TIME</span>
                                    <span className="text-sulfur">{config.time}m</span>
                                </div>
                                <input 
                                    type="range" min="1" max="60" value={config.time} 
                                    onChange={(e) => setConfig({...config, time: e.target.value})}
                                    className="neural-slider"
                                />
                            </div>
                            <div className="slider-group mt-8">
                                <div className="slider-header hp-mono text-titanium">
                                    <span>INCREMENT</span>
                                    <span className="text-sulfur">{config.inc}s</span>
                                </div>
                                <input 
                                    type="range" min="0" max="30" value={config.inc} 
                                    onChange={(e) => setConfig({...config, inc: e.target.value})}
                                    className="neural-slider"
                                />
                            </div>
                        </div>
                    </section>

                    {/* RIGHT: DEPLOYMENT SECTORS */}
                    <section className="pp-deploy-panel">
                        <div className="panel-label hp-mono text-titanium">DEPLOYMENT_SECTORS</div>
                        
                        <div className="deploy-grid">
                            {/* GLOBAL ARENA */}
                            <div className="deploy-card global">
                                <div className="card-bg-text Archivo">Online</div>
                                <div className="deploy-content">
                                    <h3 className="Archivo text-3xl mb-2">GLOBAL ARENA</h3>
                                    <p className="hp-mono text-titanium text-xs mb-8">Find a random operative within your ELO range.</p>
                                    <button className="deploy-btn Archivo" onClick={triggerMatchmaking}>INITIATE_MATCHMAKING</button>
                                </div>
                            </div>

                            {/* PRIVATE SIM */}
                            <div className="deploy-card private">
                                <div className="card-bg-text Archivo">PRIVATE</div>
                                <div className="deploy-content">
                                    <h3 className="Archivo text-3xl mb-2">PRIVATE Lobby</h3>
                                    <p className="hp-mono text-titanium text-xs mb-8">Generate a direct neural-link for a known ally.</p>
                                    <button className="deploy-btn Archivo" onClick={triggerPrivate}>GENERATE_SECURE_LINK</button>
                                </div>
                            </div>
                        </div>

                        {/* SYSTEM LOGS */}
                        <div className="system-readout mt-8 hp-mono text-titanium">
                            <div className="readout-header">SYSTEM_LOG_FEED</div>
                            <div className="readout-line">—— Sym_Logic: {config.symbol} selected</div>
                            <div className="readout-line">—— Time_Vector: {config.time}m + {config.inc}s</div>
                            <div className="readout-line">—— Status: Awaiting Deployment...</div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default PlayPage;