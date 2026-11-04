const { WIN_LINES } = require('./constants');

const other = player => (player === 'X' ? 'O' : 'X');

function boardWinner(cells) {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return cells.every(Boolean) ? 'D' : null;
}

function globalWinner(winners) {
  for (const [a, b, c] of WIN_LINES) {
    if (winners[a] && winners[a] !== 'D' && winners[a] === winners[b] && winners[a] === winners[c]) {
      return winners[a];
    }
  }
  return winners.every(Boolean) ? 'D' : null;
}

function emptyState() {
  return {
    boards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    winners: Array(9).fill(null),
    activeBoard: null,
    turn: 'X',
    gameWinner: null
  };
}

function cloneState(state) {
  return {
    boards: state.boards.map(board => [...board]),
    winners: [...state.winners],
    activeBoard: state.activeBoard,
    turn: state.turn,
    gameWinner: state.gameWinner
  };
}

function legalMoves(state) {
  if (state.gameWinner) return [];
  const eligibleBoards = state.activeBoard === null
    ? state.winners.map((winner, index) => winner ? null : index).filter(index => index !== null)
    : [state.activeBoard];
  const moves = [];
  for (const macro of eligibleBoards) {
    if (state.winners[macro]) continue;
    for (let cell = 0; cell < 9; cell += 1) {
      if (!state.boards[macro][cell]) moves.push(macro * 9 + cell);
    }
  }
  return moves;
}

function applyMove(state, move) {
  if (!Number.isInteger(move) || !legalMoves(state).includes(move)) return null;
  const next = cloneState(state);
  makeMove(next, move);
  return next;
}

function makeMove(state, move) {
  const macro = Math.floor(move / 9);
  const cell = move % 9;
  const player = state.turn;
  const undo = {
    macro,
    cell,
    previousWinner: state.winners[macro],
    activeBoard: state.activeBoard,
    turn: state.turn,
    gameWinner: state.gameWinner
  };

  state.boards[macro][cell] = player;
  state.winners[macro] = boardWinner(state.boards[macro]);
  state.gameWinner = globalWinner(state.winners);
  state.activeBoard = state.winners[cell] ? null : cell;
  state.turn = other(player);
  return undo;
}

function unmakeMove(state, undo) {
  state.boards[undo.macro][undo.cell] = null;
  state.winners[undo.macro] = undo.previousWinner;
  state.activeBoard = undo.activeBoard;
  state.turn = undo.turn;
  state.gameWinner = undo.gameWinner;
}

function deriveState(position = []) {
  if (!Array.isArray(position) || position.length > 81) return null;
  const state = emptyState();
  for (const move of position) {
    if (!Number.isInteger(move) || !legalMoves(state).includes(move)) return null;
    makeMove(state, move);
  }
  return state;
}

module.exports = {
  other,
  boardWinner,
  globalWinner,
  emptyState,
  cloneState,
  legalMoves,
  applyMove,
  makeMove,
  unmakeMove,
  deriveState
};
