// client/src/components/Board.js
import React from 'react';
import Cell from './Cell';
import './Board.css';

/**
 * BOARD COMPONENT
 * Represents one of the nine 3x3 sectors in the recursive grid.
 * 
 * @param {string|null} winner - 'X', 'O', 'D' (Draw), or null if the sector is still active.
 * @param {Array} squares - An array of 9 strings representing the marks in this sector.
 * @param {Function} onPlay - Callback triggered when a valid move is made.
 * @param {boolean} isTurn - Global state: Is it currently the user's turn to act?
 * @param {boolean} isTarget - Sector state: Is this the specific sector required by the game's recursive logic?
 */
const Board = ({ winner, squares, onPlay, isTurn, isTarget }) => {
  
  /**
   * HANDLE CELL INTERACTION
   * Validates the move before passing it up to the GameManager.
   * 
   * @param {number} cellIndex - The 0-8 index of the cell clicked within this board.
   */
  const handleCellClick = (cellIndex) => {
    // 1. BLOCKED: If it is not your turn, interaction is disabled.
    if (!isTurn) return;

    // 2. BLOCKED: If this sector is not the designated Target Lock, interaction is disabled.
    if (!isTarget) return;

    // 3. BLOCKED: If the sector has already been won or resulted in a draw.
    if (winner) return;

    // 4. BLOCKED: If the specific cell is already occupied by a mark.
    if (squares[cellIndex]) return; 

    // VALIDATED: Execute move protocol.
    onPlay(cellIndex);
  };

  /**
   * DYNAMIC CLASS CONSTRUCTION
   * Constructs the CSS classes based on the high-intensity tactical states.
   */
  const containerClasses = [
    'board-container',
    // Applies the Sulfur neon glow and corner brackets
    isTarget ? 'is-active-target' : 'not-playable',
    // Applies the pulse animation if it's the user's turn
    (isTurn && isTarget) ? 'is-your-turn' : '',
    // Mark as won to handle saturation/border adjustments
    winner ? 'won-board' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      
      {/* 
        WINNER OVERLAY 
        Triggered upon sector capture. Obscures the mini-grid with the victor's mark.
      */}
      {winner && (
        <div className={`winner-overlay ${winner === 'D' ? 'draw-overlay' : ''}`}>
          {winner !== 'D' ? (
            <span className={`winner-mark ${winner === 'X' ? 'winner-x' : 'winner-o'}`}>
              {winner}
            </span>
          ) : (
            /* DRAW STATE is handled via CSS ::after on the draw-overlay class */
            null
          )}
        </div>
      )}

      {/* 
        THE 3X3 MINI-GRID
        Maps the 9 data nodes into interactive Cell components.
      */}
      <div className="board">
        {squares.map((mark, i) => (
          <Cell
            key={i}
            value={mark}
            onCellClick={() => handleCellClick(i)}
            // isActive ensures the Cell knows to show hover effects only in the Target Lock sector.
            isActive={isTurn && isTarget && !winner}
          />
        ))}
      </div>
    </div>
  );
};

export default Board;