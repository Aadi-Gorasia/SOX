// src/components/GameReview/GameReview.jsx
// Drop this on your post-game screen or as a route /review/:gameId

import { useState, useEffect, useCallback } from 'react';
import './GameReview.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Convert engine index (0-80) back to { macroRow, macroCol, cellRow, cellCol }
function fromEngineIdx(idx) {
  const macro = Math.floor(idx / 9);
  const cell  = idx % 9;
  return {
    macroRow: Math.floor(macro / 3),
    macroCol: macro % 3,
    cellRow:  Math.floor(cell / 3),
    cellCol:  cell % 3,
  };
}

function moveQuality(ann) {
  if (!ann || ann.error)    return { label: '?',           cls: 'unknown' };
  if (ann.blunder)          return { label: 'BLUNDER ??',  cls: 'blunder' };
  if (ann.mistake)          return { label: 'MISTAKE ?',   cls: 'mistake' };
  if (ann.inaccuracy)       return { label: 'INACCURACY ⁉', cls: 'inaccuracy' };
  if (ann.isEnginePick)     return { label: 'BEST MOVE ✓', cls: 'best' };
  return                           { label: 'GOOD',        cls: 'good' };
}

function formatScore(score) {
  if (score == null) return '—';
  if (score >  9000) return 'X winning';
  if (score < -9000) return 'O winning';
  const v = (score / 100).toFixed(2);
  return score >= 0 ? `+${v}` : `${v}`;
}

