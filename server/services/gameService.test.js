const assert = require('node:assert/strict');
const test = require('node:test');
const Game = require('../models/Game');
const { saveGameResult } = require('./gameService');

test('completed games persist both players’ Elo snapshots', async t => {
  const originalSave = Game.prototype.save;
  let savedGame;
  Game.prototype.save = async function save() {
    savedGame = this;
    return this;
  };
  t.after(() => {
    Game.prototype.save = originalSave;
  });

  const playerIds = [
    '000000000000000000000001',
    '000000000000000000000002'
  ];
  const ratingChanges = [
    { player: playerIds[0], before: 1200, after: 1212, change: 12 },
    { player: playerIds[1], before: 1200, after: 1188, change: -12 }
  ];

  const gameId = await saveGameResult({
    playerDetails: [
      { id: playerIds[0], elo: 1200 },
      { id: playerIds[1], elo: 1200 }
    ],
    gameWinner: 'X',
    timeControl: { base: 180000, increment: 2000 },
    ratingChanges
  });

  assert.ok(gameId);
  assert.ok(savedGame);
  assert.deepEqual(
    savedGame.ratingChanges.map(change => ({
      player: change.player.toString(),
      before: change.before,
      after: change.after,
      change: change.change
    })),
    ratingChanges
  );
});
