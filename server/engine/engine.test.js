const assert = require('node:assert/strict');
const test = require('node:test');
const {
  emptyState,
  legalMoves,
  makeMove,
  unmakeMove,
  searchPosition
} = require('./index');

test('make and unmake restore the full position', () => {
  const state = emptyState();
  const original = JSON.stringify(state);
  const undo = makeMove(state, 40);

  assert.equal(state.activeBoard, 4);
  assert.equal(state.turn, 'O');
  unmakeMove(state, undo);
  assert.equal(JSON.stringify(state), original);
});

test('search finds a move that immediately wins the macro game', () => {
  const state = emptyState();
  state.turn = 'X';
  state.winners[0] = 'X';
  state.winners[1] = 'X';
  state.boards[2][0] = 'X';
  state.boards[2][1] = 'X';

  const result = searchPosition(state, { maxDepth: 3, nodeLimit: 2000 });

  assert.equal(result.bestMove, 20);
  assert.ok(result.moveScores[0].score >= 100000 - 2);
});

test('completed macro boards produce a drawn terminal position with no moves', () => {
  const state = emptyState();
  state.winners = ['D', 'D', 'D', 'D', 'D', 'D', 'D', 'D', 'D'];

  const result = searchPosition(state, { maxDepth: 2, nodeLimit: 100 });

  assert.deepEqual(legalMoves(state), []);
  assert.equal(result.bestMove, -1);
});
