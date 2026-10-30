/**
 * Lightweight Ultimate Tic-Tac-Toe tactical engine used by hints, reviews, and
 * training. It always derives legal moves from the same rules used by the board.
 */
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const other = player => (player === 'X' ? 'O' : 'X');

function boardWinner(cells) {
  for (const [a, b, c] of WIN_LINES) {
    if (cells[a] && cells[a] === cells[b] && cells[a] === cells[c]) return cells[a];
  }
  return cells.every(Boolean) ? 'D' : null;
}

function globalWinner(winners) {
  for (const [a, b, c] of WIN_LINES) {
    if (winners[a] && winners[a] !== 'D' && winners[a] === winners[b] && winners[a] === winners[c]) return winners[a];
  }
  return null;
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
    ? state.winners.map((winner, index) => (winner ? null : index)).filter(index => index !== null)
    : [state.activeBoard];
  return eligibleBoards.flatMap(macro => state.boards[macro]
    .map((mark, cell) => (mark || state.winners[macro] ? null : macro * 9 + cell))
    .filter(move => move !== null));
}

function applyMove(state, move) {
  const macro = Math.floor(move / 9);
  const cell = move % 9;
  if (!Number.isInteger(move) || macro < 0 || macro > 8 || cell < 0 || cell > 8 || !legalMoves(state).includes(move)) {
    return null;
  }

  const next = cloneState(state);
  const player = next.turn;
  next.boards[macro][cell] = player;
  next.winners[macro] = boardWinner(next.boards[macro]);
  next.gameWinner = globalWinner(next.winners);
  const targetBoard = cell;
  next.activeBoard = next.winners[targetBoard] ? null : targetBoard;
  next.turn = other(player);
  return next;
}

function deriveState(positionSequence = []) {
  const state = emptyState();
  for (const move of positionSequence) {
    const next = applyMove(state, move);
    if (!next) return null;
    Object.assign(state, next);
  }
  return state;
}

function microThreats(board, player) {
  let total = 0;
  for (const [a, b, c] of WIN_LINES) {
    const line = [board[a], board[b], board[c]];
    if (line.filter(mark => mark === player).length === 2 && line.filter(mark => mark === null).length === 1) total += 1;
  }
  return total;
}

function scoreMove(state, move, difficultyRating) {
  const player = state.turn;
  const opponent = other(player);
  const macro = Math.floor(move / 9);
  const cell = move % 9;
  const before = state.boards[macro];
  const next = applyMove(state, move);
  const remainingOpponentThreats = microThreats(next.boards[macro], opponent);
  const blockedThreats = microThreats(before, opponent) - remainingOpponentThreats;
  let score = 0;
  let theme = 'Sector control';

  if (next.gameWinner === player) {
    score += 10000;
    theme = 'Macro checkmate';
  }
  if (next.winners[macro] === player && state.winners[macro] !== player) {
    score += 950;
    theme = 'Capture a sector';
  }
  if (blockedThreats > 0) {
    score += 240 * blockedThreats;
    theme = 'Block the threat';
  }
  if (cell === 4) score += 60;
  if ([0, 2, 6, 8].includes(cell)) score += 35;
  if (next.activeBoard === null) score += 75;
  if (next.activeBoard !== null) {
    const forcedBoard = next.boards[next.activeBoard];
    const ownThreats = microThreats(forcedBoard, player);
    const theirThreats = microThreats(forcedBoard, opponent);
    score += ownThreats * 90 - theirThreats * 65;
    if (ownThreats) theme = 'Forced vector';
  }

  // At lower ratings obvious board geometry remains decisive. At higher ratings
  // forcing vectors and threats carry more weight, making positions meaningfully harder.
  const advancedWeight = clamp((difficultyRating - 900) / 1300, 0, 1);
  score += Math.round((Math.sin(move * 19 + state.boards.flat().filter(Boolean).length) + 1) * (1 - advancedWeight) * 28);
  return { score, theme };
}

async function getBestMove(positionSequence = [], difficultyRating = 1500) {
  const state = deriveState(positionSequence);
  if (!state) return { bestMove: -1, score: 0, theme: 'Invalid position' };
  const candidates = legalMoves(state)
    .map(move => ({ move, ...scoreMove(state, move, difficultyRating) }))
    .sort((a, b) => b.score - a.score || a.move - b.move);
  if (!candidates.length) return { bestMove: -1, score: 0, theme: 'No legal moves' };
  const bestScore = candidates[0].score;
  return {
    bestMove: candidates[0].move,
    score: bestScore,
    theme: candidates[0].theme,
    alternatives: candidates.slice(1, 4).map(candidate => candidate.move),
    moveScores: candidates.map(candidate => ({
      move: candidate.move,
      score: candidate.score
    })),
    acceptableMoves: candidates
      .filter(candidate => candidate.score === bestScore)
      .map(candidate => candidate.move),
    margin: candidates.length > 1 ? bestScore - candidates[1].score : bestScore
  };
}

function difficultyForRating(rating) {
  if (rating < 900) return { label: 'Beginner', minPlies: 7, maxPlies: 13, band: '900' };
  if (rating < 1200) return { label: 'Developing', minPlies: 12, maxPlies: 20, band: '1200' };
  if (rating < 1500) return { label: 'Intermediate', minPlies: 18, maxPlies: 29, band: '1500' };
  if (rating < 1800) return { label: 'Advanced', minPlies: 26, maxPlies: 40, band: '1800' };
  return { label: 'Expert', minPlies: 34, maxPlies: 52, band: '2200' };
}

