import React, { useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Lightbulb,
  RotateCcw,
  Sparkles,
  Target
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import './ReviewPage.css';

const API_BASE = process.env.REACT_APP_API_URL || '';
const QUALITY = {
  brilliant: { label: 'Brilliant', symbol: '!!', tone: 'brilliant' },
  great: { label: 'Great', symbol: '!', tone: 'great' },
  best: { label: 'Best', symbol: '★', tone: 'best' },
  excellent: { label: 'Excellent', symbol: '✓', tone: 'excellent' },
  good: { label: 'Good', symbol: '✓', tone: 'good' },
  fine: { label: 'Fine', symbol: '·', tone: 'fine' },
  inaccuracy: { label: 'Inaccuracy', symbol: '?!', tone: 'inaccuracy' },
  mistake: { label: 'Mistake', symbol: '?', tone: 'mistake' },
  blunder: { label: 'Blunder', symbol: '??', tone: 'blunder' },
  miss: { label: 'Miss', symbol: '×', tone: 'miss' },
  unrated: { label: 'Unrated', symbol: '—', tone: 'unrated' }
};

function qualityFor(annotation) {
  if (annotation?.quality && QUALITY[annotation.quality]) {
    return QUALITY[annotation.quality];
  }
  if (annotation?.brilliant) return QUALITY.brilliant;
  if (annotation?.great) return QUALITY.great;
  if (annotation?.blunder) return QUALITY.blunder;
  if (annotation?.mistake) return QUALITY.mistake;
  if (annotation?.inaccuracy) return QUALITY.inaccuracy;
  if (annotation?.wasOptimal ?? annotation?.isEnginePick) return QUALITY.best;
  return QUALITY.good;
}

function buildBoard(moves = []) {
  const board = Array(81).fill(null);
  moves.forEach(move => {
    if (Number.isInteger(move.idx) && move.idx >= 0 && move.idx < 81) {
      board[move.idx] = move.side === 0 ? 'X' : 'O';
    }
  });
  return board;
}

function formatMove(index) {
  if (!Number.isInteger(index) || index < 0 || index > 80) return 'No legal move';
  const macro = Math.floor(index / 9);
  const cell = index % 9;
  const board = `${String.fromCharCode(65 + (macro % 3))}${Math.floor(macro / 3) + 1}`;
  const cells = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ];
  return `${board} · ${cells[cell]}`;
}

