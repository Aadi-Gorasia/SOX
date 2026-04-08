// client/src/components/MoveHistory.js
import React, { useEffect, useRef, useMemo } from 'react';
import './MoveHistory.css';

/**
 * COORDINATE HELPER
 * Transforms raw indices into Sector:Node technical notation.
 * Example: Sector 4, Node 2 -> S4:N2
 */
const formatCoord = (bIdx, cIdx) => {
  if (bIdx === null || cIdx === null) return 'ERR_NULL';
  return `S${bIdx}:N${cIdx}`;
};

/**
 * THINKING TIME HELPER
 * Calculates the duration between the current move and the previous one.
 */
const calculateDelta = (moves, index) => {
  if (index === 0 || !moves[index].timestamp || !moves[index - 1].timestamp) return '--';
  const current = new Date(moves[index].timestamp).getTime();
  const previous = new Date(moves[index - 1].timestamp).getTime();
  const seconds = (current - previous) / 1000;
  return `+${seconds.toFixed(1)}S`;
};

const MoveHistory = ({ moves = [], currentMoveIndex, onSelectMove }) => {
  const listRef = useRef(null);

  /**
   * ROUND GROUPING LOGIC
   * Maps the flat move array into pairs (Rounds).
   * Round 1 = Moves[0] (X) and Moves[1] (O).
   */
  const rounds = useMemo(() => {
    const grouped = [];
    for (let i = 0; i < moves.length; i += 2) {
      grouped.push({
        id: Math.floor(i / 2) + 1,
        xMove: { ...moves[i], index: i, delta: calculateDelta(moves, i) },
        oMove: moves[i + 1] ? { ...moves[i + 1], index: i + 1, delta: calculateDelta(moves, i + 1) } : null,
      });
    }
    return grouped;
  }, [moves]);

  /**
   * AUTO-SCROLL LOGIC
   * Keeps the log focused on the latest simulation state.
   */
  useEffect(() => {
    if (listRef.current && currentMoveIndex === moves.length - 1) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves, currentMoveIndex]);

  return (
    <div className="history-container">
      {/* HUD HEADER */}
      <header className="history-header">
        <span>TRANSACTION_LOG</span>
        <span className="text-sulfur">v2.0_LIVE</span>
      </header>

      {/* MOVE LIST AREA */}
      <div className="history-list" ref={listRef}>
        {rounds.map((round) => (
          <div key={round.id} className="history-round-row">
            {/* ROUND COUNTER */}
            <div className="round-num">
              {round.id.toString().padStart(2, '0')}
            </div>
            
            {/* X (COBALT) MOVE NODE */}
            <div 
              className={`move-node ${currentMoveIndex === round.xMove.index ? 'active' : ''}`}
              onClick={() => onSelectMove(round.xMove.index)}
            >
              <div className="move-main">
                <span className="move-sym x">X</span>
                <span className="move-coord">{formatCoord(round.xMove.boardIndex, round.xMove.cellIndex)}</span>
              </div>
              <div className="move-time">{round.xMove.delta}</div>
            </div>

            {/* O (CRIMSON) MOVE NODE */}
            {round.oMove ? (
              <div 
                className={`move-node ${currentMoveIndex === round.oMove.index ? 'active' : ''}`}
                onClick={() => onSelectMove(round.oMove.index)}
              >
                <div className="move-main">
                  <span className="move-sym o">O</span>
                  <span className="move-coord">{formatCoord(round.oMove.boardIndex, round.oMove.cellIndex)}</span>
                </div>
                <div className="move-time">{round.oMove.delta}</div>
              </div>
            ) : (
              /* Awaiting O move to complete the round */
              <div className="move-node empty-node">
                <div className="move-time hp-mono">PENDING...</div>
              </div>
            )}
          </div>
        ))}
        
        {/* EMPTY STATE */}
        {moves.length === 0 && (
          <div className="hp-mono text-steel" style={{ padding: '3rem', textAlign: 'center', fontSize: '0.7rem' }}>
            AWAITING_INPUT_SIGNAL...
          </div>
        )}
      </div>

      {/* TIME TRAVEL FOOTER */}
      <footer className="history-controls">
        <button 
          disabled={currentMoveIndex < 0} 
          onClick={() => onSelectMove(currentMoveIndex - 1)}
        >
          [ PREV_STATE ]
        </button>
        <button 
          disabled={currentMoveIndex >= moves.length - 1} 
          onClick={() => onSelectMove(currentMoveIndex + 1)}
        >
          [ NEXT_STATE ]
        </button>
      </footer>
    </div>
  );
};

export default MoveHistory;