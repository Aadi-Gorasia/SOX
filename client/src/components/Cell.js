// client/src/components/Cell.js
import React from 'react';
import './Cell.css';

/**
 * CELL COMPONENT
 * The smallest interactive unit of the recursive grid.
 * 
 * @param {string|null} value - The current occupant: 'X', 'O', or null.
 * @param {Function} onCellClick - Triggered when the node is engaged.
 * @param {boolean} isActive - Inherited state: Is this node in a playable sector?
 */
const Cell = ({ value, onCellClick, isActive }) => {
  
  /**
   * DYNAMIC CLASS ASSIGNMENT
   * Manages interaction availability and styling.
   */
  const cellClasses = [
    'cell',
    // 'cell-active' enables the soft Sulfur illumination from the CSS
    isActive && !value ? 'cell-active' : ''
  ].filter(Boolean).join(' ');

  return (
    <button
      className={cellClasses}
      onClick={onCellClick}
      // If the cell is already occupied, we physically disable the button element
      disabled={!!value}
      // Tactical Accessibility: aria-label for screen readers
      aria-label={value ? `Cell occupied by ${value}` : 'Empty Cell'}
    >
      {/* 
        DATA MARK LAYER 
        Only renders if a value is present (X or O).
      */}
      {value && (
        <span 
          className={`cell-mark ${value === 'X' ? 'cell-x' : 'cell-o'}`}
        >
          {value}
        </span>
      )}

      {/* 
        ILLUMINATION LAYER 
        Optional: Can add a very subtle scanning line effect here for active cells
      */}
      {isActive && !value && (
        <div className="cell-overlay-vignette"></div>
      )}
    </button>
  );
};

export default Cell;