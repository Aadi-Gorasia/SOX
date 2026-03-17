import React, { useEffect, useRef } from 'react';
import './MoveHistory.css';

// Helper for "Grid Coordinates" (A1, B2 style)
const getCoord = (index) => {
  const row = Math.floor(index / 3);
  const col = index % 3;
  const letters = ['A', 'B', 'C'];
  return `${letters[col]}${3 - row}`; // e.g., A3, B1
};

// Format seconds -> nice string:
// <1s, 8.3s, 45s, 1:05, 2:03.4, 10:00, etc.
function formatMoveTime(seconds) {
  if (seconds == null || seconds < 0.1) return '<1s';

  // Under 60s → show seconds with optional decimal
  if (seconds < 60) {
    if (seconds < 10) return seconds.toFixed(1) + 's';
    return Math.round(seconds) + 's';
  }

  // 60s or more → mm:ss / mm:ss.s
  const total = seconds;
  const m = Math.floor(total / 60);
  const remainder = total - m * 60; // can be fractional

  // If remainder < 1s, just show mm:00
  if (remainder < 1) {
    return `${m}:00`;
  }

  // If remainder < 10s, keep one decimal: mm:0x.x
  if (remainder < 10) {
    return `${m}:0${remainder.toFixed(1)}`;
  }

  // Otherwise, round to nearest second: mm:ss
  const sRounded = Math.round(remainder);
  const ss = sRounded.toString().padStart(2, '0');
  return `${m}:${ss}`;
}

// Compute time taken using timestamps (no server changes needed)
// eslint-disable-next-line no-unused-vars
function getMoveTimeLabel(moves, index) {
  const move = moves[index];

  // If the server later adds timeTakenSeconds, we’ll use it
  if (move.timeTakenSeconds != null) {
    return formatMoveTime(move.timeTakenSeconds);
  }

  // For first move, no previous reference
  if (index === 0 || !move.timestamp) return null;

  const prevMove = moves[index - 1];
  if (!prevMove || !prevMove.timestamp) return null;

  const tPrev = new Date(prevMove.timestamp).getTime();
  const tCurr = new Date(move.timestamp).getTime();
  if (isNaN(tPrev) || isNaN(tCurr)) return null;

  const deltaSec = (tCurr - tPrev) / 1000;
  if (deltaSec < 0) return null;

  return formatMoveTime(deltaSec);
}

const MoveHistory = ({ moves = [], currentMoveIndex, onSelectMove }) => {
  const bottomRef = useRef(null);

  // Only auto-scroll if we are currently looking at the latest move
  useEffect(() => {
    if (currentMoveIndex === moves.length - 1) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [moves, currentMoveIndex]);

  if (!moves || moves.length === 0) {
    return <div className="history-empty">Game hasn't started yet.</div>;
  }

  return (
    <div className="history-container">
      <div className="history-list">
        {moves.map((move, i) => {
          // Highlight if this is the currently viewed move
          const isActive = i === currentMoveIndex;
          
          return (
            <div 
              key={i} 
              className={`history-item ${isActive ? 'active' : ''}`}
              onClick={() => onSelectMove(i)} // <--- Time Travel Click
            >
              <div className="hist-num">{i + 1}.</div>
              <div className={`hist-symbol ${move.player === 'X' ? 'sym-x' : 'sym-o'}`}>
                {move.player}
              </div>
              <div className="hist-details">
                <span>{getCoord(move.boardIndex)} → {getCoord(move.cellIndex)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default MoveHistory;