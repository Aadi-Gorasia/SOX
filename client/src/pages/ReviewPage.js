// client/src/pages/ReviewPage.jsx
import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import './ReviewPage.css';

// ── Helpers ────────────────────────────────────────────────────────────────────
function buildBoard(moves) {
  // moves = [{ idx, side }, ...]
  const board = Array(81).fill(null);
  moves.forEach(m => { board[m.idx] = m.side === 0 ? 'X' : 'O'; });
  return board;
}

function moveQuality(ann) {
  if (!ann || ann.error)  return { label: '?',            cls: 'unknown',    symbol: '?' };
  if (ann.blunder)        return { label: 'BLUNDER',      cls: 'blunder',    symbol: '??' };
  if (ann.mistake)        return { label: 'MISTAKE',      cls: 'mistake',    symbol: '?' };
  if (ann.inaccuracy)     return { label: 'INACCURACY',   cls: 'inaccuracy', symbol: '⁉' };
  if (ann.isEnginePick)   return { label: 'BEST MOVE',    cls: 'best',       symbol: '✓' };
  return                         { label: 'GOOD',         cls: 'good',       symbol: '·' };
}

function formatScore(score) {
  if (score == null)   return '—';
  if (score >  9000)   return 'X winning';
  if (score < -9000)   return 'O winning';
  const v = (score / 100).toFixed(2);
  return score >= 0 ? `+${v}` : `${v}`;
}

// ── Mini replay board ──────────────────────────────────────────────────────────
function ReplayBoard({ moves, highlightIdx, bestMoveIdx }) {
  const board = buildBoard(moves);

  return (
    <div className="rp-board">
      {Array.from({ length: 81 }, (_, idx) => {
        const macro   = Math.floor(idx / 9);
        const cell    = idx % 9;
        const macroRow = Math.floor(macro / 3);
        const macroCol = macro % 3;
        const cellRow  = Math.floor(cell / 3);
        const cellCol  = cell % 3;
        const piece    = board[idx];
        const isLast   = idx === highlightIdx;
        const isBest   = idx === bestMoveIdx && bestMoveIdx !== highlightIdx;

        return (
          <div
            key={idx}
            className={[
              'rp-cell',
              piece    ? `rp-cell--${piece.toLowerCase()}` : '',
              isLast   ? 'rp-cell--last' : '',
              isBest   ? 'rp-cell--best' : '',
              cellCol === 2 && macroCol < 2 ? 'rp-cell--mbr' : '',
              cellRow === 2 && macroRow < 2 ? 'rp-cell--mbb' : '',
            ].join(' ')}
          >
            {piece}
          </div>
        );
      })}
    </div>
  );
}

