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

const API_BASE = process.env.REACT_APP_API_URL || '';

const DashboardPage = () => {
  const { user } = useContext(AuthContext);
  const socket    = useSocket();
  const navigate  = useNavigate();

  const [dashboardUser, setDashboardUser] = useState(user);
  const [games,       setGames]       = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [gamesError, setGamesError] = useState('');
  const [userRefreshError, setUserRefreshError] = useState('');
  const [health, setHealth] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTc,    setSearchTc]    = useState(null);
  const [searchTimer, setSearchTimer] = useState(0);
  const [latency,     setLatency]     = useState(null);
  const reviewableGame = games.find(game => game.status !== 'ONGOING' && game.moves?.length > 0);

  useEffect(() => {
    if (!user) {
      setDashboardUser(null);
      return undefined;
    }

    let active = true;
    const refreshUser = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/auth`);
        if (active) {
          setDashboardUser(response.data);
          setUserRefreshError('');
        }
      } catch (error) {
        console.error('Dashboard profile refresh failed:', error);
        if (active) {
          setDashboardUser(user);
          setUserRefreshError('Could not refresh account stats. Showing the last loaded values.');
        }
      }
    };

    setDashboardUser(user);
    refreshUser();
    window.addEventListener('focus', refreshUser);
    return () => {
      active = false;
      window.removeEventListener('focus', refreshUser);
    };
  }, [user]);

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
    if (!user) return undefined;
    let active = true;
    const fetchHistory = async () => {
      setGamesLoading(true);
      setGamesError('');
      try {
        const response = await axios.get(`${API_BASE}/api/games/history?limit=20`);
        const history = Array.isArray(response.data) ? response.data : (response.data.games || []);
        if (active) setGames(history);
      } catch (error) {
        console.error('Dashboard history fetch failed:', error);
        if (active) setGamesError('Recent games could not be loaded.');
      } finally {
        if (active) setGamesLoading(false);
      }
    };
    fetchHistory();
    window.addEventListener('focus', fetchHistory);
    return () => {
      active = false;
      window.removeEventListener('focus', fetchHistory);
    };
  }, [user]);

  useEffect(() => {
    let active = true;
    const refreshHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE}/health`);
        if (active) setHealth(response.data);
      } catch (error) {
        console.error('Service health check failed:', error);
        if (active) setHealth({ status: 'unavailable', database: 'unknown' });
      }
    };
    refreshHealth();
    const interval = setInterval(refreshHealth, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onGameStarted = (data) => {
      setIsSearching(false);
      navigate(`/game/${data.gameId}`);
    };
    socket.on('gameStarted', onGameStarted);
    return () => {
      socket.off('gameStarted', onGameStarted);
      socket.emit('cancelFindGame');
    };
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

  const cancelSearch = () => {
    socket?.emit('cancelFindGame');
    setIsSearching(false);
  };

  const currentUser    = dashboardUser || user;
  const wins           = Number(currentUser?.wins) || 0;
  const losses         = Number(currentUser?.losses) || 0;
  const draws          = Number(currentUser?.draws) || 0;
  const elo            = Number(currentUser?.elo) || 0;
  const totalGames     = wins + losses + draws;
  const winRate        = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const todayTip       = TIPS[new Date().getDay() % TIPS.length];
  const latencyDisplay = latency === null ? '—' : `${latency}ms`;
  const latencyClass   = latency === null ? '' : latency > 100 ? 'latency-high' : 'latency-ok';

  if (!currentUser) return (
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
              <button className="search-abort" onClick={cancelSearch}>Cancel search</button>
            </div>
          </div>
        </div>
      )}

      <div className="dash-wrap">

        {userRefreshError && <p className="dashboard-data-notice" role="status">{userRefreshError}</p>}

        <header className="dash-header">

          <div className="header-right">
            <div className={`latency-badge ${latencyClass}`}>
              <span className="latency-dot" />
              {latencyDisplay}
            </div>
            <Link to={`/profile/${encodeURIComponent(currentUser.username)}`} className="header-user">{currentUser.username}</Link>
          </div>
        </header>

        <div className="dash-body">

          {/* Left sidebar */}
          <aside className="dash-sidebar">
            <div className="player-card">
              <div className="player-avatar">{currentUser.username?.[0]?.toUpperCase() || '?'}</div>
              <div className="player-name">{currentUser.username}</div>
              <div className="player-elo">{elo} <span>ELO</span></div>

              <div className="player-stats">
                <div className="pstat">
                  <div className="pstat-val pstat-win">{wins}</div>
                  <div className="pstat-label">Wins</div>
                </div>
                <div className="pstat-divider" />
                <div className="pstat">
                  <div className="pstat-val pstat-loss">{losses}</div>
                  <div className="pstat-label">Losses</div>
                </div>
                <div className="pstat-divider" />
                <div className="pstat">
                  <div className="pstat-val">{draws}</div>
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
              <div className="sidebar-card-label">System</div>
              <div className="sys-rows">
                <div className="sys-row">
                  <span className="sys-key">Ping</span>
                  <span className={`sys-val ${latency !== null && latency > 100 ? 'sys-warn' : latency !== null ? 'sys-ok' : ''}`}>{latencyDisplay}</span>
                </div>
                <div className="sys-row">
                  <span className="sys-key">API</span>
                  <span className={`sys-val ${health?.status === 'ok' ? 'sys-ok' : health ? 'sys-warn' : ''}`}>
                    {health?.status === 'ok' ? 'Online' : health?.status === 'unavailable' ? 'Offline' : 'Checking'}
                  </span>
                </div>
                <div className="sys-row">
                  <span className="sys-key">Database</span>
                  <span className={`sys-val ${health?.database === 'connected' ? 'sys-ok' : health?.database === 'disconnected' ? 'sys-warn' : ''}`}>
                    {health?.database || 'Checking'}
                  </span>
                </div>
                <div className="sys-row">
                  <span className="sys-key">Recent games</span>
                  <span className="sys-val">{gamesLoading ? '…' : games.length}</span>
                </div>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Puzzle training</div>
              <div className="daily-title">{Number(currentUser.puzzleRating) || 1200} rating</div>
              <p className="tip-text">Practice tactical positions and track your puzzle rating.</p>
              <Link to="/puzzles" className="daily-btn">Open puzzles</Link>
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
                <Link to="/play" className="alt-mode-btn">Play a friend</Link>
                <Link to="/tournament" className="alt-mode-btn">Tournament</Link>
                <Link to="/puzzles" className="alt-mode-btn">Practice puzzles</Link>
              </div>
            </section>

            <section className="history-section">
              <div className="section-header">
                <h2 className="section-title">Recent games</h2>
                <Link to="/games/history" className="section-count history-view-all">
                  View all games →
                </Link>
              </div>

              <div className="history-list">
                {gamesError ? (
                  <div className="history-empty" role="alert">{gamesError}</div>
                ) : gamesLoading ? (
                  <div className="history-empty">Loading recent games…</div>
                ) : games.length > 0 ? games.slice(0, 8).map((g) => {
                  const winnerId    = g.winner?._id ?? g.winner?.id ?? g.winner;
                  const isWin       = String(winnerId) === String(currentUser._id);
                  const isDraw      = g.status === 'DRAW';
                  const opponent    = g.players?.find(player =>
                    String(player?._id ?? player?.id) !== String(currentUser._id)
                  );
                  const isOngoing   = g.status === 'ONGOING';
                  const result      = isOngoing ? 'draw' : isDraw ? 'draw' : isWin ? 'win' : 'loss';
                  const resultLabel = isOngoing ? 'Live' : isDraw ? 'Draw' : isWin ? 'Win' : 'Loss';
                  const timeControl = g.timeControl || '—';
                  const gameDate = g.endDate || g.createdAt;
                  const dateLabel = gameDate && !Number.isNaN(new Date(gameDate).getTime())
                    ? new Date(gameDate).toLocaleDateString()
                    : 'Date unavailable';

                  return (
                    <div key={g._id} className={`history-row history-row--${result}`}>
                      <div className={`result-tag result-tag--${result}`}>{resultLabel}</div>
                      <div className="history-opp">vs {opponent?.username || 'Unknown'}</div>
                      <div className="history-tc">{timeControl}</div>
                      <div className="history-date">{dateLabel}</div>
                      {!isOngoing && g.moves?.length > 0
                        ? <Link to={`/review/${g._id}`} className="history-replay">Review</Link>
                        : <span className="history-replay history-replay--empty">—</span>}
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
              <div className="sidebar-card-label">Keep improving</div>
              <div className="daily-title">Review your last game</div>
              <p className="tip-text">Find turning points and get engine feedback on your moves.</p>
              {reviewableGame
                ? <Link to={`/review/${reviewableGame._id}`} className="daily-btn">Review game</Link>
                : <Link to="/puzzles" className="daily-btn">Practice puzzles</Link>}
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
                <span className="perf-val">{elo}</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">Wins</span>
                <span className="perf-val perf-accent">{wins}</span>
              </div>
              <div className="perf-stat">
                <span className="perf-label">Losses</span>
                <span className="perf-val perf-loss">{losses}</span>
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
