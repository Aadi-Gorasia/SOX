import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './DashboardPage.css'; // Core layout classes
import './ProfilePage.css';   // Profile specific overrides

const API_BASE = process.env.REACT_APP_API_URL || '';

// =======================
// ANALYTICS ENGINE
// =======================
function resultFor(game, userId) {
  if (game.status === 'DRAW') return 'D';
  const winnerId = game.winner?._id ?? game.winner?.id ?? game.winner;
  if (winnerId == null) return null;
  return String(winnerId) === String(userId) ? 'W' : 'L';
}

function dateFor(game) {
  const date = new Date(game.endDate || game.createdAt);
  return Number.isNaN(date.getTime()) ? null : date;
}

function chronologicalGames(games) {
  return [...games].sort((a, b) =>
    (dateFor(a)?.getTime() || 0) - (dateFor(b)?.getTime() || 0)
  );
}

function processTacticalData(user, games) {
  const userId = user._id ?? user.id;
  const orderedGames = chronologicalGames(games);
  let winStreak = 0;
  let maxWinStreak = 0;
  const opponents = {};

  orderedGames.forEach(game => {
    const result = resultFor(game, userId);
    if (result === 'W') {
      winStreak += 1;
      maxWinStreak = Math.max(maxWinStreak, winStreak);
    } else {
      winStreak = 0;
    }

    const opponent = game.players?.find(player =>
      String(player?._id ?? player?.id) !== String(userId)
    );
    if (opponent?.username) {
      opponents[opponent.username] = (opponents[opponent.username] || 0) + 1;
    }
  });

  const frequentOpponent = Object.entries(opponents)
    .sort((a, b) => b[1] - a[1])[0];
  const wins = Number(user.wins) || 0;
  const losses = Number(user.losses) || 0;
  const draws = Number(user.draws) || 0;
  const recordedGames = wins + losses + draws;
  const gamesWithResults = games.filter(game => resultFor(game, userId));

  return {
    maxWinStreak,
    frequentOpponent: frequentOpponent?.[0] || '—',
    winRate: recordedGames
      ? Math.round((wins / recordedGames) * 100)
      : gamesWithResults.length
        ? Math.round((gamesWithResults.filter(game => resultFor(game, userId) === 'W').length / gamesWithResults.length) * 100)
        : 0,
    recentForm: [...games]
      .sort((a, b) => (dateFor(b)?.getTime() || 0) - (dateFor(a)?.getTime() || 0))
      .map(game => resultFor(game, userId))
      .filter(Boolean)
      .slice(0, 5)
  };
}

function buildResultTimeline(games, userId) {
  let balance = 0;
  return chronologicalGames(games).flatMap(game => {
    const result = resultFor(game, userId);
    if (!result) return [];
    balance += result === 'W' ? 1 : result === 'L' ? -1 : 0;
    const opponent = game.players?.find(player =>
      String(player?._id ?? player?.id) !== String(userId)
    );
    return [{
      balance,
      result,
      date: dateFor(game),
      opponent: opponent?.username || 'Unknown'
    }];
  });
}

// =======================
// GRAPH COMPONENT
// =======================
function getSvgPath(points) {
  if (points.length === 0) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const cp1x = x0 + (x1 - x0) / 2;
    d += ` C ${cp1x},${y0} ${cp1x},${y1} ${x1},${y1}`;
  }
  return d;
}

