const assert = require('node:assert/strict');
const test = require('node:test');
const {
  checkPuzzleAnswer,
  difficultyForRating,
  getBestMove
} = require('./engineService');

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
