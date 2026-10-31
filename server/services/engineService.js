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

function scoreMove(state, move) {
  const player = state.turn;
  const opponent = other(player);
  const macro = Math.floor(move / 9);
  const cell = move % 9;
  const before = state.boards[macro];
  const next = applyMove(state, move);
  const previousForks = countMacroForks(state, player);
  const nextForks = countMacroForks(next, player);
  const capturesSector = next.winners[macro] === player && state.winners[macro] !== player;
  const createsMacroFork = nextForks > previousForks;
  const remainingOpponentThreats = microThreats(next.boards[macro], opponent);
  const blockedThreats = microThreats(before, opponent) - remainingOpponentThreats;
  let score = 0;
  let theme = 'Sector control';

  if (next.gameWinner === player) {
    score += 10000;
    theme = 'Macro checkmate';
  }
  if (capturesSector) {
    score += 950;
    theme = 'Capture a sector';
  }
  if (createsMacroFork) {
    score += 1300;
    theme = 'Create a macro fork';
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

  return {
    score,
    theme,
    winsGame: next.gameWinner === player,
    capturesSector,
    createsMacroFork
  };
}

function countMacroForks(state, player) {
  return WIN_LINES.filter(line =>
    line.filter(index => state.winners[index] === player).length === 2 &&
    line.filter(index => state.winners[index] === null).length === 1
  ).length;
}

function evaluatePosition(positionSequence = []) {
  const state = deriveState(positionSequence);
  if (!state) return null;
  if (state.gameWinner === 'X') return 10000;
  if (state.gameWinner === 'O') return -10000;

  let score = state.winners.reduce((total, winner) => {
    if (winner === 'X') return total + 500;
    if (winner === 'O') return total - 500;
    return total;
  }, 0);

  for (const line of WIN_LINES) {
    const lineWinners = line.map(index => state.winners[index]);
    const xCount = lineWinners.filter(winner => winner === 'X').length;
    const oCount = lineWinners.filter(winner => winner === 'O').length;
    const openCount = lineWinners.filter(winner => winner === null).length;
    if (oCount === 0 && openCount > 0) score += xCount * xCount * 75;
    if (xCount === 0 && openCount > 0) score -= oCount * oCount * 75;
  }

  state.boards.forEach((board, index) => {
    if (state.winners[index]) return;
    score += (microThreats(board, 'X') - microThreats(board, 'O')) * 24;
    const center = board[4];
    if (center === 'X') score += 5;
    if (center === 'O') score -= 5;
  });

  return score;
}

async function getBestMove(positionSequence = [], difficultyRating = 1500) {
  const state = deriveState(positionSequence);
  if (!state) return { bestMove: -1, score: 0, theme: 'Invalid position' };
  const candidates = legalMoves(state)
    .map(move => ({ move, ...scoreMove(state, move) }))
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
      score: candidate.score,
      theme: candidate.theme,
      winsGame: candidate.winsGame,
      capturesSector: candidate.capturesSector,
      createsMacroFork: candidate.createsMacroFork
    })),
    acceptableMoves: candidates
      .filter(candidate => bestScore - candidate.score <= 15)
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
  const ranked = moves.map(move => ({ move, ...scoreMove(state, move) })).sort((a, b) => b.score - a.score);
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
    const played = evaluation.moveScores?.find(candidate =>
      candidate.move === movePlayed
    );
    const best = evaluation.moveScores?.find(candidate =>
      candidate.move === evaluation.bestMove
    );
    const regret = played
      ? Math.max(0, evaluation.score - played.score)
      : null;
    const wasOptimal = evaluation.acceptableMoves?.includes(movePlayed) || false;
    const nextState = deriveState(runningSequence);
    const nextMoveState = nextState && applyMove(nextState, movePlayed);
    const missedImmediateWin = Boolean(best?.winsGame && !played?.winsGame);
    const quality = classifyMove({
      played,
      best,
      regret,
      wasOptimal,
      missedImmediateWin
    });
    const recommendation = formatMove(evaluation.bestMove);
    const explanation = explainMove({
      quality,
      theme: evaluation.theme,
      recommendation,
      regret,
      missedImmediateWin,
      played
    });
    const positionEvaluation = evaluatePosition(runningSequence);
    const positionEvaluationAfter = nextMoveState
      ? evaluatePosition([...runningSequence, movePlayed])
      : positionEvaluation;
    annotations.push({
      moveNumber: i + 1,
      idx: movePlayed,
      side: typeof moves[i] === 'number'
        ? i % 2
        : moves[i].side ?? i % 2,
      bestMove: evaluation.bestMove,
      playedMove: movePlayed,
      optimalMove: evaluation.bestMove,
      positionStateBefore: [...runningSequence],
      wasOptimal,
      quality: quality.code,
      qualityLabel: quality.label,
      explanation,
      recommendation: missedImmediateWin
        ? `${recommendation} would have won the macro game.`
        : recommendation === 'No legal move'
          ? 'No legal alternative was available.'
          : `Try ${recommendation} instead. ${evaluation.theme}.`,
      theme: evaluation.theme,
      positionEvaluation,
      positionEvaluationAfter,
      positionalScore: played?.score ?? null,
      score: played?.score ?? null,
      scoreBefore: evaluation.score,
      delta: regret === null ? null : -regret,
      regret,
      brilliant: quality.code === 'brilliant',
      great: quality.code === 'great',
      blunder: quality.code === 'blunder',
      mistake: quality.code === 'mistake',
      inaccuracy: quality.code === 'inaccuracy',
      isEnginePick: wasOptimal,
      mateIn: null,
      moveWinsGame: Boolean(played?.winsGame),
      moveCapturesSector: Boolean(played?.capturesSector),
      createsMacroFork: Boolean(played?.createsMacroFork),
      nextPositionValid: Boolean(nextMoveState)
    });
    runningSequence.push(movePlayed);
  }
  return annotations;
}

