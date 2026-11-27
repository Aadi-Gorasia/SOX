// client/src/components/Board.js
import React from 'react';
import GameMark from './GameMark';
import Cell from './Cell';
import './Board.css';

const Board = ({ winner, squares, onPlay, isTurn, isTarget, sector, onHoverCell }) => {
  const handleCellClick = (cellIndex) => {
    if (!isTurn || !isTarget || winner || squares[cellIndex]) return;
    onPlay(cellIndex);
  };

  // Here is the fix: Split 'isTarget' visuals based on whose turn it is
  const containerClasses =[
    'board-container',
    isTarget ? (isTurn ? 'is-active-target' : 'is-opponent-target') : 'not-playable',
    winner ? 'won-board' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      {winner && (
        <div className={`winner-overlay ${winner === 'D' ? 'draw-overlay' : ''}`}>
          {winner !== 'D' && (
            <span className={`winner-mark ${winner === 'X' ? 'winner-x' : 'winner-o'}`}>
              <GameMark value={winner}/>
            </span>
          )}
        </div>
      )}

      <div className="board">
        {squares.map((mark, i) => (
          <Cell
            key={i}
            value={mark}
            label={`Board ${sector + 1}, square ${i + 1}`}
            onHover={active => onHoverCell?.(active ? sector : null, active ? i : null)}
            onCellClick={() => handleCellClick(i)}
            // Hover effects only work if it's YOUR turn
            isActive={isTurn && isTarget && !winner}
          />
        ))}
      </div>
    </div>
  );
};

export default Board;