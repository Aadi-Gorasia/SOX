import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import InteractiveBG from '../components/InteractiveBG';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket = useSocket();
  const navigate = useNavigate();

  const [games, setGames] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTc, setSearchTc] = useState(null);
  const [searchTimer, setSearchTimer] = useState(0);
  const [latency, setLatency] = useState(0);

  // 1. DYNAMIC LATENCY (Heartbeat)
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

  // 2. FETCH HISTORY (Using the logic that works in your ProfilePage)
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/games/history`);
        // We accept the data exactly as the ProfilePage does
        const rawData = Array.isArray(res.data) ? res.data : (res.data.games || []);
        setGames(rawData);
      } catch (err) { console.error("History Fetch Error:", err); }
    };
    if (user) fetchHistory();
  }, [user]);

  // 3. MATCHMAKING LISTENERS
  useEffect(() => {
    if (!socket) return;
    socket.on('gameStarted', (data) => {
      setIsSearching(false);
      navigate(`/game/${data.gameId}`);
    });
    return () => socket.off('gameStarted');
  }, [socket, navigate]);

  // 4. SEARCH TIMER
  useEffect(() => {
    let interval;
    if (isSearching) {
      interval = setInterval(() => setSearchTimer(prev => prev + 1), 1000);
    } else {
      setSearchTimer(0);
    }
    return () => clearInterval(interval);
  }, [isSearching]);

  const handleFindGame = (tc) => {
    if (!socket) return;
    setIsSearching(true);
    setSearchTc(tc);
    socket.emit('findGame', { timeControl: tc, preferredSymbol: 'X' });
  };

  if (!user) return <div className="loading-gate hp-mono">INITIALIZING_ARENA...</div>;

  return (
    
    <div className="dash-root">
      
      <InteractiveBG />
      
      {/* SEARCHING OVERLAY */}
      {isSearching && (
        <div className="dash-overlay">
          <div className="search-hud">
            <div className="hud-scanline"></div>
            <div className="hp-mono text-sulfur mb-2">SCANNING_FREQUENCIES...</div>
            <h2 className="Archivo text-4xl mb-8">TARGET: {searchTc}</h2>
            <div className="radar-box">
              <div className="radar-circle"></div>
              <div className="radar-crosshair"></div>
            </div>
            <div className="hp-mono text-silver mb-8">ELAPSED: {searchTimer}s</div>
            <button className="abort-btn hp-mono" onClick={() => setIsSearching(false)}>[ ABORT_CONNECTION ]</button>
          </div>
        </div>
      )}

      <div className="dash-content">
        {/* HUD TOP BAR */}
        <br />
        <br />
        <br />
        <br />
        <header className="dash-hud-top hp-mono">
          <div className="hud-item" style={{ color: "white" }}><span className="text-titanium">LATENCY:</span> <span className={latency > 100 ? "text-crimson" : "text-sulfur"}>{latency}MS</span></div>
          <div className="hud-item" style={{ color: "white" }}><span className="text-titanium">OPERATIVE:</span> {user.username.toUpperCase()}</div>
          <div className="hud-item" style={{ color: "white" }}><span className="text-titanium">NODE:</span> GLOBAL_01</div>
          <div className="hud-item text-crimson animate-pulse">● SYSTEM_LIVE</div>
        </header>

        <div className="dash-main-layout">
          
          {/* COLUMN 1: OPERATIVE IDENTITY */}
          <aside className="dash-col">
            <div className="dash-card prof-id-card">
              <div className="prof-avatar-container">
                <div className="prof-avatar-glow"></div>
                <div className="prof-avatar-inner Archivo">{user.username[0]}</div>
              </div>
              <h2 className="Archivo text-2xl mt-4">{user.username.toUpperCase()}</h2>
              <div className="hp-mono text-sulfur mb-6">{user.elo} ELO</div>
              
              <div className="prof-metrics hp-mono">
                <div className="m-row"><span>WIN_RATE</span> <span className="text-sulfur">{Math.round((user.wins / (user.wins + user.losses + user.draws || 1)) * 100)}%</span></div>
                <div className="m-row"><span>SESSIONS</span> <span>{user.wins + user.losses + user.draws}</span></div>
                <div className="m-row"><span>RANK</span> <span className="text-cobalt">OPERATIVE</span></div>
              </div>
            </div>

            <div className="dash-card mt-6 stats-breakdown">
              <div className="dash-label hp-mono">BATTLE_STATS</div>
              <div className="stats-row">
                <div className="stat-v"><span className="hp-mono text-xs text-titanium">WINS</span><br /><br /><div className="Archivo text-2xl text-sulfur">{user.wins}</div></div>
                <div className="stat-v"><span className="hp-mono text-xs text-titanium">LOSS</span><br /><br /><div className="Archivo text-2xl text-crimson">{user.losses}</div></div>
              </div>
            </div>
          </aside>

          {/* COLUMN 2: COMBAT ARENA */}
          <main className="dash-col-main">
            <section className="arena-hero">
              <div className="arena-text">
                <h1 className="Archivo text-6xl">WAR_ROOM</h1>
                <p className="hp-mono text-silver mt-2">CHOOSE_FREQUENCY // ENGAGE_RECURSIVE_LOGIC</p>
              </div>
              <button className="quick-action-btn Archivo" onClick={() => handleFindGame('10+0')}>QUICK_START</button>
            </section>

            <div className="tc-grid">
              {['1+0', '3+2', '5+0', '10+0'].map(tc => 
                <button key={tc} className="tc-node" onClick={() => handleFindGame(tc)}>
                  <span className="hp-mono text-titanium text-xs">FREQ</span>
                  <br />
                  <br />
                  <div className="Archivo text-5xl">{tc}</div>
                  <br />
                  <div className="hp-mono text-cobalt text-xs mt-2">CONNECT_STATION</div>
                </button>
              )}
            </div>

            <div className="dash-card mt-6">
              <div className="dash-label hp-mono">BATTLE_ARCHIVES [TRANSACTION_LOG]</div>
              <div className="battle-archive-list">
                {games.length > 0 ? games.slice(0, 8).map((g) => {
                  // CORRECT LOGIC FROM YOUR PROFILE PAGE
                  const isWin = g.winner?._id === user._id;
                  const isDraw = g.status === "DRAW";
                  const opponent = g.players?.find(p => p._id !== user._id);
                  
                  return (
                    <div key={g._id} className={`battle-row ${isDraw ? 'draw' : isWin ? 'win' : 'loss'}`}>
                      <div className="hp-mono res-cell">{isDraw ? 'DRW' : isWin ? 'VIC' : 'DEF'}</div>
                      <div className="Archivo opp-cell">VS_{opponent?.username?.toUpperCase() || 'UNKNOWN'}</div>
                      <div className="hp-mono elo-cell">{isWin ? '+15' : isDraw ? '±0' : '-15'}</div>
                      <Link to={`/game/${g._id}`} className="replay-btn hp-mono">REPLAY</Link>
                    </div>
                  );
                }) : (
                  <div className="hp-mono text-steel p-4">NO_PRIOR_ENCOUNTERS_FOUND</div>
                )}
              </div>
            </div>
          </main>

          {/* COLUMN 3: SYSTEM HUD */}
          <aside className="dash-col">
            <div className="dash-card">
              <div className="dash-label hp-mono">SYSTEM_LOGS</div>
              <div className="sys-feed hp-mono text-xs">
                <div className="feed-item"><span className="text-cobalt">——</span> PING: {latency}ms</div>
                <div className="feed-item"><span className="text-sulfur">——</span> History sync complete</div>
                <div className="feed-item"><span className="text-steel">——</span> Buffer: STABLE</div>
                <div className="feed-item"><span className="text-crimson">——</span> Recursive depth: 9</div>
              </div>
            </div>

            <div className="dash-card mt-6 advisory-card">
              <div className="dash-label hp-mono text-crimson">TACTICAL_ADVISORY</div>
              <p className="hp-mono text-xs text-silver leading-relaxed">
                Operative shows mid-game stagnation. Avoid Intuition-based plays. Memorize sector-capture vectors for 10% elo velocity increase.
              </p>
            </div>

            <div className="dash-card mt-6 premium-box">
              <div className="hp-mono text-xs mb-2">ACCESS_LEVEL: STANDARD</div>
              <h3 className="Archivo text-lg">UPGRADE_TO_ELITE</h3>
              <button className="upgrade-btn Archivo mt-4">INIT_UPGRADE</button>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;