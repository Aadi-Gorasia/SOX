// client/src/components/Cell.js
import React from 'react';
import './Board.css';

const Cell = ({ value, onCellClick, isActive }) => {
  const handleClick = () => {
    if (!onCellClick) return;
    onCellClick();
  };

  return (
    <button
      className={`cell ${isActive ? 'cell-active' : ''}`}
      onClick={handleClick}
    >
      {value && (
        <span
          className={`xo-glyph cell-mark ${
            value === 'X' ? 'cell-x' : 'cell-o'
          }`}
        >
          {value}
        </span>
      )}
    </button>
  );
};

export default Cell;
