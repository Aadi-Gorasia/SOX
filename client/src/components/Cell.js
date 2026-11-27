// client/src/components/Cell.js
import React from 'react';
import GameMark from './GameMark';
import './Cell.css';

const Cell = ({ value, onCellClick, isActive, label, onHover }) => {
  const cellClasses =[
    'cell',
    isActive && !value ? 'cell-active' : ''
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cellClasses}
      onClick={onCellClick}
      disabled={!isActive || !!value}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      onFocus={() => onHover?.(true)}
      onBlur={() => onHover?.(false)}
      aria-label={`${label || 'Cell'}: ${value || 'empty'}`}
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