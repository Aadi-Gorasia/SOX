import React, { useContext, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import InteractiveBG from '../components/InteractiveBG';
import './DashboardPage.css';

const TIME_CONTROLS = [
  { tc: '1+0',  label: 'Bullet',  sub: '1 min'     },
  { tc: '3+2',  label: 'Blitz',   sub: '3 + 2 sec'  },
  { tc: '5+0',  label: 'Rapid',   sub: '5 min'     },
  { tc: '10+0', label: 'Classic', sub: '10 min'    },
];

const TIPS = [
  "Sending your opponent to a won board lets them play anywhere — avoid filling boards you don't control.",
  'The center sub-board is the most powerful. Winning it constrains every board your opponent can enter.',
  'Think two moves ahead: your move picks the sub-board your opponent enters next.',
  'A forced draw is sometimes the best play — denying your opponent a won sub-board matters.',
  'Edge sub-boards are safer to sacrifice. Corner and center sub-boards decide the game.',
  'If you control where your opponent goes, you control the game.',
  "Don't play reactively — plan which sub-boards you want to own before you need them.",
];

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket    = useSocket();
  const navigate  = useNavigate();

  const [games,       setGames]       = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTc,    setSearchTc]    = useState(null);
  const [searchTimer, setSearchTimer] = useState(0);
  const [latency,     setLatency]     = useState(null);

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

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/games/history`);
        const rawData = Array.isArray(res.data) ? res.data : (res.data.games || []);
        setGames(rawData);
      } catch (err) { console.error('History Fetch Error:', err); }
    };
    if (user) fetchHistory();
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('gameStarted', (data) => {
      setIsSearching(false);
      navigate(`/game/${data.gameId}`);
    });
    return () => socket.off('gameStarted');
  }, [socket, navigate]);

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

  const totalGames     = user ? (user.wins + user.losses + user.draws) : 0;
  const winRate        = totalGames > 0 ? Math.round((user.wins / totalGames) * 100) : 0;
  const todayTip       = TIPS[new Date().getDay() % TIPS.length];
  const latencyDisplay = latency === null ? '—' : `${latency}ms`;
  const latencyClass   = latency === null ? '' : latency > 100 ? 'latency-high' : 'latency-ok';

  if (!user) return (
    <div className="loading-gate">
      <div className="loading-inner">
        <div className="loading-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="loading-cell" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <p className="loading-text">Initializing arena</p>
      </div>
    </div>
  );

  return (
    <div className="dash-root">
      <InteractiveBG />

      {isSearching && (
        <div className="search-overlay">
          <div className="search-modal">
            <div className="search-grid-bg">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`search-cell ${i === 4 ? 'search-cell--center' : ''}`} />
              ))}
            </div>
            <div className="search-content">
              <p className="search-label">Finding opponent</p>
              <h2 className="search-tc">{searchTc}</h2>
              <div className="search-pulse" />
              <div className="search-timer">{searchTimer}s elapsed</div>
              <button className="search-abort" onClick={() => setIsSearching(false)}>Cancel search</button>
            </div>
          </div>
        </div>
      )}

      <div className="dash-wrap">

        <header className="dash-header">

          <div className="header-right">
            <div className={`latency-badge ${latencyClass}`}>
              <span className="latency-dot" />
              {latencyDisplay}
            </div>
            <div className="header-user">{user.username}</div>
          </div>
        </header>

        <div className="dash-body">

          {/* Left sidebar */}
          <aside className="dash-sidebar">
            <div className="player-card">
              <div className="player-avatar">{user.username[0].toUpperCase()}</div>
              <div className="player-name">{user.username}</div>
              <div className="player-elo">{user.elo} <span>ELO</span></div>

              <div className="player-stats">
                <div className="pstat">
                  <div className="pstat-val pstat-win">{user.wins}</div>
                  <div className="pstat-label">Wins</div>
                </div>
                <div className="pstat-divider" />
                <div className="pstat">
                  <div className="pstat-val pstat-loss">{user.losses}</div>
                  <div className="pstat-label">Losses</div>
                </div>
                <div className="pstat-divider" />
                <div className="pstat">
                  <div className="pstat-val">{user.draws}</div>
                  <div className="pstat-label">Draws</div>
                </div>
              </div>

              <div className="winrate-wrap">
                <div className="winrate-label">
                  <span>Win rate</span>
                  <span className="winrate-pct">{winRate}%</span>
                </div>
                <div className="winrate-track">
                  <div className="winrate-fill" style={{ width: `${winRate}%` }} />
                </div>
              </div>
              <div className="total-games-label">{totalGames} games played</div>
            </div>

            <div className="sidebar-card">
              <div class="sidebar-card-label">System</div>
              <div className="sys-rows">
                <div className="sys-row">
                  <span className="sys-key">Ping</span>
                  <span className={`sys-val ${latency !== null && latency > 100 ? 'sys-warn' : latency !== null ? 'sys-ok' : ''}`}>{latencyDisplay}</span>
                </div>
                <div className="sys-row">
                  <span className="sys-key">Node</span>
                  <span className="sys-val">Global 01</span>
                </div>
                <div className="sys-row">
                  <span className="sys-key">Status</span>
                  <span className="sys-val sys-ok">Live</span>
                </div>
                <div className="sys-row">
                  <span className="sys-key">Games loaded</span>
                  <span className="sys-val">{games.length}</span>
                </div>
              </div>
            </div>

            <div className="sidebar-card upgrade-card">
              <div className="upgrade-badge">Standard</div>
              <div className="upgrade-title">Go Elite</div>
              <div className="upgrade-sub">Advanced analytics, custom boards &amp; priority matchmaking</div>
              <button className="upgrade-btn">Upgrade</button>
            </div>
          </aside>

          {/* Main */}
          <main className="dash-main">
            <section className="arena-section">
              <div className="arena-title-row">
                <div>
                  <h1 className="arena-title">Play</h1>
                  <p className="arena-sub">Choose a time control to find a ranked match</p>
                </div>
                <button className="quickstart-btn" onClick={() => handleFindGame('10+0')}>
                  Quick start
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                    <polygon points="3,1 13,7 3,13" fill="currentColor" />
                  </svg>
                </button>
              </div>

              <div className="tc-grid">
                {TIME_CONTROLS.map(({ tc, label, sub }) => (
                  <button key={tc} className="tc-card" onClick={() => handleFindGame(tc)}>
                    <span className="tc-label">{label}</span>
                    <span className="tc-val">{tc}</span>
                    <span className="tc-sub">{sub}</span>
                    <div className="tc-arrow">
                      <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
                        <path d="M2 10L10 2M10 2H4M10 2V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>

              <div className="alt-modes">
                {['vs Friend', 'vs Computer', 'Tournament', 'Practice'].map(mode => (
                  <button key={mode} className="alt-mode-btn">{mode}</button>
                ))}
              </div>
            </section>

            <section className="history-section">
              <div className="section-header">
                <h2 className="section-title">Recent games</h2>
                <span className="section-count">{games.length} total</span>
              </div>

              <div className="history-list">
                {games.length > 0 ? games.slice(0, 8).map((g) => {
                  const isWin       = g.winner?._id === user._id;
                  const isDraw      = g.status === 'DRAW';
                  const opponent    = g.players?.find(p => p._id !== user._id);
                  const result      = isDraw ? 'draw' : isWin ? 'win' : 'loss';
                  const resultLabel = isDraw ? 'Draw' : isWin ? 'Win' : 'Loss';
                  const eloChange   = isWin ? '+15' : isDraw ? '±0' : '−15';
                  const timeControl = g.timeControl || '—';

                  return (
                    <div key={g._id} className={`history-row history-row--${result}`}>
                      <div className={`result-tag result-tag--${result}`}>{resultLabel}</div>
                      <div className="history-opp">vs {opponent?.username || 'Unknown'}</div>
                      <div className="history-tc">{timeControl}</div>
                      <div className={`history-elo history-elo--${result}`}>{eloChange}</div>
                      <Link to={`/game/${g._id}`} className="history-replay">Replay</Link>
                    </div>
                  );
                }) : (
                  <div className="history-empty">No games yet — find a match to get started.</div>
                )}
              </div>
            </section>
          </main>

          {/* Right sidebar */}
          <aside className="dash-right">
            <div className="sidebar-card">
              <div className="sidebar-card-label">Tip of the day</div>
              <p className="tip-text">{todayTip}</p>
            </div>

            <div className="sidebar-card daily-card">
              <div className="sidebar-card-label">Daily challenge</div>
              <div className="daily-title">Forced win in 3</div>
              <div className="daily-meta">
                <span className="difficulty-tag">Hard</span>
                <span className="daily-pts">+50 pts</span>
              </div>
              <button className="daily-btn">Start puzzle</button>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Your performance</div>
              <div className="perf-stat">
                <span className="perf-label">Win rate</span>
                <span className="perf-val perf-accent">{winRate}%</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">Total games</span>
                <span className="perf-val">{totalGames}</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">Current ELO</span>
                <span className="perf-val">{user.elo}</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">Wins</span>
                <span className="perf-val perf-accent">{user.wins}</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">Losses</span>
                <span className="perf-val perf-loss">{user.losses}</span>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;