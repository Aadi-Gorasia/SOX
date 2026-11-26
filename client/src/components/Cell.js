// client/src/components/Cell.js
import React from 'react';
import GameMark from './GameMark';
import './Cell.css';

const Cell = ({ value, onCellClick, isActive }) => {
  const cellClasses =[
    'cell',
    isActive && !value ? 'cell-active' : ''
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cellClasses}
      onClick={onCellClick}
      disabled={!!value}
      aria-label={value ? `Cell occupied by ${value}` : 'Empty Cell'}
    >
      {value && (
        <span className={`cell-mark ${value === 'X' ? 'cell-x' : 'cell-o'}`}>
          <GameMark value={value}/>
        </span>
      )}
    </button>
  );
};

export default Cell;