const { WIN_LINES, WIN_SCORE } = require('./constants');

const MACRO_WEIGHTS = [0, 100, 430, 0];
const MICRO_WEIGHTS = [0, 4, 22, 0];
const CENTER_BONUS = [0, 4, 12, 0];
const CORNERS = [0, 2, 6, 8];

function linePotential(cells, player, weights) {
  let score = 0;
  for (const [a, b, c] of WIN_LINES) {
    const line = [cells[a], cells[b], cells[c]];
    if (line.some(mark => mark && mark !== player)) continue;
    const count = line.filter(mark => mark === player).length;
    if (count) score += weights[count];
  }
  return score;
}

function evaluateState(state) {
  if (state.gameWinner === 'X') return WIN_SCORE;
  if (state.gameWinner === 'O') return -WIN_SCORE;
  if (state.gameWinner === 'D') return 0;

  let score = 0;
  score += linePotential(state.winners, 'X', MACRO_WEIGHTS);
  score -= linePotential(state.winners, 'O', MACRO_WEIGHTS);

  for (let macro = 0; macro < 9; macro += 1) {
    if (state.winners[macro]) continue;
    const board = state.boards[macro];
    score += linePotential(board, 'X', MICRO_WEIGHTS);
    score -= linePotential(board, 'O', MICRO_WEIGHTS);

    if (board[4] === 'X') score += CENTER_BONUS[1];
    if (board[4] === 'O') score -= CENTER_BONUS[1];
    for (const corner of CORNERS) {
      if (board[corner] === 'X') score += CENTER_BONUS[0] + 1;
      if (board[corner] === 'O') score -= CENTER_BONUS[0] + 1;
    }

    const macroRow = Math.floor(macro / 3);
    const macroColumn = macro % 3;
    const macroPositionWeight = macroRow === 1 && macroColumn === 1 ? 3
      : macroRow === 1 || macroColumn === 1 ? 2 : 1;
    score += linePotential(board, 'X', MICRO_WEIGHTS) * (macroPositionWeight - 1) * 0.15;
    score -= linePotential(board, 'O', MICRO_WEIGHTS) * (macroPositionWeight - 1) * 0.15;
  }

  if (state.activeBoard !== null && !state.winners[state.activeBoard]) {
    const forcedBoard = state.boards[state.activeBoard];
    const threatWeights = [0, 0, 1, 0];
    const xThreats = linePotential(forcedBoard, 'X', threatWeights);
    const oThreats = linePotential(forcedBoard, 'O', threatWeights);
    score += (xThreats - oThreats) * 5;
    score += state.turn === 'X' ? 3 : -3;
  }
  return Math.round(score);
}

module.exports = { evaluateState };
