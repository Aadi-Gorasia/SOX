const { WIN_LINES, INFINITY, WIN_SCORE } = require('./constants');
const { legalMoves, makeMove, unmakeMove, other, boardWinner } = require('./state');
const { evaluateState } = require('./evaluation');

const TERMINAL_THRESHOLD = WIN_SCORE - 1000;

function positionKey(state) {
  let key = '';
  for (const board of state.boards) {
    for (const mark of board) key += mark || '.';
  }
  return `${key}:${state.activeBoard === null ? '-' : state.activeBoard}:${state.turn}`;
}

function movePriority(state, move, preferredMove) {
  if (move === preferredMove) return 1000000;
  const macro = Math.floor(move / 9);
  const cell = move % 9;
  const board = state.boards[macro];
  const player = state.turn;
  const opponent = other(player);
  let priority = 0;
  if (cell === 4) priority += 30;
  else if (cell % 2 === 0) priority += 12;

  for (const [a, b, c] of WIN_LINES) {
    if (![a, b, c].includes(cell)) continue;
    const marks = [a, b, c].filter(index => index !== cell).map(index => board[index]);
    if (marks.filter(mark => mark === player).length === 2) priority += 200;
    if (marks.filter(mark => mark === opponent).length === 2) priority += 120;
  }

  const nextBoardMarks = [...board];
  nextBoardMarks[cell] = player;
  const sectorWinner = boardWinner(nextBoardMarks);
  if (sectorWinner === player) priority += 350;

  const macroWinners = [...state.winners];
  if (sectorWinner) macroWinners[macro] = sectorWinner;
  for (const [a, b, c] of WIN_LINES) {
    if (![a, b, c].includes(macro)) continue;
    const marks = [a, b, c].filter(index => index !== macro).map(index => macroWinners[index]);
    if (marks.filter(mark => mark === player).length === 2) priority += 500;
    if (marks.filter(mark => mark === opponent).length === 2) priority += 180;
  }

  return priority;
}

function orderMoves(state, moves, preferredMove) {
  return moves
    .map(move => ({ move, priority: movePriority(state, move, preferredMove) }))
    .sort((a, b) => b.priority - a.priority || a.move - b.move)
    .map(item => item.move);
}

function searchPosition(state, options = {}) {
  const maxDepth = options.maxDepth ?? 8;
  const nodeLimit = options.nodeLimit ?? 5000;
  const table = new Map();
  let nodes = 0;
  let stopped = false;
  let principalMove = null;

  function negamax(depth, alpha, beta, ply) {
    nodes += 1;
    if (nodes > nodeLimit) {
      stopped = true;
      return 0;
    }
    if (state.gameWinner) {
      if (state.gameWinner === 'D') return 0;
      return state.gameWinner === state.turn ? WIN_SCORE - ply : -WIN_SCORE + ply;
    }
    if (depth <= 0) {
      const score = evaluateState(state);
      return state.turn === 'X' ? score : -score;
    }

    const key = positionKey(state);
    const cached = table.get(key);
    const alphaOriginal = alpha;
    if (cached && cached.depth >= depth) {
      if (cached.bound === 'exact') return cached.score;
      if (cached.bound === 'lower') alpha = Math.max(alpha, cached.score);
      else beta = Math.min(beta, cached.score);
      if (alpha >= beta) return cached.score;
    }

    const moves = legalMoves(state);
    if (!moves.length) return 0;
    const ordered = orderMoves(state, moves, cached?.bestMove);
    let bestScore = -INFINITY;
    let bestMove = ordered[0];
    for (const move of ordered) {
      const undo = makeMove(state, move);
      const score = -negamax(depth - 1, -beta, -alpha, ply + 1);
      unmakeMove(state, undo);
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (alpha >= beta || stopped) break;
    }

    if (!stopped) {
      const bound = bestScore <= alphaOriginal ? 'upper'
        : bestScore >= beta ? 'lower' : 'exact';
      table.set(key, { depth, score: bestScore, bound, bestMove });
    }
    return bestScore;
  }

  const rootMoves = orderMoves(state, legalMoves(state), null);
  if (!rootMoves.length) {
    return { bestMove: -1, score: 0, moveScores: [], depth: 0, nodes };
  }

  let completedScores = rootMoves.map(move => ({ move, score: 0 }));
  let completedDepth = 0;
  let preferredMove = null;
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const scores = [];
    stopped = false;
    for (const move of orderMoves(state, rootMoves, preferredMove)) {
      const undo = makeMove(state, move);
      const score = -negamax(depth - 1, -INFINITY, INFINITY, 1);
      unmakeMove(state, undo);
      scores.push({ move, score });
      if (stopped) break;
    }
    if (stopped || scores.length !== rootMoves.length) break;
    scores.sort((a, b) => b.score - a.score || a.move - b.move);
    completedScores = scores;
    completedDepth = depth;
    preferredMove = scores[0].move;
    principalMove = preferredMove;
    if (Math.abs(scores[0].score) >= TERMINAL_THRESHOLD) break;
  }

  return {
    bestMove: principalMove ?? completedScores[0].move,
    score: completedScores[0].score,
    moveScores: completedScores,
    depth: completedDepth,
    nodes
  };
}

module.exports = { searchPosition, positionKey };