const MOVE_QUALITY = {
  brilliant: { label: 'Brilliant', points: 100 },
  great: { label: 'Great', points: 98 },
  best: { label: 'Best', points: 96 },
  excellent: { label: 'Excellent', points: 91 },
  good: { label: 'Good', points: 84 },
  fine: { label: 'Fine', points: 74 },
  inaccuracy: { label: 'Inaccuracy', points: 58 },
  mistake: { label: 'Mistake', points: 32 },
  blunder: { label: 'Blunder', points: 10 },
  miss: { label: 'Miss', points: 0 },
  unrated: { label: 'Unrated', points: null }
};

function classifyMove({ played, best, regret, wasOptimal, missedImmediateWin }) {
  if (!played) return { code: 'unrated', ...MOVE_QUALITY.unrated };
  if (missedImmediateWin) return { code: 'miss', ...MOVE_QUALITY.miss };
  if (played.createsMacroFork && regret <= 130) {
    return { code: 'brilliant', ...MOVE_QUALITY.brilliant };
  }
  if (played.winsGame || (played.capturesSector && regret <= 130)) {
    return { code: 'great', ...MOVE_QUALITY.great };
  }
  if (wasOptimal || (best && regret === 0)) return { code: 'best', ...MOVE_QUALITY.best };
  if (regret <= 25) return { code: 'excellent', ...MOVE_QUALITY.excellent };
  if (regret <= 70) return { code: 'good', ...MOVE_QUALITY.good };
  if (regret <= 130) return { code: 'fine', ...MOVE_QUALITY.fine };
  if (regret <= 250) return { code: 'inaccuracy', ...MOVE_QUALITY.inaccuracy };
  if (regret <= 500) return { code: 'mistake', ...MOVE_QUALITY.mistake };
  return { code: 'blunder', ...MOVE_QUALITY.blunder };
}

