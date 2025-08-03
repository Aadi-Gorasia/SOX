// client/src/components/Board.js
import React from 'react';
import Cell from './Cell';
import './Board.css';

const Board = ({ winner, squares, onPlay, isBoardActive, isPlayable }) => {

  const handleClick = (i) => {
    if (!isPlayable || !isBoardActive) {
      return;
    }
    onPlay(i);
  };

  const renderCell = (i) => {
    return <Cell value={squares[i]} onCellClick={() => handleClick(i)} />;
  };

  const boardClassName = `board ${isBoardActive ? 'active-board' : ''} ${!isPlayable ? 'not-playable' : ''}`;

  return (
    <div className="board-container">
      {winner && (
        <div className={`winner-overlay ${winner === 'D' ? 'draw-overlay' : ''}`}>
          <span className="winner-mark">{winner === 'D' ? '' : winner}</span>
        </div>
      )}
      <div className={boardClassName}>
        {Array(9).fill(null).map((_, i) => renderCell(i))}
      </div>
    </div>
  );
};

export default Board;