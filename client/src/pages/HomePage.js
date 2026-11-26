import React, { useContext, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import EngineBoard from '../components/EngineBoard';
import { replay } from '../utils/engineView';
import './HomePage.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

const HomePage = () => {
  const { isAuthenticated } = useContext(AuthContext);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState('loading');
  const [step, setStep] = useState(1);
  const demoMoves = [40, 36, 4, 37, 13, 39];
  const demo = replay(demoMoves.slice(0, step));
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

    return () => { active = false; };
  }, []);

  return <main className="hp-root">
    <section className="hp-hero">
      <div className="hp-hero-copy">
        <span className="hp-eyebrow">SOX / Ultimate tic-tac-toe</span>
        <h1>Small boards.<br/>Big decisions.</h1>
        <p className="hp-lead">The square you choose decides where your opponent plays next. Nine boards, two players, and a different game every time.</p>
        <div className="hp-actions"><Link className="hp-primary" to={primaryPath}>{isAuthenticated ? 'Back to your games' : 'Start playing'} <span aria-hidden="true">↗</span></Link><a className="hp-secondary" href="#rules">Learn the rules</a></div>
        <p className="hp-footnote">Free to play. Ranked matches, friendly games, and computer opponents.</p>
      </div>
      <figure className="hp-demo">
        <div className="hp-demo-heading"><span>A move changes the whole game</span><span>{step} / {demoMoves.length}</span></div>
        <EngineBoard state={demo} playedMove={demoMoves[step - 1]}/>
        <figcaption aria-live="polite"><strong>{demo.turn} plays next.</strong> The outlined board is where they must go.</figcaption>
        <button className="hp-demo-next" onClick={() => setStep(step === demoMoves.length ? 1 : step + 1)}>{step === demoMoves.length ? 'Replay the sequence' : 'See the next move'} <span aria-hidden="true">→</span></button>
      </figure>
    </section>
    <section id="rules" className="hp-section">
      <div className="hp-section-heading"><span className="hp-eyebrow">The rules</span><h2>Familiar game. A new way to think.</h2></div>
      <div className="hp-rules-grid">{[
        ['01','Win a small board','Make a line of three marks to claim one of the nine small boards.'],
        ['02','Send the next move','Your square sends your opponent to the matching board. If that board is closed, they can choose any open board.'],
        ['03','Connect the big picture','Win three small boards in a row, column, or diagonal to win the match.']
      ].map(([number,title,copy]) => <article key={number}><span className="hp-rule-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div>
    </section>
    <section className="hp-section hp-practice">
      <div className="hp-section-heading"><span className="hp-eyebrow">Find your rhythm</span><h2>A good game deserves a second look.</h2><p>Play at your pace. Then see what you missed.</p></div>
      <div className="hp-paths">{[
        ['/play','01 / Play people','A friend or a fresh challenge','Choose a clock, share a private invite, or find a ranked opponent.'],
        ['/play/computer','02 / Play a computer','Meet Bob. Work your way up.','Six opponents, adjustable difficulty, and time to think between moves.'],
        ['/games/history','03 / Review and improve','Learn from the moves you made','Replay your games, explore alternatives, and find the turning points.']
      ].map(([path,label,title,copy]) => <Link key={path} to={isAuthenticated ? path : '/register'}><span className="hp-eyebrow">{label}</span><h3>{title}</h3><p>{copy}</p><span className="hp-path-arrow" aria-hidden="true">↗</span></Link>)}</div>
    </section>
    <section id="rankings" className="hp-section hp-rankings">
      <div className="hp-section-heading"><span className="hp-eyebrow">The players</span><h2>Climbing the board.</h2><p>The current ranked leaderboard.</p></div>
      <div className="hp-ranking-list" aria-live="polite">
        {leaderboardStatus === 'loading' && <p>Loading rankings…</p>}
        {leaderboardStatus === 'error' && <p role="status">Rankings are temporarily unavailable.</p>}
        {leaderboardStatus === 'ready' && !leaderboard.length && <p>Your first ranked game could start something.</p>}
        {leaderboardStatus === 'ready' && leaderboard.map((player,index) => <div className="hp-ranking-row" key={player._id || player.username}><span>{String(index+1).padStart(2,'0')}</span><strong>{player.username || 'Player'}</strong><span>{Number.isFinite(Number(player.elo)) ? Number(player.elo) : '—'} <small>Elo</small></span></div>)}
      </div>
    </section>
    <footer className="hp-footer"><Link to={primaryPath}>{primaryLabel} <span aria-hidden="true">→</span></Link><span>SOX · Nine boards. One game.</span><nav aria-label="Footer"><Link to="/terms">Terms</Link><Link to="/cookie-policy">Cookie policy</Link></nav></footer>
  </main>;
};
export default HomePage;