function ProfileGraph({ data }) {
  const [hoverData, setHoverData] = useState(null);
  const W = 1000, H = 220;

  const graphData = useMemo(() => {
    if (!data || data.length === 0) return null;
    const balances = data.map(point => point.balance);
    const min = Math.min(...balances, 0) - 1, max = Math.max(...balances, 0) + 1;
    const range = max - min || 1;
    const points = data.map((point, i) => [
      data.length === 1 ? W / 2 : (i / (data.length - 1)) * W,
      H - ((point.balance - min) / range) * H
    ]);
    const path = getSvgPath(points);
    return {
      path,
      area: data.length > 1 ? `${path} L ${W},${H} L 0,${H} Z` : '',
      points
    };
  }, [data]);

  if (!graphData) return (
    <div className="graph-container graph-container--empty">
      No completed games yet. Your match record will appear here.
    </div>
  );

  return (
    <div className="graph-container" 
         onMouseMove={(e) => {
           const rect = e.currentTarget.getBoundingClientRect();
           const x = (e.clientX - rect.left) / rect.width * W;
           const idx = Math.round((x / W) * (data.length - 1));
           if (data[idx]) setHoverData({ ...data[idx], px: graphData.points[idx][0], py: graphData.points[idx][1] });
         }}
         onMouseLeave={() => setHoverData(null)}>
      <div className="graph-scanline"></div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {graphData.area && <path d={graphData.area} fill="url(#grad)" />}
        <path d={graphData.path} fill="none" stroke="var(--color-primary)" strokeWidth="2" />
        {graphData.points.map(([x, y], index) => (
          <circle key={index} cx={x} cy={y} r={data.length === 1 ? 5 : 3} fill="var(--color-primary)" />
        ))}
        {hoverData && (
          <>
            <line x1={hoverData.px} y1="0" x2={hoverData.px} y2={H} stroke="var(--color-border)" strokeDasharray="4 4" />
            <circle cx={hoverData.px} cy={hoverData.py} r="5" fill="var(--color-primary)" />
          </>
        )}
      </svg>
      {hoverData && (
        <div className="graph-tooltip" style={{ left: `${(hoverData.px/W)*100}%`, top: `${(hoverData.py/H)*100}%` }}>
          <div className="tooltip-elo">W-L balance: {hoverData.balance > 0 ? '+' : ''}{hoverData.balance}</div>
          <div className={`tooltip-detail ${hoverData.result === 'W' ? 'tooltip-detail--win' : hoverData.result === 'L' ? 'tooltip-detail--loss' : ''}`}>
            {hoverData.result === 'W' ? 'Win' : hoverData.result === 'L' ? 'Loss' : 'Draw'} vs {hoverData.opponent}
          </div>
          {hoverData.date && <div className="tooltip-detail">{hoverData.date.toLocaleDateString()}</div>}
        </div>
      )}
    </div>
  );
}