function weightedRandomMove(state, rating) {
  const moves = legalMoves(state);
  if (!moves.length) return null;
  const ranked = moves.map(move => ({ move, ...scoreMove(state, move, rating) })).sort((a, b) => b.score - a.score);
  // Natural-looking games: lower skill makes more varied moves; advanced games
  // still include inaccuracies to create tactical opportunities.
  const spread = rating < 1200 ? Math.min(8, ranked.length) : rating < 1700 ? Math.min(5, ranked.length) : Math.min(3, ranked.length);
  return ranked[Math.floor(Math.random() * spread)].move;
}

async function generateAdaptivePuzzle(rating = 1200) {
  const normalizedRating = clamp(Math.round(rating / 25) * 25, 400, 2600);
  const difficulty = difficultyForRating(normalizedRating);
  const minimumTacticalScore = normalizedRating < 900 ? 150
    : normalizedRating < 1500 ? 200
      : normalizedRating < 1800 ? 240 : 300;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    let state = emptyState();
    const position = [];
    const length = difficulty.minPlies + Math.floor(Math.random() * (difficulty.maxPlies - difficulty.minPlies + 1));
    for (let ply = 0; ply < length && !state.gameWinner; ply += 1) {
      const move = weightedRandomMove(state, normalizedRating);
      if (move === null) break;
      position.push(move);
      state = applyMove(state, move);
    }
    if (state.gameWinner || legalMoves(state).length < 2) continue;
    // eslint-disable-next-line no-await-in-loop
    const evaluation = await getBestMove(position, normalizedRating);
    if (evaluation.bestMove < 0) continue;
    if (evaluation.score < minimumTacticalScore || evaluation.theme === 'Sector control') continue;
    return {
      difficulty: difficulty.label,
      difficultyRating: normalizedRating,
      theme: evaluation.theme,
      position,
      solution: evaluation.bestMove,
      score: evaluation.score,
      alternatives: evaluation.alternatives,
      moveNumber: position.length
    };
  }
  throw new Error('Unable to create a legal tactical position. Please retry.');
}

async function checkPuzzleAnswer(position = [], answer = -1, rating = 1500) {
  if (!Array.isArray(position) || position.length > 80 ||
      position.some(move => !Number.isInteger(move) || move < 0 || move > 80) ||
      !Number.isInteger(answer) || answer < 0 || answer > 80) {
    return { correct: false, bestMove: -1, score: 0 };
  }

  const evaluation = await getBestMove(position, rating);
  return {
    correct: evaluation.acceptableMoves?.includes(answer) || false,
    bestMove: evaluation.bestMove,
    score: evaluation.score,
    theme: evaluation.theme,
    acceptableMoves: evaluation.acceptableMoves || []
  };
}

async function annotateGame(moves = [], evaluationElo = 3500) {
  const annotations = [];
  const runningSequence = [];
  for (let i = 0; i < moves.length; i += 1) {
    const movePlayed = typeof moves[i] === 'number' ? moves[i] : moves[i].idx;
    const evaluation = await getBestMove(runningSequence, evaluationElo);
    const playedScore = evaluation.moveScores?.find(candidate =>
      candidate.move === movePlayed
    )?.score;
    const regret = playedScore === undefined
      ? 0
      : Math.max(0, evaluation.score - playedScore);
    const wasOptimal = evaluation.acceptableMoves?.includes(movePlayed) || false;
    annotations.push({
      moveNumber: i + 1,
      idx: movePlayed,
      bestMove: evaluation.bestMove,
      playedMove: movePlayed,
      optimalMove: evaluation.bestMove,
      positionStateBefore: [...runningSequence],
      wasOptimal,
      positionalScore: playedScore ?? 0,
      score: playedScore ?? 0,
      scoreBefore: evaluation.score,
      delta: wasOptimal ? 0 : -regret,
      blunder: !wasOptimal && regret > 200,
      mistake: !wasOptimal && regret > 100 && regret <= 200,
      inaccuracy: !wasOptimal && regret > 50 && regret <= 100,
      isEnginePick: wasOptimal,
      mateIn: null
    });
    runningSequence.push(movePlayed);
  }
  return annotations;
}

function buildReviewSummary(annotations = []) {
  if (!annotations.length) {
    return {
      accuracy: 0,
      tacticalMissesCount: 0,
      blunders: [],
      mistakes: [],
      inaccuracies: []
    };
  }

  const optimalCount = annotations.filter(annotation =>
    annotation.wasOptimal ?? annotation.isEnginePick
  ).length;
  return {
    accuracy: Math.round((optimalCount / annotations.length) * 100),
    tacticalMissesCount: annotations.length - optimalCount,
    blunders: annotations.filter(annotation => annotation.blunder).map(annotation => annotation.moveNumber),
    mistakes: annotations.filter(annotation => annotation.mistake).map(annotation => annotation.moveNumber),
    inaccuracies: annotations.filter(annotation => annotation.inaccuracy).map(annotation => annotation.moveNumber),
    compiledAtTimestamp: new Date().toISOString()
  };
}

function generatePuzzlesFromAnnotations(moves = [], annotations = []) {
  return annotations.filter(annotation =>
    !(annotation.wasOptimal ?? annotation.isEnginePick) &&
    (annotation.positionStateBefore?.length ?? 0) >= 4
  )
    .slice(0, 8)
    .map((annotation, index) => ({
      difficulty: index > 4 ? 'Advanced' : index > 1 ? 'Intermediate' : 'Developing',
      moveNumber: annotation.moveNumber,
      position: annotation.positionStateBefore,
      solution: annotation.bestMove ?? annotation.optimalMove,
      theme: 'Tactical improvement'
    }));
}

module.exports = {
  getBestMove,
  checkPuzzleAnswer,
  annotateGame,
  buildReviewSummary,
  generatePuzzlesFromAnnotations,
  generateAdaptivePuzzle,
  difficultyForRating
};
