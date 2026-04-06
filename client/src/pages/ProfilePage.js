import React, { useState, useEffect, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import InteractiveBG from "../components/InteractiveBG";
import "./ProfilePage.css";

// =======================
// THE ANALYTICS ENGINE (Real Data Processing)
// =======================
const processTacticalData = (user, games) => {
  if (!games || games.length === 0) return null;

  const userId = user._id;
  const reversedGames = [...games].reverse(); // Oldest to Newest
  
  let currentElo = user.elo;
  let peakElo = user.elo;
  let winStreak = 0;
  let maxWinStreak = 0;
  let eloHistory = [];
  const opponents = {};

  // Walk through games to calculate history and streaks
  reversedGames.forEach((game) => {
    const isWin = game.winner?._id === userId;
    const isDraw = game.status === "DRAW";
    const opp = game.players.find(p => p._id !== userId);
    
    // Track Nemesis (Who beats you most?)
    if (!isWin && !isDraw && opp) {
      opponents[opp.username] = (opponents[opp.username] || 0) + 1;
    }

    // Dynamic Elo Delta (Simulated based on typical ELO logic)
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

    eloHistory.push({
      elo: currentElo,
      date: new Date(game.createdAt),
      result: isDraw ? "D" : isWin ? "W" : "L"
    });
  });

  const nemesis = Object.entries(opponents).sort((a, b) => b[1] - a[1])[0];
  const winRate = Math.round((user.wins / (user.wins + user.losses + user.draws || 1)) * 100);

  return {
    eloHistory,
    peakElo,
    maxWinStreak,
    nemesis: nemesis ? nemesis[0] : "NONE",
    winRate,
    recentForm: reversedGames.slice(-5).map(g => g.winner?._id === userId ? "W" : g.status === "DRAW" ? "D" : "L")
  };
};

function getSvgPath(points) {
  if (points.length === 0) return "";
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
  const W = 1000, H = 300;

  const graphData = useMemo(() => {
    if (!data || data.length < 2) return null;
    const elos = data.map(d => d.elo);
    const min = Math.min(...elos) - 20, max = Math.max(...elos) + 20;
    const range = max - min || 1;
    const points = data.map((d, i) => [ (i / (data.length - 1)) * W, H - ((d.elo - min) / range) * H ]);
    const path = getSvgPath(points);
    return { path, area: `${path} L ${W},${H} L 0,${H} Z`, points };
  }, [data]);

  if (!graphData) return <div className="pp-card hp-mono text-steel">INSUFFICIENT_DATA_FOR_GRAPH</div>;

  return (
    <div className="pp-card pp-graph-panel">
      <div className="pp-card-head hp-mono">
        <span>RATING_HISTORY_STREAMS</span>
        <span className="text-sulfur">● LIVE</span>
      </div>
      <div className="pp-graph-container" 
           onMouseMove={(e) => {
             const rect = e.currentTarget.getBoundingClientRect();
             const x = (e.clientX - rect.left) / rect.width * W;
             const idx = Math.round((x / W) * (data.length - 1));
             if (data[idx]) setHoverData({ ...data[idx], px: graphData.points[idx][0], py: graphData.points[idx][1] });
           }}
           onMouseLeave={() => setHoverData(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2E5BFF" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#2E5BFF" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={graphData.area} fill="url(#grad)" />
          <path d={graphData.path} fill="none" stroke="#2E5BFF" strokeWidth="3" />
          {hoverData && (
            <>
              <line x1={hoverData.px} y1="0" x2={hoverData.px} y2={H} stroke="rgba(255,255,255,0.1)" />
              <circle cx={hoverData.px} cy={hoverData.py} r="6" fill="#FFF" />
            </>
          )}
        </svg>
        {hoverData && (
          <div className="pp-graph-tooltip hp-mono" style={{ left: `${(hoverData.px/W)*100}%`, top: `${(hoverData.py/H)*100}%` }}>
            <div className="text-titanium">{hoverData.elo} ELO</div>
            <div className={hoverData.delta >= 0 ? "text-sulfur" : "text-crimson"}>
              {hoverData.delta > 0 ? "+" : ""}{hoverData.delta} vs {hoverData.opponent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function generateEloTimeline(games, finalElo, userId) {
  let currentElo = finalElo;
  const history = [];
  [...games].forEach((game) => {
    const result = game.status === "DRAW" ? "DRAW" : game.winner?._id === userId ? "WIN" : "LOSS";
    let delta = result === "WIN" ? 15 : result === "LOSS" ? -15 : 0;
    history.push({
      elo: currentElo,
      delta,
      date: new Date(game.createdAt),
      opponent: game.players.find((p) => p._id !== userId)?.username || "Unknown",
      result,
    });
    currentElo -= delta;
  });
  return history.reverse();
}

// =======================
// MAIN COMPONENT
// =======================

function ProfilePage() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${process.env.REACT_APP_API_URL}/api/users/profile/${username}`)
      .then(res => setData(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [username]);

  const analytics = useMemo(() => {
    if (!data) return null;
    return processTacticalData(data.user, data.games);
  }, [data]);

  if (loading) return <div className="loading-gate hp-mono">DECRYPTING_OPERATIVE_PROFILE...</div>;
  if (!data) return <div className="loading-gate hp-mono text-crimson">PROFILE_NOT_FOUND</div>;

  const { user, games } = data;

  const timeline = generateEloTimeline(games, user.elo, user._id);

  return (
    <div className="prof-root">
      <InteractiveBG />
      
      <div className="prof-container">
        {/* TOP NAVIGATION */}
        <header className="prof-header">
          <Link to="/" className="prof-back hp-mono">← TERMINATE_SESSION</Link>
          <div className="prof-breadcrumbs hp-mono">ROOT / OPERATIVES / {user.username.toUpperCase()}</div>
        </header>

        {/* 3-COLUMN DASHBOARD */}
        <div className="prof-grid">
          
          {/* COLUMN 1: IDENTITY & STATS */}
          <aside className="prof-col-side">
            <div className="prof-card prof-id-card">
              <div className="prof-avatar-box">
                <div className="prof-avatar-glow"></div>
                <div className="prof-avatar Archivo">{user.username[0]}</div>
              </div>
              <h1 className="prof-username Archivo">{user.username.toUpperCase()}</h1>
              <div className="prof-rank-tag hp-mono">LEVEL_0{Math.floor(user.elo / 500)}</div>
              
              <div className="prof-bio-data hp-mono">
                <div className="bio-row"><span>STATUS:</span> <span className="text-sulfur">ACTIVE</span></div>
                <div className="bio-row"><span>JOINED:</span> <span>{new Date(user.createdAt).toLocaleDateString()}</span></div>
                <div className="bio-row"><span>REGION:</span> <span>GLOBAL_CORE</span></div>
              </div>
            </div>

            <div className="prof-card mt-6">
              <div className="prof-card-label hp-mono">CORE_METRICS</div>
              <div className="prof-metric-grid">
                <div className="metric-item">
                  <span className="hp-mono text-silver">WIN_RATE</span>
                  <span className="metric-val Archivo text-sulfur">{analytics.winRate}%</span>
                </div>
                <div className="metric-item">
                  <span className="hp-mono text-silver">PEAK_ELO</span>
                  <span className="metric-val Archivo">{analytics.peakElo}</span>
                </div>
                <div className="metric-item">
                  <span className="hp-mono text-silver">W/L/D</span>
                  <span className="metric-val Archivo text-sm">{user.wins}/{user.losses}/{user.draws}</span>
                </div>
              </div>
            </div>
          </aside>

          {/* COLUMN 2: ELO GRAPH & LOGS */}
          <main className="prof-col-main">
            <div className="prof-card prof-graph-card">
              <div className="prof-card-label hp-mono text-titanium">ELO_TIMELINE_STREAMS</div>

            <ProfileGraph data={timeline} />
            
                <div className="graph-scanline"></div>
              <div className="graph-footer hp-mono">
                <span className="hp-mono text-titanium">START_RATING: 1000</span>
                <span className="hp-mono">CURRENT: {user.elo}</span>
              </div>
            </div>

            <div className="prof-card mt-6">
              <div className="prof-card-label hp-mono">TRANSACTION_LOGS (RECENT_GAMES)</div>
              <div className="prof-match-list">
                {games.slice(0, 10).map((g, i) => {
                  const isWin = g.winner?._id === user._id;
                  const isDraw = g.status === "DRAW";
                  return (
                    <div key={i} className={`prof-match-row ${isWin ? 'win' : isDraw ? 'draw' : 'loss'}`}>
                      <span className="hp-mono">{new Date(g.createdAt).toLocaleTimeString()}</span>
                      <span className="prof-match-opp Archivo">VS_{g.players.find(p => p._id !== user._id)?.username.toUpperCase()}</span>
                      <span className="prof-match-res hp-mono">{isWin ? 'VICTORY' : isDraw ? 'STALEMATE' : 'DEFEAT'}</span>
                      <span className="prof-match-delta Archivo">{isWin ? '+15' : isDraw ? '0' : '-15'}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </main>

          {/* COLUMN 3: DEEP ANALYSIS */}
          <aside className="prof-col-side">
            <div className="prof-card">
              <div className="prof-card-label hp-mono">BEHAVIORAL_ANALYSIS</div>
              <div className="prof-form-row">
                <span className="hp-mono text-silver">RECENT_FORM</span>
                <div className="form-dots">
                  {analytics.recentForm.map((f, i) => <div key={i} className={`form-dot ${f}`}></div>)}
                </div>
              </div>
              <div className="prof-analysis-box hp-mono">
                <div className="analysis-item">
                  <span>MAX_STREAK</span>
                  <span className="text-sulfur">{analytics.maxWinStreak}</span>
                </div>
                <div className="analysis-item">
                  <span>NEMESIS</span>
                  <span className="text-crimson">{analytics.nemesis.toUpperCase()}</span>
                </div>
                <div className="analysis-item">
                  <span>ELO_VELOCITY</span>
                  <span>{user.elo > 1000 ? 'POSITIVE' : 'STAGNANT'}</span>
                </div>
              </div>
            </div>

            <div className="prof-card mt-6">
              <div className="prof-card-label hp-mono">ACHIEVEMENT_UNLOCKED</div>
              <div className="prof-badges">
                {user.wins > 10 && <div className="prof-badge-icon" title="Deca-Winner">◈</div>}
                {analytics.maxWinStreak > 4 && <div className="prof-badge-icon text-sulfur" title="On Fire">🔥</div>}
                {user.elo > 1500 && <div className="prof-badge-icon text-cobalt" title="Elite Operative">▲</div>}
                <div className="prof-badge-icon locked">?</div>
                <div className="prof-badge-icon locked">?</div>
              </div>
            </div>

            <div className="prof-card mt-6 prof-sys-advisory">
              <div className="prof-card-label hp-mono text-crimson">SYSTEM_ADVISORY</div>
              <p className="hp-mono text-xs">
                // NEEDS WORK <br/>
                // Suggestion: NO RELAXING MEMORISE THOERY AND DON'T USE INTUITION
              </p>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}

export default ProfilePage;