// =======================
// MAIN COMPONENT
// =======================
const ProfilePage = () => {
  const { username } = useParams();
  const { user: authUser, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let active = true;
    let controller;
    const fetchProfile = async () => {
      controller?.abort();
      const requestController = new AbortController();
      controller = requestController;
      setLoading(true);
      setLoadError('');
      try {
        if (username && username !== authUser?.username) {
          const response = await axios.get(
            `${API_BASE}/api/users/profile/${encodeURIComponent(username)}`,
            { signal: requestController.signal }
          );
          if (active) setData(response.data);
        } else if (authUser) {
          const [userResponse, gamesResponse] = await Promise.all([
            axios.get(`${API_BASE}/api/auth`, { signal: requestController.signal }),
            axios.get(`${API_BASE}/api/games/history?limit=50`, { signal: requestController.signal })
          ]);
          const games = Array.isArray(gamesResponse.data)
            ? gamesResponse.data
            : (gamesResponse.data.games || []);
          if (active) setData({ user: userResponse.data, games });
        } else {
          throw new Error('You must be signed in to view this profile.');
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error('Profile data fetch failed:', error);
          if (active) setLoadError(error.response?.data?.msg || 'Profile data could not be loaded.');
        }
      } finally {
        if (active && !requestController.signal.aborted) setLoading(false);
      }
    };
    fetchProfile();
    window.addEventListener('focus', fetchProfile);
    return () => {
      active = false;
      controller?.abort();
      window.removeEventListener('focus', fetchProfile);
    };
  }, [username, authUser]);

  const analytics = useMemo(() => {
    if (!data) return null;
    return processTacticalData(data.user, data.games);
  }, [data]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return (
    <div className="loading-gate">
      <div className="loading-inner">
        <div className="loading-grid">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="loading-cell" style={{ animationDelay: `${i * 0.1}s` }} />
          ))}
        </div>
        <p className="loading-text">Decrypting profile...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="loading-gate">
      <div>
        <p className="loading-text" role="alert">{loadError || 'Profile not found.'}</p>
        <Link to="/dashboard" className="history-view-all">Back to dashboard</Link>
      </div>
    </div>
  );

  const { user, games } = data;
  const isOwnProfile = !username || (authUser && authUser.username === username);
  const userId = user._id ?? user.id;
  const timeline = buildResultTimeline(games, userId);
  const wins = Number(user.wins) || 0;
  const losses = Number(user.losses) || 0;
  const draws = Number(user.draws) || 0;
  const totalGames = wins + losses + draws || games.filter(game => resultFor(game, userId)).length;
  const elo = Number(user.elo) || 0;
  const joinDateValue = user.date || user.createdAt;
  const joinDate = joinDateValue && !Number.isNaN(new Date(joinDateValue).getTime())
    ? new Date(joinDateValue).toLocaleDateString()
    : 'Unknown';
  const currentBalance = timeline[timeline.length - 1]?.balance ?? 0;
  const lastResult = analytics?.recentForm?.[0];

  return (
    <div className="dash-root">
      <InteractiveBG />

      <div className="dash-wrap">
        
        {/* Header (Matching Dashboard) */}
        <header className="dash-header">
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <div className="header-logo">
              <span className="logo-text">SOX</span>
            </div>
          </Link>
          <div className="header-right">
            <Link to="/dashboard" className="alt-mode-btn" style={{ padding: '8px 16px', textDecoration: 'none' }}>
              Back to Arena
            </Link>
          </div>
        </header>

        {loadError && <p className="dashboard-data-notice" role="status">Could not refresh profile data: {loadError}</p>}

        <div className="profile-body">
          
          {/* COLUMN 1: Identity & Base Stats */}
          <aside className="profile-left">
            <div className="profile-hero-card">
              <div className="profile-hero-avatar">
                {user.username?.[0]?.toUpperCase() || '?'}
              </div>
              <h1 className="profile-hero-name">{user.username}</h1>
              <div className="profile-hero-rank">{elo} ELO</div>
              
              <div className="profile-bio-data">
                <div className="bio-row"><span className="bio-label">PLAYER</span> <span className="bio-val">{user.username}</span></div>
                <div className="bio-row"><span className="bio-label">JOINED</span> <span className="bio-val">{joinDate}</span></div>
                <div className="bio-row"><span className="bio-label">GAMES</span> <span className="bio-val">{totalGames}</span></div>
              </div>

              {isOwnProfile && (
                <div style={{ marginTop: '1.5rem' }}>
                  <Link to="/settings" className="alt-mode-btn profile-action-link">Settings</Link>
                  <button className="alt-mode-btn profile-action-button" onClick={handleLogout}>Log out</button>
                </div>
              )}
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Core Metrics</div>
              <div className="player-stats" style={{ marginBottom: '1.5rem' }}>
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
                  <span className="winrate-pct">{analytics?.winRate || 0}%</span>
                </div>
                <div className="winrate-track">
                  <div className="winrate-fill" style={{ width: `${analytics?.winRate || 0}%` }} />
                </div>
              </div>
              <div className="total-games-label">{totalGames} completed games</div>
            </div>
          </aside>

          {/* COLUMN 2: Results & Match History */}
          <main className="profile-center">
            
            <div className="graph-card">
              <div className="graph-header">
                <span className="graph-title">Recent match record</span>
                <span className="graph-status">{games.length} of up to 50 games</span>
              </div>
              <ProfileGraph data={timeline} />
              <div className="graph-header" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <span className="graph-title" style={{ color: 'var(--text-3)' }}>CUMULATIVE WINS − LOSSES</span>
                <span className="graph-title" style={{ color: 'var(--text-1)' }}>CURRENT: {currentBalance > 0 ? '+' : ''}{currentBalance}</span>
              </div>
            </div>

            <div className="history-section" style={{ padding: '1.5rem' }}>
              <div className="section-header">
                <h2 className="section-title">Recent games</h2>
                {isOwnProfile
                  ? <Link to="/games/history" className="section-count history-view-all">View all games →</Link>
                  : <span className="section-count">Recent games</span>}
              </div>

              <div className="history-list">
                {games.length > 0 ? games.slice(0, 10).map((g) => {
                  const resultCode = resultFor(g, userId);
                  const opponent = g.players?.find(player =>
                    String(player?._id ?? player?.id) !== String(userId)
                  );
                  const result = resultCode === 'W' ? 'win' : resultCode === 'D' ? 'draw' : resultCode === 'L' ? 'loss' : 'draw';
                  const resultLabel = resultCode === 'W' ? 'WIN' : resultCode === 'D' ? 'DRAW' : resultCode === 'L' ? 'LOSS' : 'IN PROGRESS';
                  const gameDate = dateFor(g);

                  return (
                    <div key={g._id} className={`history-row history-row--${result}`}>
                      <div className={`result-tag result-tag--${result}`}>{resultLabel}</div>
                      <div className="history-opp">vs {opponent?.username || 'Unknown'}</div>
                      <div className="history-date">{gameDate ? gameDate.toLocaleDateString() : 'Date unavailable'}</div>
                      {isOwnProfile && resultCode && g.moves?.length > 0 && (
                        <Link to={`/review/${g._id}`} className="history-replay">Review</Link>
                      )}
                    </div>
                  );
                }) : (
                  <div className="history-empty">No transaction logs found.</div>
                )}
              </div>
            </div>
          </main>

          {/* COLUMN 3: Deep Analysis & Badges */}
          <aside className="profile-right">
            
            <div className="sidebar-card">
              <div className="sidebar-card-label">Recent performance</div>
              
              <div className="analysis-row" style={{ paddingBottom: '16px' }}>
                <span className="analysis-label">Form (latest first)</span>
                <div className="form-dots">
                  {analytics?.recentForm?.map((f, i) => (
                    <div key={i} className={`form-dot ${f}`} title={f}></div>
                  ))}
                </div>
              </div>

              <div className="analysis-row">
                <span className="analysis-label">Best streak (50)</span>
                <span className="analysis-val analysis-val--accent">{analytics?.maxWinStreak || 0}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Current rating</span>
                <span className="analysis-val">{elo}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Frequent opponent (50)</span>
                <span className="analysis-val">{analytics?.frequentOpponent || '—'}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Latest result</span>
                <span className={`analysis-val ${lastResult === 'W' ? 'analysis-val--accent' : lastResult === 'L' ? 'analysis-val--red' : ''}`}>
                  {lastResult === 'W' ? 'Win' : lastResult === 'L' ? 'Loss' : lastResult === 'D' ? 'Draw' : '—'}
                </span>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Career milestones</div>
              <div className="achievements-grid">
                {wins >= 1 && <div className="badge-icon" title="First win">1W</div>}
                {wins >= 10 && <div className="badge-icon" title="10 wins">10W</div>}
                {(analytics?.maxWinStreak || 0) >= 4 && <div className="badge-icon" title="Four-game win streak">4×</div>}
                {elo >= 1500 && <div className="badge-icon" title="Rating of 1500 or higher">1500+</div>}
                {!wins && !((analytics?.maxWinStreak || 0) >= 4) && elo < 1500 && (
                  <span className="bio-val">Milestones will appear as you play.</span>
                )}
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Match summary</div>
              <p className="advisory-text">
                {totalGames
                  ? `${analytics?.winRate || 0}% win rate across ${totalGames} completed games. The chart reflects recorded wins minus losses; draws leave the balance unchanged.`
                  : 'No completed games yet. Play a match to start building your profile.'}
              </p>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;