// ── Mini board (read-only replay board) ──────────────────────────────────────
function MiniBoard({ moves, highlightIdx, bestMoveIdx }) {
  // Replay moves up to current point to build board state
  const board = Array(81).fill(null); // null | 'X' | 'O'
  moves.forEach((m, i) => { board[m.idx] = m.side === 0 ? 'X' : 'O'; });

  const cells = Array.from({ length: 9 }, (_, macroRow) =>
    Array.from({ length: 9 }, (_, macroCol) => {
      const macro = macroRow * 3 + macroCol;
      return Array.from({ length: 9 }, (_, cellRow) =>
        Array.from({ length: 9 }, (_, cellCol) => {
          const cell    = cellRow * 3 + cellCol;
          const idx     = macro * 9 + cell;
          const piece   = board[idx];
          const isLast  = idx === highlightIdx;
          const isBest  = idx === bestMoveIdx && bestMoveIdx !== highlightIdx;
          return { idx, piece, isLast, isBest, cellRow, cellCol };
        })
      ).flat();
    })
  ).flat();

  return (
    <div className="mini-board">
      {Array.from({ length: 9 }, (_, m) => (
        <div key={m} className="mini-macro">
          {Array.from({ length: 9 }, (_, c) => {
            const idx   = m * 9 + c;
            const piece = board[idx];
            const isLast = idx === highlightIdx;
            const isBest = idx === bestMoveIdx && bestMoveIdx !== highlightIdx;
            return (
              <div
                key={c}
                className={[
                  'mini-cell',
                  piece ? `mini-cell--${piece.toLowerCase()}` : '',
                  isLast ? 'mini-cell--last' : '',
                  isBest ? 'mini-cell--best' : '',
                ].join(' ')}
              >
                {piece}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GameReview({ gameId, token }) {
  const [game,        setGame]        = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [current,     setCurrent]     = useState(0); // current move index

  // Fetch game + trigger review
  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    setError(null);

    // First fetch the game itself
    fetch(`/api/games/${gameId}`, {
      headers: { 'x-auth-token': token }
    })
      .then(r => r.json())
      .then(g => {
        setGame(g);
        // Then fetch review (may take time on first run)
        return fetch(`/api/games/${gameId}/review`, {
          headers: { 'x-auth-token': token }
        });
      })
      .then(r => r.json())
      .then(data => {
        setAnnotations(data.annotations || []);
        setSummary(data.reviewSummary || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [gameId, token]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowLeft')  setCurrent(c => Math.max(0, c - 1));
      if (e.key === 'ArrowRight') setCurrent(c => Math.min((annotations.length - 1), c + 1));
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [annotations.length]);

  if (loading) return (
    <div className="review-loading">
      <div className="review-loading__bar" />
      <p>ENGINE ANALYZING GAME</p>
      <p className="review-loading__sub">~{game?.moves?.length || '?'} positions · may take a minute</p>
    </div>
  );

  if (error) return (
    <div className="review-error">
      <p>ENGINE ERROR</p>
      <code>{error}</code>
    </div>
  );

  const ann     = annotations[current] || null;
  const quality = moveQuality(ann);

  // Moves played up to and including current annotation
  const movesUpTo = game?.moves?.slice(0, current + 1) || [];

  return (
    <div className="game-review">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="review-header">
        <div className="review-header__title">GAME REVIEW</div>
        {game && (
          <div className="review-header__players">
            <span className="review-header__x">{game.players?.[0]?.username || 'X'}</span>
            <span className="review-header__vs">vs</span>
            <span className="review-header__o">{game.players?.[1]?.username || 'O'}</span>
          </div>
        )}
      </div>

      {/* ── Summary bar ────────────────────────────────────────────────────── */}
      {summary && (
        <div className="review-summary">
          <div className="review-summary__stat">
            <span className="review-summary__num">{summary.accuracy ?? '—'}%</span>
            <span className="review-summary__lbl">ACCURACY</span>
          </div>
          <div className="review-summary__stat review-summary__stat--blunder">
            <span className="review-summary__num">{summary.blunders?.length ?? 0}</span>
            <span className="review-summary__lbl">BLUNDERS</span>
          </div>
          <div className="review-summary__stat review-summary__stat--mistake">
            <span className="review-summary__num">{summary.mistakes?.length ?? 0}</span>
            <span className="review-summary__lbl">MISTAKES</span>
          </div>
          <div className="review-summary__stat review-summary__stat--inaccuracy">
            <span className="review-summary__num">{summary.inaccuracies?.length ?? 0}</span>
            <span className="review-summary__lbl">INACCURACIES</span>
          </div>
        </div>
      )}

      {/* ── Main panel ─────────────────────────────────────────────────────── */}
      <div className="review-main">

        {/* Board replay */}
        <div className="review-board-wrap">
          <MiniBoard
            moves={movesUpTo}
            highlightIdx={ann?.idx}
            bestMoveIdx={ann?.isEnginePick ? null : ann?.bestMove}
          />
        </div>

        {/* Annotation panel */}
        <div className="review-panel">
          {/* Move quality badge */}
          <div className={`review-quality review-quality--${quality.cls}`}>
            {quality.label}
          </div>

          {/* Score */}
          <div className="review-score">
            <span className="review-score__lbl">EVAL</span>
            <span className="review-score__val">{formatScore(ann?.score)}</span>
          </div>

          {/* Best move hint */}
          {ann && !ann.isEnginePick && ann.bestMove != null && (
            <div className="review-hint">
              <span className="review-hint__lbl">BEST WAS</span>
              <span className="review-hint__idx">Square {ann.bestMove}</span>
            </div>
          )}

          {/* Navigation */}
          <div className="review-nav">
            <button onClick={() => setCurrent(0)}                                 className="review-nav__btn">⏮</button>
            <button onClick={() => setCurrent(c => Math.max(0, c - 1))}           className="review-nav__btn">◀</button>
            <span className="review-nav__counter">
              {current + 1} / {annotations.length}
            </span>
            <button onClick={() => setCurrent(c => Math.min(annotations.length - 1, c + 1))} className="review-nav__btn">▶</button>
            <button onClick={() => setCurrent(annotations.length - 1)}            className="review-nav__btn">⏭</button>
          </div>

          <p className="review-nav__tip">← → arrow keys to navigate</p>
        </div>
      </div>

      {/* ── Move list ──────────────────────────────────────────────────────── */}
      <div className="review-movelist">
        {annotations.map((a, i) => {
          const q = moveQuality(a);
          return (
            <button
              key={i}
              className={[
                'review-movelist__item',
                `review-movelist__item--${q.cls}`,
                i === current ? 'review-movelist__item--active' : '',
              ].join(' ')}
              onClick={() => setCurrent(i)}
            >
              <span className="review-movelist__num">{i + 1}</span>
              <span className="review-movelist__side">{a.idx != null && (i % 2 === 0 ? 'X' : 'O')}</span>
              <span className="review-movelist__sq">sq{a.idx}</span>
              <span className="review-movelist__badge">{q.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

    </div>
  );
}