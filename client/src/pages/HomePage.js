import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import DisplayBoard from '../components/DisplayBoard';
import InteractiveBG from '../components/InteractiveBG';
import './HomePage.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

const HomePage = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState('loading');
  const [apiStatus, setApiStatus] = useState('checking');
  const primaryPath = isAuthenticated ? '/dashboard' : '/register';
  const primaryLabel = isAuthenticated ? 'Go to dashboard' : 'Create your free account';

  useEffect(() => {
    let active = true;
    axios.get(`${API_BASE}/api/games/leaderboard`)
      .then(response => {
        const entries = Array.isArray(response.data)
          ? response.data
          : (response.data.leaderboard || []);
        if (active) {
          setLeaderboard(entries.slice(0, 5));
          setLeaderboardStatus('ready');
        }
      })
      .catch(error => {
        console.error('Public leaderboard fetch failed:', error);
        if (active) setLeaderboardStatus('error');
      });

    axios.get(`${API_BASE}/health`)
      .then(response => {
        if (active) {
          setApiStatus(response.data.status === 'ok' ? 'online' : 'unavailable');
        }
      })
      .catch(error => {
        console.error('Public API health check failed:', error);
        if (active) setApiStatus('unavailable');
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="hp-root">
      <InteractiveBG />

      <div className="hp-ui-layer">
        <header className="hp-section hp-hero">
          <div className="hp-hero-content">
            <div className="hp-badge hp-mono">
              <span className="hp-dot" />
              Ultimate tic-tac-toe · Free to play
            </div>
            <h1 className="hp-title">
              EVERY MOVE
              <br />
              SHAPES THE
              <br />
              <span className="text-crimson">WHOLE BOARD</span>
            </h1>
            <p className="hp-desc">
              A strategy game played across nine boards. Every square you choose sends
              your opponent to their next board.
            </p>
            <div className="hp-hero-btns">
              <Link to={primaryPath} className="hp-btn-crimson">{primaryLabel}</Link>
              <a href="#rules" className="hp-btn-outline">How to play</a>
            </div>
            <p className="hp-signin-prompt">
              {isAuthenticated ? (
                <>Ready for a match? <Link to="/play">Choose a game mode</Link>.</>
              ) : (
                <>Already have an account? <Link to="/login">Sign in</Link>.</>
              )}
            </p>
          </div>
          <div className="hp-hero-visual" aria-label="Ultimate tic-tac-toe board preview">
            <div className="hp-board-label hp-mono">THE 9 × 9 BATTLEFIELD</div>
            <div className="hp-monolith-frame">
              <DisplayBoard />
            </div>
            <div className="hp-board-caption hp-mono">
              WIN THREE SMALL BOARDS IN A ROW TO WIN THE MATCH
            </div>
          </div>
        </header>

        <section id="rules" className="hp-section hp-rules">
          <div className="hp-section-header">
            <span className="hp-mono text-sulfur">A QUICK INTRODUCTION</span>
            <h2 className="hp-section-title">Easy to learn. Hard to master.</h2>
            <p className="hp-section-copy">
              It starts like tic-tac-toe, but each move decides where the next one can happen.
            </p>
          </div>
          <div className="hp-rules-grid">
            <article className="hp-rule-card">
              <div className="hp-rule-num">01</div>
              <h3>Play a small board</h3>
              <p>Each of the nine squares contains its own tic-tac-toe game.</p>
            </article>
            <article className="hp-rule-card active-crimson">
              <div className="hp-rule-num">02</div>
              <h3>Send your opponent</h3>
              <p>The square you play in sends your opponent to the matching small board.</p>
            </article>
            <article className="hp-rule-card active-sulfur">
              <div className="hp-rule-num">03</div>
              <h3>Win the big board</h3>
              <p>Claim three small boards in a row to take the match.</p>
            </article>
          </div>
        </section>

        <section className="hp-section hp-depth">
          <div className="hp-depth-grid">
            <div className="hp-depth-text">
              <span className="hp-mono text-crimson">PLAN AHEAD</span>
              <h2 className="hp-section-title">One move.<br />Two decisions.</h2>
              <p className="hp-desc">
                Choose where to make your mark—and where your opponent has to respond.
                Turn that constraint into a plan for the whole board.
              </p>
              <ul className="hp-feature-list">
                <li>Control the next board your opponent can play</li>
                <li>Set up wins across multiple small boards</li>
                <li>Review completed matches move by move</li>
              </ul>
            </div>
            <div className="hp-radar-ui">
              <img src="/gameplay.png" alt="A match in progress on the SOX game board" />
            </div>
          </div>
        </section>

        <section id="rankings" className="hp-section hp-rankings">
          <div className="hp-section-header hp-section-header--row">
            <div>
              <span className="hp-mono text-silver">THE COMMUNITY</span>
              <h2 className="hp-section-title">Top players</h2>
            </div>
            <div className={`hp-api-status hp-api-status--${apiStatus}`} role="status">
              <span className="hp-dot" />
              {apiStatus === 'online' ? 'Game service online' : apiStatus === 'unavailable' ? 'Game service unavailable' : 'Checking game service'}
            </div>
          </div>
          <div className="hp-table-container" aria-live="polite">
            {leaderboardStatus === 'loading' && (
              <p className="hp-table-message">Loading current rankings…</p>
            )}
            {leaderboardStatus === 'error' && (
              <p className="hp-table-message" role="alert">Rankings are temporarily unavailable. Please try again later.</p>
            )}
            {leaderboardStatus === 'ready' && leaderboard.length === 0 && (
              <p className="hp-table-message">No ranked players yet. Be the first to join.</p>
            )}
            {leaderboardStatus === 'ready' && leaderboard.map((player, index) => (
              <div key={player._id || player.username} className="hp-table-row">
                <span className="hp-table-rank">{String(index + 1).padStart(2, '0')}</span>
                <span className="hp-table-name">{player.username || 'Player'}</span>
                <span className="hp-table-elo">
                  {Number.isFinite(Number(player.elo)) ? Number(player.elo) : '—'}
                  <span className="hp-mono hp-table-elo-label"> ELO</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="hp-section hp-features">
          <div className="hp-section-header">
            <span className="hp-mono text-sulfur">BUILT FOR YOUR NEXT MATCH</span>
            <h2 className="hp-section-title">Play. Improve. Repeat.</h2>
          </div>
          <div className="hp-feature-grid">
            <article className="hp-feature-card">
              <h3>Ranked matches</h3>
              <p>Find an opponent, play a full match, and build your rating.</p>
            </article>
            <article className="hp-feature-card">
              <h3>Game review</h3>
              <p>Replay completed games and explore stronger moves with engine analysis.</p>
            </article>
            <article className="hp-feature-card">
              <h3>Puzzle practice</h3>
              <p>Work through tactical positions and track your puzzle rating.</p>
            </article>
          </div>
        </section>

        <section className="hp-section hp-cta-void">
          <div className="hp-cta-content">
            <span className="hp-mono text-sulfur">{isAuthenticated ? 'YOUR NEXT MATCH IS READY' : 'YOUR FIRST MATCH STARTS HERE'}</span>
            <h2 className="hp-cta-title">Ready to play?</h2>
            <Link to={primaryPath} className="hp-btn-massive">{primaryLabel}</Link>
          </div>
        </section>

        <footer className="hp-footer">
          <div className="hp-footer-top">
            <div className="hp-footer-brand">
              <div className="hp-logo-large">SO<span className="text-sulfur">X</span></div>
              <p>A strategy game of nine boards and one big decision.</p>
            </div>
            <nav className="hp-footer-links" aria-label="Footer">
              <a href="#rules">How to play</a>
              <a href="#rankings">Top players</a>
              {isAuthenticated
                ? <Link to="/dashboard">Dashboard</Link>
                : <Link to="/login">Sign in</Link>}
            </nav>
          </div>
          <div className="hp-footer-bottom">
            <span>© {new Date().getFullYear()} SOX</span>
            <span>Ultimate tic-tac-toe, made for thoughtful play.</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default HomePage;
