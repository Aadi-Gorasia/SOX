const assert = require('node:assert/strict');
const test = require('node:test');
const User = require('../models/User');
const { updateEloAndStats } = require('./eloService');

function stubUsers(t, users) {
  const originalFindById = User.findById;
  User.findById = async id => users.get(String(id)) || null;
  t.after(() => {
    User.findById = originalFindById;
  });
}

function createUser(id, elo) {
  return {
    _id: id,
    elo,
    wins: 0,
    losses: 0,
    draws: 0,
    save: async () => {}
  };
}

test('Elo updates return each player’s actual before and after ratings', async t => {
  const winner = createUser('winner', 1200);
  const loser = createUser('loser', 1200);
  stubUsers(t, new Map([[winner._id, winner], [loser._id, loser]]));

  const result = await updateEloAndStats(winner._id, loser._id);

  assert.deepEqual(result, {
    p1: { id: 'winner', oldElo: 1200, newElo: 1212, change: 12 },
    p2: { id: 'loser', oldElo: 1200, newElo: 1188, change: -12 }
  });
});

test('draws record rating changes calculated from both pre-game ratings', async t => {
  const playerA = createUser('player-a', 1400);
  const playerB = createUser('player-b', 1200);
  stubUsers(t, new Map([[playerA._id, playerA], [playerB._id, playerB]]));

  const result = await updateEloAndStats(playerA._id, playerB._id, true);

  assert.equal(result.p1.oldElo, 1400);
  assert.equal(result.p1.newElo, 1394);
  assert.equal(result.p1.change, -6);
  assert.equal(result.p2.oldElo, 1200);
  assert.equal(result.p2.newElo, 1206);
  assert.equal(result.p2.change, 6);
});
