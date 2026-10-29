// src/components/Puzzle/Puzzle.jsx
// Renders a puzzle position and validates the player's answer via the engine.

import { useState } from 'react';
import './Puzzle.css';

// ── Helpers ───────────────────────────────────────────────────────────────────
function buildBoard(position) {
  // position = array of move indices played to reach this state
  const board = Array(81).fill(null);
  position.forEach((idx, i) => {
    board[idx] = i % 2 === 0 ? 'X' : 'O';
  });
  return board;
}

function getMoverSide(position) {
  return position.length % 2 === 0 ? 'X' : 'O';
}

function getActiveMacro(position) {
  if (position.length === 0) return 9; // any
  const lastIdx  = position[position.length - 1];
  const lastCell = lastIdx % 9;
  // simplified: return lastCell as next macro (assume not full)
  return lastCell;
}

// ── Puzzle component ──────────────────────────────────────────────────────────
export default function Puzzle({ puzzle, token, onNext }) {
  // puzzle = { position: [moves...], solution: 40, difficulty: 'hard', moveNumber: 12 }
  const [selected, setSelected] = useState(null);
  const [result,   setResult]   = useState(null); // null | { correct, bestMove }
  const [loading,  setLoading]  = useState(false);

  const board      = buildBoard(puzzle.position);
  const mover      = getMoverSide(puzzle.position);
  const activeMacro = getActiveMacro(puzzle.position);

  async function handleCellClick(idx) {
    if (result || loading) return;

    const macro = Math.floor(idx / 9);

    // Validate it's a legal cell (empty, in active macro)
    if (board[idx] !== null) return;
    if (activeMacro !== 9 && macro !== activeMacro) return;

    setSelected(idx);
    setLoading(true);

    try {
      const res = await fetch('/api/games/puzzle/check', {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token,
        },
        body: JSON.stringify({ position: puzzle.position, answer: idx }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('Puzzle check failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="puzzle">

      {/* Header */}
      <div className="puzzle-header">
        <div className="puzzle-header__tag">PUZZLE</div>
        <div className="puzzle-header__info">
          <span className={`puzzle-header__diff puzzle-header__diff--${puzzle.difficulty}`}>
            {puzzle.difficulty?.toUpperCase()}
          </span>
          <span className="puzzle-header__mover">
            {mover} TO MOVE
          </span>
        </div>
        <div className="puzzle-header__prompt">Find the best move</div>
      </div>

      {/* Board */}
      <div className="puzzle-board-wrap">
        <div className="puzzle-board">
          {Array.from({ length: 81 }, (_, idx) => {
            const macro  = Math.floor(idx / 9);
            const cell   = idx % 9;
            const piece  = board[idx];
            const isActive = activeMacro === 9 || activeMacro === macro;
            const isSelected = idx === selected;
            const isBestMove = result && !result.correct && idx === result.bestMove;
            const isWrong    = result && !result.correct && idx === selected;
            const isCorrect  = result && result.correct  && idx === selected;
            const isLegal  = !piece && isActive;

            return (
              <div
                key={idx}
                className={[
                  'puzzle-cell',
                  piece     ? `puzzle-cell--${piece.toLowerCase()}` : '',
                  isActive  ? 'puzzle-cell--active' : 'puzzle-cell--inactive',
                  isLegal   ? 'puzzle-cell--legal'  : '',
                  isBestMove? 'puzzle-cell--best'   : '',
                  isWrong   ? 'puzzle-cell--wrong'  : '',
                  isCorrect ? 'puzzle-cell--correct': '',
                  // Macro borders via CSS nth-child
                  (cell % 3 === 2) ? 'puzzle-cell--macroborder-r' : '',
                  (Math.floor(cell / 3) === 2) ? 'puzzle-cell--macroborder-b' : '',
                ].join(' ')}
                onClick={() => isLegal && handleCellClick(idx)}
              >
                {piece && <span>{piece}</span>}
                {isBestMove && !piece && <span className="puzzle-cell__hint">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Result */}
      {loading && (
        <div className="puzzle-result puzzle-result--loading">
          CHECKING…
        </div>
      )}

      {result && (
        <div className={`puzzle-result puzzle-result--${result.correct ? 'correct' : 'wrong'}`}>
          {result.correct
            ? '✓ CORRECT — BEST MOVE'
            : `✗ WRONG — BEST WAS SQUARE ${result.bestMove}`
          }
          {onNext && (
            <button className="puzzle-result__next" onClick={onNext}>
              NEXT PUZZLE →
            </button>
          )}
        </div>
      )}

    </div>
  );
}