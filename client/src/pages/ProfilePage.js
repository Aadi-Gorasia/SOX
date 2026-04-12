import React, { useState, useEffect, useMemo, useContext } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import InteractiveBG from '../components/InteractiveBG';
import './DashboardPage.css'; // Core layout classes
import './ProfilePage.css';   // Profile specific overrides

// =======================
// ANALYTICS ENGINE
// =======================
const processTacticalData = (user, games) => {
  if (!games || games.length === 0) return null;

  const userId = user._id;
  const reversedGames = [...games].reverse(); // Oldest to Newest
  
  let currentElo = user.elo;
  let peakElo = user.elo;
  let winStreak = 0;
  let maxWinStreak = 0;
  const opponents = {};

  reversedGames.forEach((game) => {
    const isWin = game.winner?._id === userId;
    const isDraw = game.status === 'DRAW';
    const opp = game.players.find(p => p._id !== userId);
    
    // Nemesis tracking
    if (!isWin && !isDraw && opp) {
      opponents[opp.username] = (opponents[opp.username] || 0) + 1;
    }

    const delta = isDraw ? 0 : isWin ? 15 : -15;
    currentElo += delta;
    if (currentElo > peakElo) peakElo = currentElo;

    // Streak Logic
    if (isWin) {
      winStreak++;
      if (winStreak > maxWinStreak) maxWinStreak = winStreak;
    } else if (!isDraw) {
      winStreak = 0;
    }
  });

  const nemesis = Object.entries(opponents).sort((a, b) => b[1] - a[1])[0];
  const winRate = Math.round((user.wins / (user.wins + user.losses + user.draws || 1)) * 100);

  return {
    peakElo,
    maxWinStreak,
    nemesis: nemesis ? nemesis[0] : 'NONE',
    winRate,
    recentForm: reversedGames.slice(-5).map(g => g.winner?._id === userId ? 'W' : g.status === 'DRAW' ? 'D' : 'L')
  };
};

