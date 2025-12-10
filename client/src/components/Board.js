// client/src/components/Board.js
import React from 'react';
import Cell from './Cell';
import './Board.css';

const Board = ({ winner, squares, onPlay, isBoardActive, isPlayable }) => {
  const handleClick = (i) => {
    if (!isPlayable || !isBoardActive) return;
    if (squares[i]) return; // don’t overwrite existing moves
    onPlay(i);
  };

  const renderCell = (i) => (
    <Cell
      key={i}
      value={squares[i]}
      onCellClick={() => handleClick(i)}
      isActive={isBoardActive && isPlayable && !winner}
    />
  );

  const boardClassName = `board ${
    isBoardActive ? 'active-board' : ''
  } ${!isPlayable ? 'not-playable' : ''}`;

  const containerClassName = `board-container ${
    winner && winner !== 'D' ? 'won-board' : ''
  }`;

  return (
    <div className={containerClassName}>
      {winner && (
        <div
          className={`winner-overlay ${
            winner === 'D' ? 'draw-overlay' : ''
          }`}
        >
          {winner !== 'D' && (
            <span
              className={`xo-glyph winner-mark ${
                winner === 'X' ? 'winner-x' : 'winner-o'
              }`}
            >
              {winner}
            </span>
          )}
        </div>
      )}
      <div className={boardClassName}>
        {Array(9)
          .fill(null)
          .map((_, i) => renderCell(i))}
      </div>
    </div>
  );
};

export default Board;
