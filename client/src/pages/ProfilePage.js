// client/src/pages/ProfilePage.js
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./ProfilePage.css";

// =======================
// Rank data + helpers
// =======================

const RANKS = [
  { name: "Bronze III", min: 500 },
  { name: "Bronze II", min: 600 },
  { name: "Bronze I", min: 700 },
  { name: "Silver III", min: 800 },
  { name: "Silver II", min: 900 },
  { name: "Silver I", min: 1000 },
  { name: "Gold III", min: 1100 },
  { name: "Gold II", min: 1200 },
  { name: "Gold I", min: 1300 },
  { name: "Platinum III", min: 1400 },
  { name: "Platinum II", min: 1500 },
  { name: "Platinum I", min: 1600 },
  { name: "Diamond III", min: 1700 },
  { name: "Diamond II", min: 1800 },
  { name: "Diamond I", min: 1900 },
  { name: "Immortal", min: 2000 },
  { name: "Radiant", min: 2300 },
];

function getRank(elo) {
  let current = RANKS[0];
  for (const r of RANKS) {
    if (elo >= r.min) current = r;
  }
  return current.name;
}

function getNextRankProgress(elo) {
  const currentIndex = RANKS.findIndex((r) => r.name === getRank(elo));
  const current = RANKS[currentIndex];
  const next = RANKS[currentIndex + 1] || null;

  if (!next) return 100;

  const range = next.min - current.min;
  const fill = ((elo - current.min) / range) * 100;

  return Math.max(3, Math.min(fill, 100));
}

// build fake Elo history from games
function generateEloTimeline(games, finalElo) {
  let elo = finalElo;
  const history = [];

  [...games].reverse().forEach((game, index) => {
    const result =
      game.status === "DRAW"
        ? "DRAW"
        : game.winner?._id === game.userId
        ? "WIN"
        : "LOSS";

    const delta =
      result === "WIN"
        ? Math.floor(Math.random() * 6 + 6)
        : result === "LOSS"
        ? -Math.floor(Math.random() * 6 + 4)
        : Math.floor(Math.random() * 2);

    history.push({
      elo,
      delta,
      index: history.length + 1,
      date: new Date(game.createdAt),
      opponent: game.players.find((p) => p._id !== game.userId)?.username,
      timeControl: game.timeControl,
      result,
    });

    elo -= delta;
  });

  return history.reverse();
}

// =======================
// Subcomponents
// =======================

function HeroCard({ user, wins, losses, draws, winRate }) {
  const rankName = getRank(user.elo);
  const rankProgress = getNextRankProgress(user.elo);

  return (
    <section className="panel-card hero-card">
      <div className="hero-left">
        <div className="hero-heading">
          <div className="hero-avatar">
            <span className="hero-avatar-initial">
              {user.username?.[0]?.toUpperCase() || "P"}
            </span>
          </div>
          <div className="hero-title-block">
            <h1 className="hero-name">{user.username}</h1>
            <div className="hero-pill-row">
              <span className="hero-tag">PLAYER PROFILE</span>
              <span className="hero-tag ghost-tag">
                {wins + losses + draws} games
              </span>
            </div>
          </div>
        </div>

        <p className="hero-rating">
          Rating <span>{user.elo}</span>
        </p>

        <div className="hero-stats-row">
          <div className="hero-stat stat-pill">
            <span>{wins}</span>
            <label>Wins</label>
          </div>
          <div className="hero-stat stat-pill">
            <span>{losses}</span>
            <label>Losses</label>
          </div>
          <div className="hero-stat stat-pill">
            <span>{draws}</span>
            <label>Draws</label>
          </div>
          <div className="hero-stat stat-pill">
            <span>{winRate}%</span>
            <label>Win Rate</label>
          </div>
        </div>
      </div>

      <div className="hero-right">
        <div className="rank-chip">Current rank</div>
        <div className="rank-badge">{rankName}</div>

        <div className="rank-ring">
          <svg viewBox="0 0 36 36">
            <path
              className="ring-bg"
              d="M18 2 a16 16 0 1 1 0 32 a16 16 0 1 1 0 -32"
            />
            <path
              className="ring-fill"
              strokeDasharray={`${rankProgress}, 100`}
              d="M18 2 a16 16 0 1 1 0 32 a16 16 0 1 1 0 -32"
            />
          </svg>
          <p className="rank-progress">{Math.round(rankProgress)}%</p>
        </div>

        <div className="hero-rank-meta">
          <span className="hero-rank-label">Next rank in</span>
          <span className="hero-rank-value">
            {Math.max(0, 100 - Math.round(rankProgress))}% XP
          </span>
        </div>
      </div>
    </section>
  );
}