function formatMove(move) {
  if (!Number.isInteger(move) || move < 0 || move > 80) return 'No legal move';
  const macro = Math.floor(move / 9);
  const cell = move % 9;
  const macroName = `${String.fromCharCode(65 + (macro % 3))}${Math.floor(macro / 3) + 1}`;
  const cellName = [
    'top-left', 'top-center', 'top-right',
    'middle-left', 'center', 'middle-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ][cell];
  return `${macroName} · ${cellName}`;
}

function explainMove({ quality, theme, recommendation, regret, missedImmediateWin, played }) {
  if (quality.code === 'unrated') return 'This move could not be evaluated from the recorded position.';
  if (missedImmediateWin) {
    return `There was a winning continuation. ${recommendation} would have completed the macro line.`;
  }
  if (quality.code === 'brilliant') {
    return 'A strong tactical idea: this move creates two macro-board winning threats at once.';
  }
  if (quality.code === 'great') {
    return played.winsGame
      ? 'This move completes a winning macro line and ends the game.'
      : 'This move captures a sector and strengthens your route to a macro-board win.';
  }
  if (quality.code === 'best') return `This is the engine’s top-scoring move. ${theme}.`;
  if (quality.code === 'excellent' || quality.code === 'good') {
    return `A strong choice, close to the top continuation (${regret} evaluation points behind).`;
  }
  if (quality.code === 'fine') {
    return `Playable, but it gives up a small amount of initiative. ${recommendation} keeps more pressure.`;
  }
  if (quality.code === 'inaccuracy') {
    return `This softens your position. ${recommendation} was the more active continuation.`;
  }
  if (quality.code === 'mistake') {
    return `A missed opportunity that gives away useful momentum. ${recommendation} was stronger.`;
  }
  return `A major drop in the position. ${recommendation} was the best way to protect your macro-board chances.`;
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

  const qualityCounts = Object.fromEntries(
    Object.keys(MOVE_QUALITY).map(code => [code, 0])
  );
  annotations.forEach(annotation => {
    const code = annotation.quality ??
      ((annotation.wasOptimal ?? annotation.isEnginePick) ? 'best' :
        annotation.blunder ? 'blunder' :
          annotation.mistake ? 'mistake' :
            annotation.inaccuracy ? 'inaccuracy' : 'good');
    if (Object.hasOwn(qualityCounts, code)) qualityCounts[code] += 1;
  });
  const qualityCodeFor = annotation => annotation.quality ??
    ((annotation.wasOptimal ?? annotation.isEnginePick) ? 'best' :
      annotation.blunder ? 'blunder' :
        annotation.mistake ? 'mistake' :
          annotation.inaccuracy ? 'inaccuracy' : 'good');
  const summarize = entries => {
    const qualityCounts = Object.fromEntries(
          Object.keys(MOVE_QUALITY).map(code => [code, 0])
    );
    entries.forEach(annotation => {
          const code = qualityCodeFor(annotation);
          if (Object.hasOwn(qualityCounts, code)) qualityCounts[code] += 1;
    });
    const rated = entries.filter(annotation =>
          MOVE_QUALITY[qualityCodeFor(annotation)]?.points != null
    );
    const accuracy = rated.length
          ? Math.round(rated.reduce((sum, annotation) =>
            sum + (MOVE_QUALITY[qualityCodeFor(annotation)]?.points ?? 0), 0
          ) / rated.length)
          : 0;
    return { accuracy, qualityCounts, movesReviewed: entries.length };
  };
  const sideSummaries = {
    X: summarize(annotations.filter((annotation, index) =>
          (annotation.side ?? index % 2) === 0
    )),
    O: summarize(annotations.filter((annotation, index) =>
          (annotation.side ?? index % 2) === 1
    ))
  };
  const rated = annotations.filter(annotation =>
    MOVE_QUALITY[qualityCodeFor(annotation)]?.points != null
  );
  const accuracy = rated.length
    ? Math.round(rated.reduce((sum, annotation) => {
      return sum + (MOVE_QUALITY[qualityCodeFor(annotation)]?.points ?? 0);
    }, 0) / rated.length)
    : 0;
  const optimalCount = qualityCounts.best + qualityCounts.great + qualityCounts.brilliant;
  return {
    accuracy,
    tacticalMissesCount: annotations.length - optimalCount,
    qualityCounts,
    movesReviewed: annotations.length,
    sideSummaries,
    brilliantMoves: annotations.filter(annotation => annotation.quality === 'brilliant').map(annotation => annotation.moveNumber),
    greatMoves: annotations.filter(annotation => annotation.quality === 'great').map(annotation => annotation.moveNumber),
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
  evaluatePosition,
  checkPuzzleAnswer,
  annotateGame,
  buildReviewSummary,
  classifyMove,
  generatePuzzlesFromAnnotations,
  generateAdaptivePuzzle,
  difficultyForRating
};