function ReplayBoard({ moves, playedMove, bestMove, showAfter }) {
  const board = buildBoard(moves);
  return (
    <div
      className="review-board"
      role="img"
      aria-label={`Ultimate tic-tac-toe position ${showAfter ? 'after' : 'before'} move ${playedMove + 1}`}
    >
      {Array.from({ length: 81 }, (_, index) => {
        const macro = Math.floor(index / 9);
        const cell = index % 9;
        const macroRow = Math.floor(macro / 3);
        const macroCol = macro % 3;
        const cellRow = Math.floor(cell / 3);
        const cellCol = cell % 3;
        const mark = board[index];
        const isPlayed = index === playedMove;
        const isBest = index === bestMove && index !== playedMove;
        return (
          <div
            key={index}
            className={[
              'review-board__cell',
              mark ? `review-board__cell--${mark.toLowerCase()}` : '',
              isPlayed ? 'review-board__cell--played' : '',
              isBest ? 'review-board__cell--best' : '',
              cellCol === 2 && macroCol < 2 ? 'review-board__cell--macro-right' : '',
              cellRow === 2 && macroRow < 2 ? 'review-board__cell--macro-bottom' : ''
            ].filter(Boolean).join(' ')}
          >
            {mark}
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value, tone = '' }) {
  return (
    <div className={`review-stat ${tone ? `review-stat--${tone}` : ''}`}>
      <span className="review-stat__value">{value}</span>
      <span className="review-stat__label">{label}</span>
    </div>
  );
}

export default function ReviewPage() {
  const { gameId } = useParams();
  const { token, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [game, setGame] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [gameLoading, setGameLoading] = useState(true);
  const [gameError, setGameError] = useState('');
  const [current, setCurrent] = useState(0);
  const [showAfter, setShowAfter] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const controller = new AbortController();
    setGameLoading(true);
    setGameError('');
    setGame(null);
    fetch(`${API_BASE}/api/games/${gameId}`, {
      headers: { 'x-auth-token': token },
      signal: controller.signal
    })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.msg || data.error || 'Unable to load this game.');
        return data;
      })
      .then(setGame)
      .catch(loadError => {
        if (loadError.name !== 'AbortError') setGameError(loadError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setGameLoading(false);
      });
    return () => controller.abort();
  }, [gameId, token]);

  useEffect(() => {
    const handleKeyDown = event => {
      if (event.target instanceof HTMLElement &&
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName)) return;
      if (event.key === 'ArrowLeft') setCurrent(index => Math.max(0, index - 1));
      if (event.key === 'ArrowRight') setCurrent(index => Math.min(annotations.length - 1, index + 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [annotations.length]);

  async function requestReview() {
    setStatus('loading');
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/games/${gameId}/review`, {
        headers: { 'x-auth-token': token }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.msg || data.error || `Server error ${response.status}`);
      const normalized = (data.annotations || []).map((annotation, index) => ({
        ...annotation,
        idx: annotation.idx ?? annotation.playedMove ?? game?.moves?.[index]?.idx,
        side: annotation.side ?? game?.moves?.[index]?.side ?? index % 2,
        bestMove: annotation.bestMove ?? annotation.optimalMove,
        quality: annotation.quality ?? (
          annotation.blunder ? 'blunder' :
            annotation.mistake ? 'mistake' :
              annotation.inaccuracy ? 'inaccuracy' :
                (annotation.wasOptimal ?? annotation.isEnginePick) ? 'best' : 'good'
        )
      }));
      setAnnotations(normalized);
      setSummary(data.reviewSummary || null);
      setCurrent(0);
      setShowAfter(false);
      setStatus('done');
    } catch (reviewError) {
      setError(reviewError.message);
      setStatus('error');
    }
  }

  const qualityCounts = useMemo(() => {
    const counts = Object.fromEntries(Object.keys(QUALITY).map(code => [code, 0]));
    annotations.forEach(annotation => {
      const code = qualityFor(annotation).tone;
      counts[code] = (counts[code] || 0) + 1;
    });
    return counts;
  }, [annotations]);
  const viewerIndex = game?.players?.findIndex(player =>
    String(player._id ?? player.id) === String(user?._id ?? user?.id)
  ) ?? -1;
  const viewerSide = viewerIndex === 1 ? 'O' : 'X';
  const viewerSummary = summary?.sideSummaries?.[viewerSide];
  const viewerQualityCounts = viewerSummary?.qualityCounts || qualityCounts;

  const visibleMoves = useMemo(() => annotations
    .map((annotation, index) => ({ annotation, index }))
    .filter(({ annotation }) => {
      const code = qualityFor(annotation).tone;
      if (filter === 'critical') return ['miss', 'blunder', 'mistake'].includes(code);
      if (filter === 'highlights') return ['brilliant', 'great', 'best'].includes(code);
      return true;
    }), [annotations, filter]);

  const annotation = annotations[current] || null;
  const quality = qualityFor(annotation);
  const movesBefore = game?.moves?.slice(0, current) || [];
  const boardMoves = showAfter
    ? game?.moves?.slice(0, current + 1) || []
    : movesBefore;
  const criticalMoments = annotations
    .map((move, index) => ({ move, index, quality: qualityFor(move) }))
    .filter(item => viewerIndex < 0 || (item.move.side === 1 ? 1 : 0) === viewerIndex)
    .filter(item => ['miss', 'blunder', 'mistake', 'inaccuracy'].includes(item.quality.tone))
    .slice(0, 3);

  if (gameLoading) {
    return (
      <div className="review-page">
        <div className="review-state-card">
          <span className="review-eyebrow">SOX GAME REVIEW</span>
          <div className="review-loader" />
          <h1>Loading your game</h1>
          <p>Getting the move record ready for analysis.</p>
        </div>
      </div>
    );
  }

  if (gameError || !game) {
    return (
      <div className="review-page">
        <button className="review-back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
        <div className="review-state-card review-state-card--error" role="alert">
          <AlertCircle size={25} />
          <h1>Couldn’t load this game</h1>
          <p>{gameError || 'The game is unavailable.'}</p>
        </div>
      </div>
    );
  }

  if (status !== 'done') {
    return (
      <div className="review-page">
        <header className="review-topbar">
          <button className="review-back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
          <span className="review-brand-mark">SOX <span>REVIEW</span></span>
        </header>
        <main className="review-state-card">
          <span className="review-eyebrow"><Sparkles size={14} /> GAME ANALYSIS</span>
          {status === 'loading' ? (
            <>
              <div className="review-loader" />
              <h1>Reviewing every move</h1>
              <p>Checking {game.moves?.length || 0} positions for strong ideas, missed chances, and turning points.</p>
            </>
          ) : status === 'error' ? (
            <>
              <AlertCircle size={28} className="review-state-card__error-icon" />
              <h1>Analysis couldn’t finish</h1>
              <p role="alert">{error}</p>
              <button className="review-primary-btn" onClick={requestReview}><RotateCcw size={16} /> Try again</button>
            </>
          ) : (
            <>
              <div className="review-state-card__icon"><Target size={25} /></div>
              <h1>See the story behind your game</h1>
              <p>
                Review every move, spot the turning points, and see a stronger continuation
                when there was one.
              </p>
              <div className="review-game-meta">
                <span>{game.players?.[0]?.username || 'X'} <b className="review-mark-x">X</b></span>
                <span className="review-game-meta__vs">VS</span>
                <span><b className="review-mark-o">O</b> {game.players?.[1]?.username || 'O'}</span>
                <span className="review-game-meta__moves">{game.moves?.length || 0} moves</span>
              </div>
              {gameError && <p className="review-inline-error" role="alert">{gameError}</p>}
              {(!game.moves || game.moves.length === 0) && (
                <p className="review-inline-error">No recorded moves are available for this game.</p>
              )}
              <button
                className="review-primary-btn"
                onClick={requestReview}
                disabled={!game.moves?.length}
              >
                <Sparkles size={16} /> Analyze game
              </button>
              <span className="review-state-card__note">Move grades are strategic estimates from the SOX game engine.</span>
            </>
          )}
        </main>
      </div>
    );
  }

  const summaryStats = [
    { label: 'Your accuracy', value: `${viewerSummary?.accuracy ?? summary?.accuracy ?? 0}%`, tone: 'accuracy' },
    { label: 'Your moves', value: viewerSummary?.movesReviewed ?? annotations.length },
    { label: 'Brilliant', value: viewerQualityCounts.brilliant || 0, tone: 'brilliant' },
    { label: 'Great + best', value: (viewerQualityCounts.great || 0) + (viewerQualityCounts.best || 0), tone: 'best' },
    { label: 'Mistakes', value: (viewerQualityCounts.mistake || 0) + (viewerQualityCounts.blunder || 0) + (viewerQualityCounts.miss || 0), tone: 'mistake' }
  ];
  const moveNo = annotation?.moveNumber ?? current + 1;
  const side = annotation?.side === 1 ? 'O' : 'X';
  const winnerId = game.winner?._id ?? game.winner?.id ?? game.winner;
  const gameOutcome = game.status === 'DRAW'
    ? 'Draw'
    : winnerId
      ? String(winnerId) === String(user?._id ?? user?.id) ? 'Victory' : 'Defeat'
      : 'Game complete';

  return (
    <div className="review-page">
      <header className="review-topbar">
        <button className="review-back" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Back</button>
        <span className="review-brand-mark">SOX <span>REVIEW</span></span>
        <div className="review-topbar__match">
          <span>{game.players?.[0]?.username || 'Player X'}</span>
          <span className="review-topbar__vs">vs</span>
          <span>{game.players?.[1]?.username || 'Player O'}</span>
        </div>
        <button className="review-puzzles-btn" onClick={() => navigate(`/puzzles/${gameId}`)}>
          Review puzzles <ChevronRight size={15} />
        </button>
      </header>

      <main className="review-content">
        <section className="review-heading">
          <div>
            <span className="review-eyebrow">POST-GAME ANALYSIS</span>
            <h1>Every move tells a story.</h1>
            <p>See what worked, where the game shifted, and what you could try next time.</p>
          </div>
          <div className="review-heading__result">
            <span className={`review-result-dot review-result-dot--${game.status?.toLowerCase() || 'completed'}`} />
            <span>{gameOutcome}</span>
          </div>
        </section>

        <section className="review-stats" aria-label="Game review summary">
          {summaryStats.map(stat => <Stat key={stat.label} {...stat} />)}
        </section>

        <section className="review-workspace">
          <div className="review-board-card">
            <div className="review-board-card__head">
              <div>
                <span className="review-section-label">POSITION</span>
                <h2>{showAfter ? 'After' : 'Before'} move {moveNo}</h2>
              </div>
              <button
                className="review-position-toggle"
                onClick={() => setShowAfter(value => !value)}
                aria-label={showAfter ? 'Show position before move' : 'Show position after move'}
              >
                {showAfter ? 'Before move' : 'After move'}
              </button>
            </div>
            <ReplayBoard
              moves={boardMoves}
              playedMove={annotation?.idx ?? -1}
              bestMove={annotation?.bestMove ?? -1}
              showAfter={showAfter}
            />
            <div className="review-board-legend">
              <span><i className="review-legend-dot review-legend-dot--played" /> Played move</span>
              <span><i className="review-legend-dot review-legend-dot--best" /> Suggested move</span>
            </div>
            <div className="review-board-controls">
              <button onClick={() => setCurrent(0)} disabled={current === 0} aria-label="First move"><ChevronsLeft size={18} /></button>
              <button onClick={() => setCurrent(index => Math.max(0, index - 1))} disabled={current === 0} aria-label="Previous move"><ChevronLeft size={19} /></button>
              <span>Move <b>{moveNo}</b> of {annotations.length}</span>
              <button onClick={() => setCurrent(index => Math.min(annotations.length - 1, index + 1))} disabled={current >= annotations.length - 1} aria-label="Next move"><ChevronRight size={19} /></button>
              <button onClick={() => setCurrent(annotations.length - 1)} disabled={current >= annotations.length - 1} aria-label="Last move"><ChevronsRight size={18} /></button>
            </div>
            <p className="review-keyboard-hint">Use ← → to step through the game</p>
          </div>

          <aside className="review-insight-card" aria-live="polite">
            <div className="review-insight-card__top">
              <span className="review-section-label">MOVE {moveNo} <span>·</span> {side} TO PLAY</span>
              <span className={`review-grade review-grade--${quality.tone}`}>
                <b>{quality.symbol}</b>{quality.label}
              </span>
            </div>
            <h2>{formatMove(annotation?.idx)}</h2>
            <p className="review-insight-card__explanation">
              {annotation?.explanation || 'This move was reviewed against the available legal continuations.'}
            </p>

            {annotation?.quality !== 'best' && annotation?.bestMove != null && (
              <div className="review-recommendation">
                <span className="review-recommendation__icon"><Lightbulb size={17} /></span>
                <div>
                  <span className="review-section-label">A STRONGER IDEA</span>
                  <strong>{formatMove(annotation.bestMove)}</strong>
                  <p>{annotation.recommendation}</p>
                </div>
              </div>
            )}

            <div className="review-insight-facts">
              <div><span>Move quality</span><strong>{quality.label}</strong></div>
              <div><span>Strategic theme</span><strong>{annotation?.theme || 'Positioning'}</strong></div>
              {annotation?.regret != null && (
                <div><span>Engine gap</span><strong>{annotation.regret === 0 ? 'Top choice' : `${annotation.regret} pts`}</strong></div>
              )}
            </div>

            {criticalMoments.length > 0 && (
              <div className="review-turning-points">
                <span className="review-section-label"><Target size={13} /> MOMENTS TO REVISIT</span>
                {criticalMoments.map(item => (
                  <button
                    key={item.index}
                    className="review-turning-point"
                    onClick={() => setCurrent(item.index)}
                  >
                    <span className={`review-turning-point__dot review-turning-point__dot--${item.quality.tone}`} />
                    <span>Move {item.index + 1} · {item.quality.label}</span>
                    <ChevronRight size={14} />
                  </button>
                ))}
              </div>
            )}
          </aside>
        </section>

        <section className="review-moves-card">
          <div className="review-moves-card__head">
            <div>
              <span className="review-section-label">FULL MOVE-BY-MOVE REVIEW</span>
              <h2>Game timeline <span>{annotations.length} plies</span></h2>
            </div>
            <div className="review-filters" role="group" aria-label="Filter reviewed moves">
              {[
                ['all', 'All moves'],
                ['critical', 'Needs attention'],
                ['highlights', 'Top moves']
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={filter === value ? 'is-active' : ''}
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="review-move-list">
            {visibleMoves.length ? visibleMoves.map(({ annotation: move, index }) => {
              const moveQuality = qualityFor(move);
              const moveSide = move.side === 1 ? 'O' : 'X';
              return (
                <button
                  key={`${move.moveNumber}-${index}`}
                  className={`review-move-row ${current === index ? 'is-active' : ''}`}
                  onClick={() => {
                    setCurrent(index);
                    setShowAfter(false);
                  }}
                  aria-current={current === index ? 'true' : undefined}
                >
                  <span className="review-move-row__number">{Math.floor(index / 2) + 1}{moveSide === 'O' ? '…' : '.'}</span>
                  <span className={`review-move-row__side review-move-row__side--${moveSide.toLowerCase()}`}>{moveSide}</span>
                  <span className="review-move-row__notation">{formatMove(move.idx)}</span>
                  <span className={`review-move-row__grade review-grade--${moveQuality.tone}`}>
                    <b>{moveQuality.symbol}</b>{moveQuality.label}
                  </span>
                  <span className="review-move-row__note">{move.theme || 'Positioning'}</span>
                  <ChevronRight className="review-move-row__arrow" size={15} />
                </button>
              );
            }) : (
              <div className="review-empty-filter">
                <Sparkles size={18} />
                <span>{filter === 'critical' ? 'No major errors in this game.' : 'No top-rated moves in this game yet.'}</span>
              </div>
            )}
          </div>
          <div className="review-grade-key">
            <span>Move grades</span>
            {Object.entries(QUALITY).filter(([code]) => code !== 'unrated').map(([code, value]) => (
              <span key={code} className={`review-grade-key__item review-grade-key__item--${code}`}>
                <b>{value.symbol}</b>{value.label}
              </span>
            ))}
          </div>
        </section>

        <p className="review-disclaimer">
          SOX review grades are strategic estimates for Ultimate Tic-Tac-Toe, not chess engine evaluations.
        </p>
      </main>
    </div>
  );
}