function EloPanel({ eloTimeline }) {
  const [range, setRange] = useState("RECENT"); // RECENT, MONTH, ALL
  const [hoverIndex, setHoverIndex] = useState(
    eloTimeline && eloTimeline.length > 0 ? eloTimeline.length - 1 : 0
  );

  if (!eloTimeline || eloTimeline.length === 0) {
    return (
      <section className="panel-card graph-card">
        <div className="panel-header">
          <h2 className="section-title">// Rating progression //</h2>
          <span className="section-subtitle">
            Play a few rated games to see your graph.
          </span>
        </div>
        <p className="empty-state">No games recorded yet.</p>
      </section>
    );
  }

  const total = eloTimeline.length;

  const rangeMap = {
    RECENT: Math.min(10, total),
    MONTH: Math.min(30, total),
    ALL: total,
  };

  const sliceSize = rangeMap[range] || total;
  const startIndex = Math.max(0, total - sliceSize);
  const displayed = eloTimeline.slice(startIndex);

  const maxElo = Math.max(...displayed.map((e) => e.elo));
  const minElo = Math.min(...displayed.map((e) => e.elo));
  const span = maxElo - minElo || 1;

  const lastIndex = total - 1;
  const effectiveHoverIndex =
    hoverIndex < startIndex || hoverIndex > lastIndex
      ? lastIndex
      : hoverIndex;

  const localHoverIndex = effectiveHoverIndex - startIndex;
  const hoverEntry = displayed[localHoverIndex] || displayed[displayed.length - 1];

  const points = displayed
    .map((entry, i) => {
      const x = (i / (displayed.length - 1 || 1)) * 100;
      const y = 100 - ((entry.elo - minElo) / span) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  const cursorX =
    (localHoverIndex / (displayed.length - 1 || 1)) * 100;
  const cursorY =
    100 - ((hoverEntry.elo - minElo) / span) * 100;

  return (
    <section className="panel-card graph-card">
      <div className="panel-header graph-header">
        <div>
          <h2 className="section-title">// Rating graph //</h2>
          <span className="section-subtitle">
            Track your climb and hover for details
          </span>
        </div>
        <div className="graph-range-toggle">
          {["RECENT", "MONTH", "ALL"].map((key) => (
            <button
              key={key}
              type="button"
              className={`range-pill ${
                range === key ? "range-pill-active" : ""
              }`}
              onClick={() => setRange(key)}
            >
              {key === "RECENT"
                ? "Last 10"
                : key === "MONTH"
                ? "Last 30"
                : "All"}
            </button>
          ))}
        </div>
      </div>

      <div className="graph-container">
        <svg
          className="elo-graph"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {/* grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              className="graph-grid-line"
            />
          ))}

          {/* under-area polygon */}
          {displayed.length > 0 && (
            <polygon
              className="elo-area"
              points={`0,100 ${points} 100,100`}
            />
          )}

          {/* base line */}
          <polyline points={points} className="elo-line" />

          {/* animated highlight line */}
          <polyline points={points} className="elo-line-anim" />

          {/* cursor vertical line */}
          <line
            x1={cursorX}
            y1="0"
            x2={cursorX}
            y2="100"
            className="elo-cursor"
          />

          {/* data points */}
          {displayed.map((entry, i) => {
            const x = (i / (displayed.length - 1 || 1)) * 100;
            const y =
              100 - ((entry.elo - minElo) / span) * 100;

            const isActive = i === localHoverIndex;

            return (
              <circle
                key={entry.index}
                cx={x}
                cy={y}
                r={isActive ? 2.5 : 1.6}
                className={`elo-point ${
                  isActive ? "elo-point-active" : ""
                }`}
                onMouseEnter={() =>
                  setHoverIndex(startIndex + i)
                }
              />
            );
          })}
        </svg>

        {/* tooltip-ish label in corner */}
        <div className="graph-floating-label">
          <div className="graph-floating-rating">
            {hoverEntry.elo}
            <span>ELO</span>
          </div>
          <div className="graph-floating-meta">
            <span>
              {hoverEntry.result === "WIN"
                ? "Win"
                : hoverEntry.result === "LOSS"
                ? "Loss"
                : "Draw"}{" "}
              vs {hoverEntry.opponent || "Unknown"}
            </span>
            <span>
              Δ {hoverEntry.delta > 0 ? "+" : ""}
              {hoverEntry.delta} · {hoverEntry.timeControl}
            </span>
            <span>
              {hoverEntry.date.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      <div className="graph-footer-legend">
        <div className="legend-item">
          <span className="legend-dot legend-dot-win" />
          <span>Win</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-dot-loss" />
          <span>Loss</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot legend-dot-draw" />
          <span>Draw</span>
        </div>

        <div className="graph-footer-stats">
          <span>
            Peak:{" "}
            <strong>
              {Math.max(...eloTimeline.map((e) => e.elo))}
            </strong>
          </span>
          <span>
            Games: <strong>{eloTimeline.length}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}

function WinLossDonut({ wins, losses, draws, winRate }) {
  const total = wins + losses + draws;
  const winDeg = total ? (wins / total) * 360 : 0;
  const lossDeg = total ? ((wins + losses) / total) * 360 : 0;

  return (
    <section className="panel-card donut-card">
      <div className="panel-header">
        <h2 className="section-title">Result breakdown</h2>
        <span className="section-subtitle">
          Wins, losses and draws as a share of all games
        </span>
      </div>

      <div className="donut-layout">
        <div className="donut-wrapper">
          <div
            className="donut"
            style={{
              background: total
                ? `conic-gradient(
                    #22c55e 0deg ${winDeg}deg,
                    #ef4444 ${winDeg}deg ${lossDeg}deg,
                    #e5e7eb ${lossDeg}deg 360deg
                  )`
                : "radial-gradient(circle at 30% 30%, #1f2937, #020617)",
            }}
          />
          <div className="donut-center">
            <span className="donut-center-value">
              {total ? `${winRate}%` : "--"}
            </span>
            <span className="donut-center-label">Win rate</span>
          </div>
        </div>

        <div className="donut-legend">
          <div className="donut-legend-row">
            <span className="donut-dot donut-dot-win" />
            <span>Wins</span>
            <span className="donut-count">
              {wins} ({total ? Math.round((wins / total) * 100) : 0}
              %)
            </span>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot donut-dot-loss" />
            <span>Losses</span>
            <span className="donut-count">
              {losses} (
              {total ? Math.round((losses / total) * 100) : 0}
              %)
            </span>
          </div>
          <div className="donut-legend-row">
            <span className="donut-dot donut-dot-draw" />
            <span>Draws</span>
            <span className="donut-count">
              {draws} (
              {total ? Math.round((draws / total) * 100) : 0}
              %)
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

function TimeControlBars({ games, totalGames }) {
  const timeControls = ["3+2", "5+0", "10+0"];

  return (
    <section className="panel-card bar-card">
      <div className="panel-header">
        <h2 className="section-title">Time control activity</h2>
        <span className="section-subtitle">
          Which modes you gravitate towards
        </span>
      </div>

      <div className="bar-list">
        {timeControls.map((tc) => {
          const count = games.filter(
            (g) => g.timeControl === tc
          ).length;
          const pct = totalGames ? (count / totalGames) * 100 : 0;

          return (
            <div className="bar-row" key={tc}>
              <span className="bar-label">{tc}</span>
              <div className="bar-track">
                <div
                  className="bar-fill"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="bar-count">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RecentMatches({ games, userId }) {
  return (
    <section className="panel-card recent-card">
      <div className="panel-header">
        <h2 className="section-title">// Recent battles //</h2>
        <span className="section-subtitle">
          Your last 12 games at a glance
        </span>
      </div>

      <div className="history-list">
        {games.slice(0, 12).map((g) => {
          const opp = g.players.find(
            (p) => p._id !== userId
          )?.username;
          const result =
            g.status === "DRAW"
              ? "DRAW"
              : g.winner?._id === userId
              ? "VICTORY"
              : "DEFEAT";

          return (
            <div
              className={`history-item ${result.toLowerCase()}`}
              key={g._id}
            >
              <span className="h-res">{result}</span>
              <span className="h-opp">
                vs {opp || "Unknown"}
              </span>
              <span className="h-mode">{g.timeControl}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

// =======================
// MAIN PAGE COMPONENT
// =======================

function ProfilePage() {
  const { username } = useParams();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await axios.get(
          `/api/users/profile/${username}`
        );
        if (!cancelled) {
          setProfileData(res.data);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [username]);

  if (loading || !profileData) {
    return (
      <div className="profile-loading">
        <div className="loader-orb" />
        <span>Loading profile...</span>
      </div>
    );
  }

  const { user, games } = profileData;
  const wins = user.wins;
  const losses = user.losses;
  const draws = user.draws;
  const total = wins + losses + draws;
  const winRate = total ? Math.round((wins / total) * 100) : 0;

  const eloTimeline = generateEloTimeline(
    games.map((g) => ({ ...g, userId: user._id })),
    user.elo
  );

  return (
    <main className="profile-page">
      <HeroCard
        user={user}
        wins={wins}
        losses={losses}
        draws={draws}
        winRate={winRate}
      />

      <div className="profile-grid">
        <div className="profile-main">
          <EloPanel eloTimeline={eloTimeline} />

          <div className="profile-main-lower">
            <WinLossDonut
              wins={wins}
              losses={losses}
              draws={draws}
              winRate={winRate}
            />
            <TimeControlBars
              games={games}
              totalGames={total}
            />
          </div>
        </div>

        <aside className="profile-side">
          <RecentMatches games={games} userId={user._id} />
        </aside>
      </div>
    </main>
  );
}

export default ProfilePage;
