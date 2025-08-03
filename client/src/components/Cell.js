// client/src/components/Cell.js
import React from 'react';
import './Cell.css';

const Cell = ({ value, onCellClick }) => {
  const cellClassName = `cell ${value ? value.toLowerCase() : ''}`;
  return (
    <button className={cellClassName} onClick={onCellClick}></button>
  );
};

export default Cell;