// client/src/pages/ProfilePage.js
import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

// =======================
// HELPERS
// =======================

const RANKS = [
  { name: "Iron", color: "#545454", min: 0 },
  { name: "Bronze", color: "#cd7f32", min: 400 },
  { name: "Silver", color: "#c0c0c0", min: 800 },
  { name: "Gold", color: "#ffd700", min: 1200 },
  { name: "Platinum", color: "#25D366", min: 1600 },
  { name: "Diamond", color: "#b9f2ff", min: 2000 },
  { name: "Immortal", color: "#ff4757", min: 2400 },
];

function getRankData(elo) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (elo >= r.min) current = r;
  }
  return current;
}

// Cubic Bezier smoothing for SVG path
function getSvgPath(points) {
  if (points.length === 0) return "";
  
  // Start point
  let d = `M ${points[0][0]},${points[0][1]}`;

  for (let i = 0; i < points.length - 1; i++) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];

    // Calculate control points (basic smoothing)
    const cp1x = x0 + (x1 - x0) / 2;
    const cp1y = y0;
    const cp2x = x0 + (x1 - x0) / 2;
    const cp2y = y1;

    d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${x1},${y1}`;
  }
  return d;
}

/**
 * Generates history by walking BACKWARDS from current Elo,
 * then reverses array so index 0 is the Oldest game.
 */
function generateEloTimeline(games, finalElo, userId) {
  let currentElo = finalElo;
  const history = [];

  // 1. Iterate Newest -> Oldest
  // We assume 'games' comes from API sorted by Date Descending
  games.forEach((game) => {
    // Determine result
    const result = game.status === "DRAW" 
      ? "DRAW" 
      : game.winner?._id === userId 
      ? "WIN" 
      : "LOSS";

    // Simulate the delta that got us here
    // (In a real app, you'd store 'eloChange' on the game record)
    let delta = 0;
    if (result === "WIN") delta = Math.floor(Math.random() * 10 + 5); 
    else if (result === "LOSS") delta = -Math.floor(Math.random() * 10 + 5);

    // Push the state *after* this game finished
    history.push({
      elo: currentElo,
      delta: delta,
      date: new Date(game.createdAt),
      opponent: game.players.find((p) => p._id !== userId)?.username || "Unknown",
      result,
    });

    // Undo the elo change to find out what it was before this game
    currentElo -= delta;
  });

  // 2. Reverse so Index 0 = Oldest, Index N = Newest
  return history.reverse();
}

// =======================
// COMPONENTS
// =======================

function ProfileHero({ user, stats }) {
  const rank = getRankData(user.elo);
  
  return (
    <div className="profile-hero insane-card">
      <div className="hero-bg-glow" style={{ background: rank.color }}></div>
      
      <div className="hero-main">
        <div className="avatar-wrapper">
          <div className="avatar-circle">
            {user.username?.[0]?.toUpperCase()}
          </div>
          <div className="rank-badge" style={{ backgroundColor: rank.color, color: rank.name === 'Iron' ? '#fff' : '#000' }}>
            {rank.name}
          </div>
        </div>
        
        <div className="hero-info">
          <h1 className="username">{user.username}</h1>
          <div className="user-meta">
             <span>Joined {new Date(user.createdAt || Date.now()).toLocaleDateString()}</span>
             <span className="dot-sep">•</span>
             <span>{stats.total} Matches</span>
          </div>
        </div>
      </div>

      <div className="hero-stats">
        <div className="stat-block">
          <span className="stat-label">Current Elo</span>
          <span className="stat-val" style={{ color: rank.color }}>{user.elo}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">Win Rate</span>
          <span className="stat-val">{stats.winRate}%</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">W / L / D</span>
          <span className="stat-val highlight">
            <span className="w">{stats.wins}</span> / <span className="l">{stats.losses}</span> / <span className="d">{stats.draws}</span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SmoothGraph({ data }) {
  const [hoverData, setHoverData] = useState(null);

  const { path, areaPath, points, width, height } = useMemo(() => {
    // Need at least 2 points to draw a line
    if (!data || data.length < 2) return {};
    
    const W = 1000;
    const H = 300;
    
    // Find Min/Max Elo to scale Y-axis
    const elos = data.map(d => d.elo);
    const minElo = Math.min(...elos) - 25; // padding bottom
    const maxElo = Math.max(...elos) + 25; // padding top
    const range = maxElo - minElo || 1;

    const coords = data.map((d, i) => {
      // X: 0 is Oldest (Left), W is Newest (Right)
      const x = (i / (data.length - 1)) * W;
      // Y: SVG 0 is top. So we invert: 100% - value
      const y = H - ((d.elo - minElo) / range) * H;
      return [x, y];
    });

    const linePath = getSvgPath(coords);
    // Area closes the loop at the bottom for the gradient fill
    const area = `${linePath} L ${W},${H + 50} L 0,${H + 50} Z`;

    return { path: linePath, areaPath: area, points: coords, width: W, height: H };
  }, [data]);

  if (!data || data.length < 2)  return (
    <div className="insane-card graph-panel">
      <div className="card-header">
        Rating History
      </div>
      
      <div 
        className="graph-container" 
        onMouseMove={handleMouseMove} 
        onMouseLeave={() => setHoverData(null)}
      >
        <svg viewBox={`0 -10 ${width} ${height + 20}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffd700" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#ffd700" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* ... (Keep your existing paths/lines) ... */}
          
          <path d={areaPath} fill="url(#gradientFill)" />
          
          <path 
            d={path} 
            fill="none" 
            stroke="#ffd700" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />

          {/* Hover Circle */}
          {hoverData && (
            <>
              <line 
                x1={hoverData.x} y1="0" x2={hoverData.x} y2={height} 
                stroke="rgba(255,255,255,0.2)" strokeWidth="1" strokeDasharray="4"
              />
              <circle 
                cx={hoverData.x} 
                cy={hoverData.y} 
                r="5" 
                fill="#000" 
                stroke="#ffd700" 
                strokeWidth="2" 
              />
            </>
          )}
        </svg>

        {/* --- UPDATED TOOLTIP LOGIC HERE --- */}
        {hoverData && (
          <div 
            className="graph-tooltip"
            style={{ 
              left: `${(hoverData.x / width) * 100}%`,
              // This makes it float 15px ABOVE the curve point
              top: `${(hoverData.y / height) * 100}%`, 
              marginTop: '-15px' 
            }}
          >
            <div style={{ color: '#fff', fontWeight: 'bold' }}>{hoverData.elo}</div>
            <div style={{ color: hoverData.delta >= 0 ? '#4ade80' : '#f87171', fontSize: '0.8em' }}>
              {hoverData.delta > 0 ? '+' : ''}{hoverData.delta} vs {hoverData.opponent}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const handleMouseMove = (e) => {
    const rect = e.target.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    
    // Find closest point index based on mouse X
    // points[i][0] is the x coordinate
    // Since X is linear, we can calculate index directly
    const percent = Math.max(0, Math.min(1, mouseX / rect.width));
    const index = Math.round(percent * (data.length - 1));
    
    if (data[index] && points[index]) {
      setHoverData({
        ...data[index],
        x: points[index][0],
        y: points[index][1]
      });
    }
  };

  return (
    <div className="insane-card graph-panel">
      <div className="card-header">
        Rating History
        <div className="live-tag">LIVE</div>
      </div>
      
      <div 
        className="graph-container" 
        onMouseMove={handleMouseMove} 
        onMouseLeave={() => setHoverData(null)}
      >
        <svg viewBox={`0 -10 ${width} ${height + 20}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradientFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          
          {/* Dashed Center Line */}
          <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="var(--panel-border)" strokeDasharray="6,6" />

          {/* Area Fill */}
          <path d={areaPath} fill="url(#gradientFill)" />
          
          {/* Main Line */}
          <path 
            d={path} 
            fill="none" 
            stroke="var(--accent-primary)" 
            strokeWidth="3" 
            strokeLinecap="round" 
            filter="url(#glow)"
          />

          {/* Hover Indicator */}
          {hoverData && (
            <>
              <line 
                x1={hoverData.x} y1="0" x2={hoverData.x} y2={height} 
                stroke="rgba(255,255,255,0.15)" strokeWidth="1" 
              />
              <circle 
                cx={hoverData.x} 
                cy={hoverData.y} 
                r="6" 
                fill="var(--bg-primary)" 
                stroke="#fff" 
                strokeWidth="2" 
              />
            </>
          )}
        </svg>

        {/* Floating Tooltip */}
        {hoverData && (
          <div 
            className="graph-tooltip"
            style={{ 
              left: `${(hoverData.x / width) * 100}%`,
              // Keep tooltip mostly fixed vertically or follow y? Fixed usually cleaner.
              top: '0%' 
            }}
          >
            <div className="tooltip-header">{new Date(hoverData.date).toLocaleDateString()}</div>
            <div className="tooltip-elo">{hoverData.elo}</div>
            <div className={`tooltip-delta ${hoverData.delta >= 0 ? 'pos' : 'neg'}`}>
              {hoverData.delta > 0 ? '+' : ''}{hoverData.delta} vs {hoverData.opponent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecentMatches({ games, userId }) {
  return (
    <div className="insane-card history-panel">
      <div className="card-header">Recent Battles</div>
      <div className="matches-list">
        {games.slice(0, 8).map((game) => {
          const result = game.status === "DRAW" ? "draw" : game.winner?._id === userId ? "win" : "loss";
          const opponent = game.players.find(p => p._id !== userId)?.username || "Unknown";
          
          return (
            <div key={game._id} className={`match-row ${result}`}>
              <div className="match-indicator"></div>
              <div className="match-info">
                <div className="match-res">{result.toUpperCase()}</div>
                <div className="match-vs">vs {opponent}</div>
              </div>
              <div className="match-meta">
                <div className="match-mode">{game.timeControl}</div>
              </div>
            </div>
          );
        })}
        {games.length === 0 && <div className="no-games">No matches recorded yet.</div>}
      </div>
    </div>
  );
}

// =======================
// MAIN PAGE
// =======================

function ProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Ensure you have this backend route
    axios.get(`/api/users/profile/${username}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [username]);

  if (loading) return (
    <div className="page-loader">
      <div className="spinner"></div>
    </div>
  );
  
  if (!data) return <div className="error-state">Player profile not found.</div>;

  const { user, games } = data;
  const wins = user.wins || 0;
  const losses = user.losses || 0;
  const draws = user.draws || 0;
  const total = wins + losses + draws;
  const winRate = total ? Math.round((wins / total) * 100) : 0;
  
  const stats = { wins, losses, draws, total, winRate };
  
  // Logic: 
  // 1. Pass 'games' (which is usually sorted Newest -> Oldest from DB)
  // 2. Pass 'user.elo' (current rating)
  // 3. 'timeline' returns [Oldest Game, ..., Newest Game]
  const timeline = generateEloTimeline(games, user.elo, user._id);

  return (
    <div className="profile-page-v2">
      <ProfileHero user={user} stats={stats} />
      
      <div className="profile-grid">
        <div className="main-col">
          <SmoothGraph data={timeline} />
        </div>
        <div className="side-col">
          <RecentMatches games={games} userId={user._id} />
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;