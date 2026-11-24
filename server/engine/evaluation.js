const { WIN_LINES, WIN_SCORE } = require('./constants');
const LINES = WIN_LINES.map(line => line.reduce((mask, i) => mask | (1 << i), 0));
const cache = new Map();
const popcount = n => { let count = 0; for (; n; n &= n - 1) count++; return count; };

// Only 3^9 legal local-board configurations. Cache static geometry, not turns.
function localInfo(board) {
  let x = 0, o = 0;
  for (let i = 0; i < 9; i++) {
    if (board[i] === 'X') x |= 1 << i;
    if (board[i] === 'O') o |= 1 << i;
  }
  const key = x | (o << 9);
  if (cache.has(key)) return cache.get(key);
  function side(own, enemy) {
    let score = 0, wins = 0;
    for (const mask of LINES) {
      if (mask & enemy) continue;
      const count = popcount(mask & own);
      score += [0, 4, 24, 0][count];
      if (count === 2) wins |= mask & ~(own | enemy);
    }
    score += (own & 16 ? 5 : 0) + popcount(own & 325) * 2;
    // Distinct winning squares, rather than counting the same threat twice.
    if (popcount(wins) > 1) score += 35;
    return { score, wins };
  }
  const info = { X: side(x, o), O: side(o, x) };
  cache.set(key, info);
  return info;
}

function macroImportance(state, sector, player) {
  let weight = 1;
  for (const line of WIN_LINES) {
    if (!line.includes(sector)) continue;
    const rest = line.filter(i => i !== sector).map(i => state.winners[i]);
    if (rest.some(mark => mark && mark !== player)) continue;
    weight += [0.15, 0.6, 2.5][rest.filter(mark => mark === player).length];
  }
  return weight;
}

function deadMacro(state) {
  // Locked sectors never change owner; if every line is blocked for both sides,
  // no future sequence can win. This is an exact draw, not an evaluation guess.
  return WIN_LINES.every(line =>
    line.some(i => state.winners[i] && state.winners[i] !== 'X') &&
    line.some(i => state.winners[i] && state.winners[i] !== 'O'));
}

function evaluateState(state) {
  if (state.gameWinner === 'X') return WIN_SCORE;
  if (state.gameWinner === 'O') return -WIN_SCORE;
  if (state.gameWinner === 'D' || deadMacro(state)) return 0;
  let score = 0;
  for (const line of WIN_LINES) {
    const marks = line.map(i => state.winners[i]);
    if (!marks.some(m => m && m !== 'X')) score += [0, 100, 500, 0][marks.filter(m => m === 'X').length];
    if (!marks.some(m => m && m !== 'O')) score -= [0, 100, 500, 0][marks.filter(m => m === 'O').length];
  }
  let routingBonus = 0;
  for (let sector = 0; sector < 9; sector++) {
    if (state.winners[sector]) continue;
    const info = localInfo(state.boards[sector]);
    const wx = macroImportance(state, sector, 'X');
    const wo = macroImportance(state, sector, 'O');
    score += info.X.score * wx - info.O.score * wo;
    // Only the side actually allowed into a sector can cash in its threat now.
    if (state.activeBoard === null || state.activeBoard === sector) {
      const side = info[state.turn];
      const weight = state.turn === 'X' ? wx : wo;
      if (side.wins) routingBonus = Math.max(routingBonus, 70 * weight);
    }
  }
  score += (state.turn === 'X' ? 1 : -1) * (routingBonus + (state.activeBoard === null ? 18 : 3));
  return Math.round(score);
}
module.exports = { evaluateState, localInfo, macroImportance, deadMacro };
