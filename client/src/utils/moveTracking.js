// src/utils/moveTracking.js
// Drop this into your existing game logic to collect the moves array
// that gets sent to the backend when the game ends.
//
// Your current GameManager likely tracks board state but not the raw
// move index array. This util handles that.

// ── Convert your UI coords to engine index ────────────────────────────────────
// Call this whenever a move is made in your React game component.
export function toEngineIdx(macroRow, macroCol, cellRow, cellCol) {
  const macro = macroRow * 3 + macroCol;
  const cell  = cellRow  * 3 + cellCol;
  return macro * 9 + cell;
}

// ── Convert engine index back to UI coords ────────────────────────────────────
export function fromEngineIdx(idx) {
  const macro = Math.floor(idx / 9);
  const cell  = idx % 9;
  return {
    macroRow: Math.floor(macro / 3),
    macroCol: macro % 3,
    cellRow:  Math.floor(cell / 3),
    cellCol:  cell % 3,
  };
}

// ── MoveTracker class ─────────────────────────────────────────────────────────
// Instantiate one per game. Call .record() on every move.
// Call .toPayload() when the game ends to get the array for the API.
export class MoveTracker {
  constructor() {
    this._moves = []; // [{ idx, side }]
  }

  // Record a move.
  // idx:  engine index 0-80
  // side: 0=X, 1=O
  record(idx, side) {
    this._moves.push({ idx, side });
  }

  // Record from UI coordinates
  recordFromCoords(macroRow, macroCol, cellRow, cellCol, side) {
    this.record(toEngineIdx(macroRow, macroCol, cellRow, cellCol), side);
  }

  // Returns the moves array ready to send to POST /api/games
  toPayload() {
    return [...this._moves];
  }

  reset() {
    this._moves = [];
  }

  get length() {
    return this._moves.length;
  }
}