// ── Eval bar ───────────────────────────────────────────────────────────────────
function EvalBar({ score, mateIn }) {
  let pct = 0.5;
  if (mateIn != null) {
    pct = mateIn > 0 ? 0.97 : 0.03;
  } else if (score != null) {
    const clamped = Math.max(-3000, Math.min(3000, score));
    pct = 1 / (1 + Math.exp(-0.003 * clamped));
    pct = Math.max(0.03, Math.min(0.97, pct));
  }

  return (
    <div className="rp-evalbar">
      <div className="rp-evalbar__o"  style={{ height: `${(1 - pct) * 100}%` }} />
      <div className="rp-evalbar__x"  style={{ height: `${pct * 100}%` }} />
      <div className="rp-evalbar__label rp-evalbar__label--top">O</div>
      <div className="rp-evalbar__label rp-evalbar__label--bot">X</div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function ReviewPage() {
  const { gameId }  = useParams();
  const { token }   = useContext(AuthContext);
  const navigate    = useNavigate();

  const [game,        setGame]        = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [status,      setStatus]      = useState('idle');   // idle | loading | done | error
  const [error,       setError]       = useState(null);
  const [current,     setCurrent]     = useState(0);

  // Fetch game metadata on mount
  useEffect(() => {
    fetch(`/api/games/${gameId}`, {
      headers: { 'x-auth-token': token }
    })
      .then(r => r.json())
      .then(g => setGame(g))
      .catch(err => setError(err.message));
  }, [gameId, token]);

  // Keyboard nav
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')
        setCurrent(c => Math.max(0, c - 1));
      if (e.key === 'ArrowRight')
        setCurrent(c => Math.min(annotations.length - 1, c + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [annotations.length]);

  // Trigger review on button click
  function requestReview() {
    setStatus('loading');
    setError(null);
    fetch(`/api/games/${gameId}/review`, {
      headers: { 'x-auth-token': token }
    })
      .then(r => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then(data => {
        setAnnotations(data.annotations || []);
        setSummary(data.reviewSummary   || null);
        setStatus('done');
      })
      .catch(err => {
        setError(err.message);
        setStatus('error');
      });
  }

  const ann       = annotations[current] || null;
  const quality   = moveQuality(ann);
  const movesUpTo = game?.moves?.slice(0, (current + 1)) || [];

  // ── IDLE — show "Request Review" screen ────────────────────────────────────
  if (status === 'idle') return (
    <div className="review-page">
      <div className="review-page__topbar">
        <button className="review-page__back" onClick={() => navigate(-1)}>← BACK</button>
        <span className="review-page__title">GAME REVIEW</span>
      </div>
      <div className="review-page__gate">
        <div className="review-page__gate-box">
          <div className="review-page__gate-label">SOX ENGINE</div>
          <h2 className="review-page__gate-heading">Analyze This Game</h2>
          <p className="review-page__gate-sub">
            The engine will evaluate every position and annotate
            blunders, mistakes, and best moves.
            {game?.moves?.length
              ? ` ${game.moves.length} moves to analyze.`
              : ''}
          </p>
          {game?.moves?.length === 0 && (
            <p className="review-page__gate-warn">
              No moves were recorded for this game.<br />
              Update your client to track moves before analysis is available.
            </p>
          )}
          <button
            className="review-page__gate-btn"
            onClick={requestReview}
            disabled={!game || game.moves?.length === 0}
          >
            ANALYZE GAME
          </button>
        </div>
      </div>
    </div>
  );

  // ── LOADING ────────────────────────────────────────────────────────────────
  if (status === 'loading') return (
    <div className="review-page">
      <div className="review-page__topbar">
        <span className="review-page__title">GAME REVIEW</span>
      </div>
      <div className="review-page__gate">
        <div className="review-page__gate-box">
          <div className="review-page__loading-bar">
            <div className="review-page__loading-fill" />
          </div>
          <p className="review-page__loading-txt">ENGINE ANALYZING…</p>
          <p className="review-page__loading-sub">
            Evaluating {game?.moves?.length || '?'} positions via SOX Engine on Render
          </p>
        </div>
      </div>
    </div>
  );

  // ── ERROR ──────────────────────────────────────────────────────────────────
  if (status === 'error') return (
    <div className="review-page">
      <div className="review-page__topbar">
        <button className="review-page__back" onClick={() => navigate(-1)}>← BACK</button>
        <span className="review-page__title">GAME REVIEW</span>
      </div>
      <div className="review-page__gate">
        <div className="review-page__gate-box review-page__gate-box--error">
          <p className="review-page__error-label">ENGINE ERROR</p>
          <code>{error}</code>
          <button className="review-page__gate-btn" onClick={requestReview}>
            RETRY
          </button>
        </div>
      </div>
    </div>
  );

  // ── DONE — full review UI ──────────────────────────────────────────────────
  return (
    <div className="review-page">

      {/* Top bar */}
      <div className="review-page__topbar">
        <button className="review-page__back" onClick={() => navigate(-1)}>← BACK</button>
        <span className="review-page__title">GAME REVIEW</span>
        {game && (
          <span className="review-page__players">
            <span className="review-page__px">{game.players?.[0]?.username || 'X'}</span>
            <span className="review-page__pvs"> vs </span>
            <span className="review-page__po">{game.players?.[1]?.username || 'O'}</span>
          </span>
        )}
        <button
          className="review-page__puzzle-btn"
          onClick={() => navigate(`/puzzles/${gameId}`)}
        >
          VIEW PUZZLES →
        </button>
      </div>

      {/* Summary bar */}
      {summary && (
        <div className="review-page__summary">
          {[
            { label: 'ACCURACY',     val: summary.accuracy != null ? `${summary.accuracy}%` : '—', cls: '' },
            { label: 'BLUNDERS',     val: summary.blunders?.length    ?? 0,  cls: 'blunder' },
            { label: 'MISTAKES',     val: summary.mistakes?.length    ?? 0,  cls: 'mistake' },
            { label: 'INACCURACIES', val: summary.inaccuracies?.length ?? 0, cls: 'inaccuracy' },
          ].map(({ label, val, cls }) => (
            <div key={label} className={`review-page__stat ${cls ? `review-page__stat--${cls}` : ''}`}>
              <span className="review-page__stat-num">{val}</span>
              <span className="review-page__stat-lbl">{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Main area */}
      <div className="review-page__main">

        {/* Eval bar */}
        <EvalBar score={ann?.score} mateIn={ann?.mateIn} />

        {/* Board */}
        <div className="review-page__board-wrap">
          <ReplayBoard
            moves={movesUpTo}
            highlightIdx={ann?.idx}
            bestMoveIdx={ann?.isEnginePick ? null : ann?.bestMove}
          />
        </div>

        {/* Annotation panel */}
        <div className="review-page__panel">

          <div className={`review-page__quality review-page__quality--${quality.cls}`}>
            <span className="review-page__quality-symbol">{quality.symbol}</span>
            <span className="review-page__quality-label">{quality.label}</span>
          </div>

          <div className="review-page__score">
            <span className="review-page__score-lbl">EVAL</span>
            <span className="review-page__score-val">{formatScore(ann?.score)}</span>
          </div>

          {ann && !ann.isEnginePick && ann.bestMove != null && (
            <div className="review-page__hint">
              <span className="review-page__hint-lbl">ENGINE PREFERRED</span>
              <span className="review-page__hint-val">Square {ann.bestMove}</span>
            </div>
          )}

          <div className="review-page__delta">
            {ann?.delta != null && (
              <>
                <span className="review-page__delta-lbl">DELTA</span>
                <span className={`review-page__delta-val ${ann.delta < 0 ? 'review-page__delta-val--neg' : ''}`}>
                  {ann.delta > 0 ? '+' : ''}{(ann.delta / 100).toFixed(2)}
                </span>
              </>
            )}
          </div>

          {/* Navigation */}
          <div className="review-page__nav">
            <button onClick={() => setCurrent(0)}                                        className="review-page__nav-btn">⏮</button>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))}                  className="review-page__nav-btn">◀</button>
            <span className="review-page__nav-counter">{current + 1} / {annotations.length}</span>
            <button onClick={() => setCurrent(c => Math.min(annotations.length-1, c+1))} className="review-page__nav-btn">▶</button>
            <button onClick={() => setCurrent(annotations.length - 1)}                   className="review-page__nav-btn">⏭</button>
          </div>
          <p className="review-page__nav-tip">← → arrow keys</p>
        </div>
      </div>

      {/* Move list */}
      <div className="review-page__movelist">
        {annotations.map((a, i) => {
          const q = moveQuality(a);
          const side = i % 2 === 0 ? 'X' : 'O';
          return (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={[
                'review-page__move',
                `review-page__move--${q.cls}`,
                i === current ? 'review-page__move--active' : '',
              ].join(' ')}
            >
              <span className="review-page__move-num">{i + 1}</span>
              <span className={`review-page__move-side review-page__move-side--${side.toLowerCase()}`}>{side}</span>
              <span className="review-page__move-sq">sq{a.idx}</span>
              <span className="review-page__move-sym">{q.symbol}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
