// client/src/components/MoveHistory.js
import React, { useEffect, useRef, useMemo } from 'react';
import './MoveHistory.css';

const formatCoord = (bIdx, cIdx) => {
  if (bIdx === null || cIdx === null) return 'ERR';
  return `S${bIdx}:N${cIdx}`;
};

const calculateDelta = (moves, index) => {
  if (index === 0 || !moves[index].timestamp || !moves[index - 1].timestamp) return '--';
  const current = new Date(moves[index].timestamp).getTime();
  const previous = new Date(moves[index - 1].timestamp).getTime();
  return `+${((current - previous) / 1000).toFixed(1)}s`;
};

const MoveHistory = ({ moves =[], currentMoveIndex, onSelectMove }) => {
  const listRef = useRef(null);

  const rounds = useMemo(() => {
    const grouped =[];
    for (let i = 0; i < moves.length; i += 2) {
      grouped.push({
        id: Math.floor(i / 2) + 1,
        xMove: { ...moves[i], index: i, delta: calculateDelta(moves, i) },
        oMove: moves[i + 1] ? { ...moves[i + 1], index: i + 1, delta: calculateDelta(moves, i + 1) } : null,
      });
    }
    return grouped;
  }, [moves]);

  useEffect(() => {
    if (listRef.current && currentMoveIndex === moves.length - 1) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [moves, currentMoveIndex]);

  return (
    <div className="history-container">
      <header className="history-header">
        <span className="history-title">Transaction Log</span>
      </header>

      <div className="history-list" ref={listRef}>
        {rounds.map((round) => (
          <div key={round.id} className="history-round-row">
            <div className="round-num">{round.id.toString().padStart(2, '0')}</div>
            
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
              <div className="move-node empty-node">
                <div className="move-time" style={{ marginLeft: 0, marginTop: '12px' }}>Awaiting...</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <footer className="history-controls">
        <button disabled={currentMoveIndex < 0} onClick={() => onSelectMove(currentMoveIndex - 1)}>
          Previous
        </button>
        <button disabled={currentMoveIndex >= moves.length - 1} onClick={() => onSelectMove(currentMoveIndex + 1)}>
          Next
        </button>
      </footer>
    </div>
  );
};

export default MoveHistory;