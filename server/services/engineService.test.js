const assert = require('node:assert/strict');
const test = require('node:test');
const {
  checkPuzzleAnswer,
  difficultyForRating,
  getBestMove,
  evaluatePosition,
  annotateGame,
  buildReviewSummary,
  classifyMove,
  generatePuzzlesFromAnnotations
} = require('./engineService');
const Game = require('../models/Game');

test('puzzle difficulty tracks the competitive rating bands', () => {
  assert.equal(difficultyForRating(700).label, 'Beginner');
  assert.equal(difficultyForRating(1100).label, 'Developing');
  assert.equal(difficultyForRating(1400).label, 'Intermediate');
  assert.equal(difficultyForRating(1700).label, 'Advanced');
  assert.equal(difficultyForRating(2100).label, 'Expert');
});

test('puzzle answers must be legal top-scoring moves', async () => {
  const evaluation = await getBestMove([]);
  const correct = await checkPuzzleAnswer([], evaluation.bestMove);
  const incorrect = await checkPuzzleAnswer([], 80);

  assert.equal(correct.correct, true);
  assert.equal(incorrect.correct, false);
  assert.ok(evaluation.acceptableMoves.includes(evaluation.bestMove));
});

test('invalid move histories and out-of-range answers are rejected', async () => {
  const invalidPosition = await checkPuzzleAnswer([0, 0], 1);
  const invalidAnswer = await checkPuzzleAnswer([], 81);

  assert.equal(invalidPosition.correct, false);
  assert.equal(invalidPosition.bestMove, -1);
  assert.equal(invalidAnswer.correct, false);
  assert.equal(invalidAnswer.bestMove, -1);
});

test('review annotations and summary fields survive game schema serialization', async () => {
  const annotations = await annotateGame([40, 39, 27, 0, 1]);
  const reviewSummary = buildReviewSummary(annotations);
  const persistedGame = new Game({
    annotations,
    reviewSummary
  }).toObject();

  assert.equal(persistedGame.annotations.length, annotations.length);
  assert.deepEqual(persistedGame.annotations[4].positionStateBefore, [40, 39, 27, 0]);
  assert.equal(persistedGame.reviewSummary.tacticalMissesCount, reviewSummary.tacticalMissesCount);
  assert.equal(
    persistedGame.reviewSummary.compiledAtTimestamp,
    reviewSummary.compiledAtTimestamp
  );
  assert.ok(persistedGame.annotations.every(annotation =>
    typeof annotation.quality === 'string' &&
    typeof annotation.explanation === 'string' &&
    typeof annotation.recommendation === 'string'
  ));
  assert.equal(reviewSummary.sideSummaries.X.movesReviewed, 3);
  assert.equal(reviewSummary.sideSummaries.O.movesReviewed, 2);
  assert.ok(Number.isFinite(persistedGame.annotations[0].positionEvaluation));
  assert.ok(Number.isFinite(persistedGame.annotations[0].positionEvaluationAfter));
});

test('move review distinguishes tactical wins, top choices, and missed wins', () => {
  const best = { score: 100, winsGame: true };

  assert.equal(classifyMove({
    played: { score: 100, createsMacroFork: true },
    best,
    regret: 0,
    wasOptimal: true
  }).code, 'brilliant');
  assert.equal(classifyMove({
    played: { score: 100, capturesSector: true },
    best,
    regret: 0,
    wasOptimal: true
  }).code, 'great');
  assert.equal(classifyMove({
    played: { score: -200, capturesSector: true },
    best: { score: 100 },
    regret: 300,
    wasOptimal: false
  }).code, 'mistake');
  assert.equal(classifyMove({
    played: { score: 100 },
    best: { score: 100 },
    regret: 0,
    wasOptimal: true
  }).code, 'best');
  assert.equal(classifyMove({
    played: { score: 90 },
    best,
    regret: 10,
    wasOptimal: false,
    missedImmediateWin: true
  }).code, 'miss');
  assert.equal(classifyMove({
    played: { score: -600 },
    best: { score: 100 },
    regret: 700,
    wasOptimal: false
  }).code, 'blunder');
});

test('ordinary move grades progress from excellent through blunder', () => {
  const expectedGrades = [
    [0, 'best'],
    [20, 'excellent'],
    [60, 'good'],
    [120, 'fine'],
    [220, 'inaccuracy'],
    [400, 'mistake'],
    [600, 'blunder']
  ];

  expectedGrades.forEach(([regret, expected]) => {
    assert.equal(classifyMove({
      played: { score: 1000 - regret },
      best: { score: 1000 },
      regret,
      wasOptimal: regret === 0
    }).code, expected);
  });
});

test('review analysis assigns guidance to every move in a complete legal sequence', async () => {
  const moves = [];
  for (let ply = 0; ply < 40; ply += 1) {
    const evaluation = await getBestMove(moves);
    if (evaluation.bestMove < 0) break;
    const legalCandidates = evaluation.moveScores;
    moves.push(legalCandidates[(ply * 7) % legalCandidates.length].move);
  }

  const annotations = await annotateGame(moves);
  const summary = buildReviewSummary(annotations);
  assert.ok(moves.length >= 20);
  assert.equal(annotations.length, moves.length);
  assert.ok(annotations.every(annotation =>
    annotation.quality !== 'unrated' &&
    annotation.explanation &&
    annotation.recommendation &&
    Number.isFinite(annotation.positionEvaluation) &&
    Number.isFinite(annotation.positionEvaluationAfter)
  ));
  for (const [index, annotation] of annotations.entries()) {
    const evaluated = await getBestMove(moves.slice(0, index));
    assert.ok(
      evaluated.moveScores.some(candidate => candidate.move === annotation.bestMove),
      `suggested move ${annotation.bestMove} at ply ${index + 1} must be legal`
    );
    assert.equal(annotation.positionEvaluation, evaluatePosition(moves.slice(0, index)));
    assert.equal(
      annotation.positionEvaluationAfter,
      evaluatePosition(moves.slice(0, index + 1))
    );
  }
  assert.equal(
    summary.sideSummaries.X.movesReviewed + summary.sideSummaries.O.movesReviewed,
    moves.length
  );
});

test('review puzzles expose a valid prior position and engine solution', () => {
  const puzzles = generatePuzzlesFromAnnotations([], [{
    moveNumber: 5,
    wasOptimal: false,
    positionStateBefore: [40, 39, 27, 0],
    bestMove: 1
  }]);

  assert.deepEqual(puzzles, [{
    difficulty: 'Developing',
    moveNumber: 5,
    position: [40, 39, 27, 0],
    solution: 1,
    theme: 'Tactical improvement'
  }]);
});