function generateEloTimeline(games, finalElo, userId) {
  let currentElo = finalElo;
  const history = [];
  [...games].forEach((game) => {
    const result = game.status === 'DRAW' ? 'DRAW' : game.winner?._id === userId ? 'WIN' : 'LOSS';
    let delta = result === 'WIN' ? 15 : result === 'LOSS' ? -15 : 0;
    history.push({
      elo: currentElo,
      delta,
      date: new Date(game.createdAt),
      opponent: game.players.find((p) => p._id !== userId)?.username || 'Unknown',
      result,
    });
    currentElo -= delta;
  });
  return history.reverse(); // Chronological
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
    if (!data || data.length < 2) return null;
    const elos = data.map(d => d.elo);
    const min = Math.min(...elos) - 20, max = Math.max(...elos) + 20;
    const range = max - min || 1;
    const points = data.map((d, i) => [ (i / (data.length - 1)) * W, H - ((d.elo - min) / range) * H ]);
    const path = getSvgPath(points);
    return { path, area: `${path} L ${W},${H} L 0,${H} Z`, points };
  }, [data]);

  if (!graphData) return <div className="graph-container"><div style={{padding:'2rem', color:'var(--text-3)', fontFamily:'var(--mono)'}}>INSUFFICIENT_DATA_FOR_GRAPH</div></div>;

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
            <stop offset="0%" stopColor="#c8fb57" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#c8fb57" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={graphData.area} fill="url(#grad)" />
        <path d={graphData.path} fill="none" stroke="#c8fb57" strokeWidth="2" />
        {hoverData && (
          <>
            <line x1={hoverData.px} y1="0" x2={hoverData.px} y2={H} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
            <circle cx={hoverData.px} cy={hoverData.py} r="5" fill="#c8fb57" />
          </>
        )}
      </svg>
      {hoverData && (
        <div className="graph-tooltip" style={{ left: `${(hoverData.px/W)*100}%`, top: `${(hoverData.py/H)*100}%` }}>
          <div className="tooltip-elo">{hoverData.elo} ELO</div>
          <div className={`tooltip-detail ${hoverData.delta > 0 ? 'tooltip-detail--win' : hoverData.delta < 0 ? 'tooltip-detail--loss' : ''}`}>
            {hoverData.delta > 0 ? '+' : ''}{hoverData.delta} vs {hoverData.opponent}
          </div>
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

  useEffect(() => {
    // If viewing someone else, fetch their profile. Otherwise fetch logged-in user history.
    const fetchProfile = async () => {
      try {
        if (username) {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/profile/${username}`);
          setData(res.data);
        } else if (authUser) {
          const res = await axios.get(`${process.env.REACT_APP_API_URL}/api/games/history`);
          const games = Array.isArray(res.data) ? res.data : (res.data.games || []);
          setData({ user: authUser, games });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
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

  if (!data) return <div className="loading-gate"><p className="loading-text" style={{color: 'var(--red)'}}>PROFILE_NOT_FOUND</p></div>;

  const { user, games } = data;
  const isOwnProfile = !username || (authUser && authUser.username === username);
  const timeline = generateEloTimeline(games, user.elo, user._id);
  const totalGames = user.wins + user.losses + user.draws;
  const joinDate = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown';

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

        <div className="profile-body">
          
          {/* COLUMN 1: Identity & Base Stats */}
          <aside className="profile-left">
            <div className="profile-hero-card">
              <div className="profile-hero-avatar">
                {user.username[0].toUpperCase()}
              </div>
              <h1 className="profile-hero-name">{user.username}</h1>
              <div className="profile-hero-rank">Level 0{Math.floor(user.elo / 500)}</div>
              
              <div className="profile-bio-data">
                <div className="bio-row"><span className="bio-label">STATUS</span> <span className="bio-val bio-val--active">● ACTIVE</span></div>
                <div className="bio-row"><span className="bio-label">JOINED</span> <span className="bio-val">{joinDate}</span></div>
                <div className="bio-row"><span className="bio-label">REGION</span> <span className="bio-val">GLOBAL_CORE</span></div>
              </div>

              {isOwnProfile && (
                <div style={{ marginTop: '1.5rem' }}>
                  <button className="alt-mode-btn" style={{ width: '100%', marginBottom: '10px' }}>Edit Params</button>
                  <button className="alt-mode-btn" onClick={handleLogout} style={{ width: '100%', borderColor: 'var(--red)', color: 'var(--red)' }}>Terminate Session</button>
                </div>
              )}
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Core Metrics</div>
              <div className="player-stats" style={{ marginBottom: '1.5rem' }}>
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
                  <span className="winrate-pct">{analytics?.winRate || 0}%</span>
                </div>
                <div className="winrate-track">
                  <div className="winrate-fill" style={{ width: `${analytics?.winRate || 0}%` }} />
                </div>
              </div>
              <div className="total-games-label">{totalGames} cycles completed</div>
            </div>
          </aside>

          {/* COLUMN 2: ELO Graph & Logs */}
          <main className="profile-center">
            
            <div className="graph-card">
              <div className="graph-header">
                <span className="graph-title">Elo Timeline Streams</span>
                <span className="graph-status">● LIVE</span>
              </div>
              <ProfileGraph data={timeline} />
              <div className="graph-header" style={{ marginTop: '1rem', marginBottom: 0 }}>
                <span className="graph-title" style={{ color: 'var(--text-3)' }}>START: 1000</span>
                <span className="graph-title" style={{ color: 'var(--text-1)' }}>CURRENT: {user.elo}</span>
              </div>
            </div>

            <div className="history-section" style={{ padding: '1.5rem' }}>
              <div className="section-header">
                <h2 className="section-title">Transaction Logs</h2>
                <span className="section-count">Recent games</span>
              </div>

              <div className="history-list">
                {games.length > 0 ? games.slice(0, 10).map((g) => {
                  const isWin       = g.winner?._id === user._id;
                  const isDraw      = g.status === 'DRAW';
                  const opponent    = g.players?.find(p => p._id !== user._id);
                  const result      = isDraw ? 'draw' : isWin ? 'win' : 'loss';
                  const resultLabel = isDraw ? 'DRAW' : isWin ? 'VICTORY' : 'DEFEAT';
                  const eloChange   = isWin ? '+15' : isDraw ? '±0' : '−15';

                  return (
                    <div key={g._id} className={`history-row history-row--${result}`}>
                      <div className={`result-tag result-tag--${result}`}>{resultLabel}</div>
                      <div className="history-opp">vs {opponent?.username || 'Unknown'}</div>
                      <div className={`history-elo history-elo--${result}`}>{eloChange}</div>
                      <Link to={`/game/${g._id}`} className="history-replay">Replay</Link>
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
              <div className="sidebar-card-label">Behavioral Analysis</div>
              
              <div className="analysis-row" style={{ paddingBottom: '16px' }}>
                <span className="analysis-label">Recent Form</span>
                <div className="form-dots">
                  {analytics?.recentForm?.map((f, i) => (
                    <div key={i} className={`form-dot ${f}`} title={f}></div>
                  ))}
                </div>
              </div>

              <div className="analysis-row">
                <span className="analysis-label">Max Streak</span>
                <span className="analysis-val analysis-val--accent">{analytics?.maxWinStreak || 0}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Peak Rating</span>
                <span className="analysis-val">{analytics?.peakElo || user.elo}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Nemesis</span>
                <span className="analysis-val analysis-val--red">{analytics?.nemesis || 'NONE'}</span>
              </div>
              <div className="analysis-row">
                <span className="analysis-label">Elo Velocity</span>
                <span className="analysis-val">{user.elo > 1000 ? 'POSITIVE' : 'STAGNANT'}</span>
              </div>
            </div>

            <div className="sidebar-card">
              <div className="sidebar-card-label">Achievements Unlocked</div>
              <div className="achievements-grid">
                {user.wins >= 1 && <div className="badge-icon" title="First Blood">◈</div>}
                {user.wins >= 10 && <div className="badge-icon" title="Deca-Winner">▣</div>}
                {analytics?.maxWinStreak >= 4 && <div className="badge-icon" title="On Fire">🔥</div>}
                {user.elo > 1500 && <div className="badge-icon" title="Elite Operative">▲</div>}
                <div className="badge-icon locked">?</div>
                <div className="badge-icon locked">?</div>
              </div>
            </div>

            <div className="sidebar-card sys-advisory">
              <div className="advisory-label">SYSTEM ADVISORY</div>
              <p className="advisory-text">
                —— NEEDS WORK <br/><br/>
                —— Suggestion: NO RELAXING MEMORISE THOERY AND DON'T USE INTUITION
              </p>
            </div>

          </aside>

        </div>
      </div>
    </div>
  );
};

export default ProfilePage;