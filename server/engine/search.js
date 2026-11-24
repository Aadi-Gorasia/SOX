const { performance } = require('node:perf_hooks');
const { INFINITY, WIN_SCORE } = require('./constants');
const { legalMoves, makeMove, unmakeMove, other, cloneState } = require('./state');
const { evaluateState, localInfo, macroImportance, deadMacro } = require('./evaluation');
const { rootSymmetries, orbit } = require('./symmetry');
const MATE = WIN_SCORE - 1000;
const ABORT = Symbol('search budget exhausted');

function positionKey(state) {
  return state.boards.map(b => b.map(m => m || '.').join('')).join('') +
    ':' + state.winners.map(m => m || '.').join('') + ':' + state.activeBoard + ':' + state.turn;
}
const bounded = (value, fallback, min, max) => Number.isFinite(value) ? Math.max(min, Math.min(max, Math.floor(value))) : fallback;
const toTable = (score, ply) => score >= MATE ? score + ply : score <= -MATE ? score - ply : score;
const fromTable = (score, ply) => score >= MATE ? score - ply : score <= -MATE ? score + ply : score;

function searchPosition(input, options = {}) {
  // Never mutate a caller's live game, even if a search is interrupted.
  const state = cloneState(input);
  const started = performance.now();
  const maxDepth = bounded(options.maxDepth, 16, 1, 81);
  const nodeLimit = bounded(options.nodeLimit, 50000, 1, 2000000);
  const timeLimitMs = bounded(options.timeLimitMs, 1000, 1, 10000);
  const extensionDepth = bounded(options.tacticalDepth, 2, 0, 4);
  const tableLimit = bounded(options.tableLimit, 100000, 0, 250000);
  const deadline = started + timeLimitMs;
  const table = new Map();
  const killers = [];
  const history = { X: new Int32Array(81), O: new Int32Array(81) };
  let nodes = 0, hits = 0, cutoffs = 0, stopped = false, selectiveDepth = 0;

  function visit(ply) {
    if (nodes >= nodeLimit || performance.now() >= deadline) throw ABORT;
    nodes++;
    selectiveDepth = Math.max(selectiveDepth, ply);
  }
  function terminal(ply) {
    return state.gameWinner === 'D' ? 0 : state.gameWinner === state.turn ? WIN_SCORE - ply : -WIN_SCORE + ply;
  }
  function ordered(moves, preferred, ply) {
    return moves.map(move => {
      const sector = Math.floor(move / 9), cell = move % 9;
      const info = localInfo(state.boards[sector]);
      const capture = Boolean(info[state.turn].wins & (1 << cell));
      const block = Boolean(info[other(state.turn)].wins & (1 << cell));
      let priority = move === preferred ? 1e8 : 0;
      if (capture) priority += 10000 * macroImportance(state, sector, state.turn);
      if (block) priority += 1000 * macroImportance(state, sector, other(state.turn));
      if (killers[ply]?.includes(move)) priority += 700;
      priority += history[state.turn][move] + (cell === 4 ? 30 : cell % 2 === 0 ? 12 : 0);
      // Giving the opponent a free choice is usually a cost, not a reward.
      if (state.winners[cell] || (cell === sector && capture)) priority -= 90;
      else if (localInfo(state.boards[cell])[other(state.turn)].wins) priority -= 180;
      return { move, priority };
    }).sort((a,b) => b.priority - a.priority || a.move - b.move).map(x => x.move);
  }
  function unstable() {
    for (let i = 0; i < 9; i++) {
      if (state.winners[i] || (state.activeBoard !== null && state.activeBoard !== i)) continue;
      const info = localInfo(state.boards[i]);
      if (info.X.wins || info.O.wins) return true;
    }
    return false;
  }
  function child(move, search) {
    const undo = makeMove(state, move);
    try { return -search(); } finally { unmakeMove(state, undo); }
  }
  function tactical(alpha, beta, ply, remaining) {
    visit(ply);
    if (state.gameWinner) return terminal(ply);
    if (deadMacro(state)) return 0;
    if (!remaining || !unstable()) return (state.turn === 'X' ? 1 : -1) * evaluateState(state);
    const moves = legalMoves(state);
    if (!moves.length) return 0;
    let best = -INFINITY;
    // No stand-pat or capture-only assumption: UTTT routing makes quiet replies vital.
    for (const move of ordered(moves, null, ply)) {
      const score = child(move, () => tactical(-beta, -alpha, ply + 1, remaining - 1));
      best = Math.max(best, score); alpha = Math.max(alpha, score);
      if (alpha >= beta) break;
    }
    return best;
  }
  function negamax(depth, alpha, beta, ply) {
    if (depth <= 0) return tactical(alpha, beta, ply, extensionDepth);
    visit(ply);
    if (state.gameWinner) return terminal(ply);
    if (deadMacro(state)) return 0;
    const originalAlpha = alpha, originalBeta = beta;
    const key = positionKey(state), cached = table.get(key);
    if (cached && cached.depth >= depth) {
      hits++;
      const score = fromTable(cached.score, ply);
      if (cached.bound === 'exact') return score;
      if (cached.bound === 'lower') alpha = Math.max(alpha, score);
      if (cached.bound === 'upper') beta = Math.min(beta, score);
      if (alpha >= beta) return score;
    }
    const moves = ordered(legalMoves(state), cached?.bestMove, ply);
    if (!moves.length) return 0;
    let best = -INFINITY, bestMove = moves[0], first = true;
    for (const move of moves) {
      let score;
      if (first) score = child(move, () => negamax(depth - 1, -beta, -alpha, ply + 1));
      else {
        score = child(move, () => negamax(depth - 1, -alpha - 1, -alpha, ply + 1));
        if (score > alpha && score < beta) score = child(move, () => negamax(depth - 1, -beta, -alpha, ply + 1));
      }
      first = false;
      if (score > best) { best = score; bestMove = move; }
      alpha = Math.max(alpha, score);
      if (alpha >= beta) {
        cutoffs++;
        killers[ply] = [move, ...(killers[ply] || []).filter(m => m !== move)].slice(0, 2);
        history[state.turn][move] = Math.min(10000, history[state.turn][move] + depth * depth);
        break;
      }
    }
    if (tableLimit && (table.size < tableLimit || table.has(key))) {
      table.set(key, { depth, score: toTable(best, ply), bestMove,
        bound: best <= originalAlpha ? 'upper' : best >= originalBeta ? 'lower' : 'exact' });
    }
    return best;
  }
  const moves = legalMoves(state);
  if (!moves.length) return { bestMove: -1, score: state.gameWinner ? terminal(0) : 0,
    moveScores: [], depth: 0, nodes: 0, solved: true, principalVariation: [], elapsedMs: performance.now()-started };
  if (deadMacro(state)) return { bestMove: moves[0], score: 0,
    moveScores: moves.map(move => ({move, score: 0, scoreBound: 'exact'})),
    depth: 0, nodes: 0, solved: true, principalVariation: [moves[0]],
    mateInPlies: null, scoreType: 'proven-draw', elapsedMs: performance.now()-started };
  const symmetries = options.symmetry === false ? rootSymmetries(state).slice(0,1) : rootSymmetries(state);
  // A bounded one-ply fallback is preferable to inventing equal zero scores.
  let completed = moves.map(move => ({ move, score: child(move, () => state.gameWinner
    ? terminal(1) : (state.turn === 'X' ? 1 : -1) * evaluateState(state)) }));
  completed.sort((a,b) => b.score - a.score || a.move - b.move);
  let depthDone = 0, pv = [completed[0].move];
  const remainingCells = state.boards.reduce((sum,b,i) => sum + (state.winners[i] ? 0 : b.filter(m => !m).length), 0);
  for (let depth = 1; depth <= maxDepth; depth++) {
    const iteration = [];
    let rootAlpha = -INFINITY;
    const equivalent = new Map();
    try {
      // Exact, comparable root scores are required for review regret and puzzle answers.
      for (const { move } of completed) {
        const group = orbit(move, symmetries);
        if (equivalent.has(group)) { iteration.push({...equivalent.get(group), move}); continue; }
        let score, scoreBound = 'exact';
        if (options.bestOnly && iteration.length) {
          score = child(move, () => negamax(depth - 1, -rootAlpha - 1, -rootAlpha, 1));
          if (score > rootAlpha) score = child(move, () => negamax(depth - 1, -INFINITY, INFINITY, 1));
          else scoreBound = 'upper';
        } else score = child(move, () => negamax(depth - 1, -INFINITY, INFINITY, 1));
        rootAlpha = Math.max(rootAlpha, score);
        const candidate = options.bestOnly ? {move, score, scoreBound} : {move, score};
        iteration.push(candidate); equivalent.set(group, candidate);
      }
    } catch (error) { if (error !== ABORT) throw error; stopped = true; break; }
    iteration.sort((a,b) => b.score - a.score || Number(a.scoreBound === 'upper') - Number(b.scoreBound === 'upper') || a.move - b.move);
    completed = iteration; depthDone = depth;
    const lineState = cloneState(state); pv = [completed[0].move];
    makeMove(lineState, pv[0]);
    for (let i = 1; i < depth && !lineState.gameWinner; i++) {
      const entry = table.get(positionKey(lineState));
      if (!entry || entry.bound !== 'exact' || !legalMoves(lineState).includes(entry.bestMove)) break;
      pv.push(entry.bestMove); makeMove(lineState, entry.bestMove);
    }
    if (Math.abs(completed[0].score) >= MATE || depth >= remainingCells) break;
  }
  const score = completed[0].score;
  return { bestMove: completed[0].move, score, moveScores: completed, depth: depthDone,
    nodes, rootSymmetries: symmetries.length, selectiveDepth, tableHits: hits, cutoffs, elapsedMs: performance.now()-started,
    stopped, solved: (depthDone > 0 && (Math.abs(score) >= MATE || depthDone >= remainingCells)),
    mateInPlies: depthDone > 0 && Math.abs(score) >= MATE ? Math.sign(score) * (WIN_SCORE-Math.abs(score)) : null,
    principalVariation: pv, scoreType: depthDone > 0 ? 'search' : 'static-fallback' };
}
module.exports = { searchPosition, positionKey };
