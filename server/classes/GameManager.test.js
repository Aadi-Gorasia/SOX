const assert = require('node:assert/strict');
const test = require('node:test');
const GameManager = require('./GameManager');

test('cancelMatchmaking removes a player from every time-control queue', () => {
  const gameManager = new GameManager({});
  const socket = { id: 'searching-player' };
  const opponent = { id: 'opponent' };

  gameManager.addPlayerToQueue(socket, '3+0', 'X');
  gameManager.addPlayerToQueue(opponent, '3+0', 'O');
  gameManager.addPlayerToQueue(socket, '5+0', 'O');

  gameManager.cancelMatchmaking(socket);

  assert.deepEqual(
    Array.from(gameManager.waitingPlayers.entries()),
    [['3+0', [{ socket: opponent, preferredSymbol: 'O' }]]]
  );
});

test('disconnect cleanup removes the disconnected player from the queue', () => {
  const gameManager = new GameManager({});
  const socket = { id: 'disconnected-player' };

  gameManager.addPlayerToQueue(socket, '10+0', 'X');
  gameManager.handleDisconnect(socket);

  assert.equal(gameManager.waitingPlayers.has('10+0'), false);
});
