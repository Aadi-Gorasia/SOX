const assert = require('node:assert/strict');
const test = require('node:test');
const GameManager = require('./GameManager');
const User = require('../models/User');

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

function createDrawTestManager() {
  const emitted = [];
  const io = {
    to(room) {
      return {
        emit(event, payload) {
          emitted.push({ room, event, payload });
        }
      };
    }
  };
  const gameManager = new GameManager(io);
  const game = {
    id: 'draw-test',
    players: ['socket-x', 'socket-o'],
    playerDetails: [
      { id: 'user-x', username: 'Player X' },
      { id: 'user-o', username: 'Player O' }
    ],
    gameWinner: null,
    drawOffer: null,
    playerToMove: 'socket-x',
    allBoards: Array.from({ length: 9 }, () => Array(9).fill(null)),
    boardWinners: Array(9).fill(null),
    activeBoard: null,
    timeControl: { increment: 0 },
    playerTimes: [60000, 60000],
    moves: [],
    engineMoves: []
  };
  gameManager.games.set(game.id, game);
  return { gameManager, game, emitted };
}

test('only a game participant can offer a draw, and the offer is broadcast', () => {
  const { gameManager, game, emitted } = createDrawTestManager();

  gameManager.offerDraw(game.id, 'spectator');
  assert.equal(game.drawOffer, null);

  gameManager.offerDraw(game.id, 'user-x');
  assert.equal(game.drawOffer, 'user-x');
  assert.deepEqual(emitted.map(({ room, event }) => [room, event]), [
    ['socket-o', 'drawOffered'],
    [game.id, 'updateGame']
  ]);
});

test('only the opponent can accept a pending draw offer', async () => {
  const { gameManager, game } = createDrawTestManager();
  const ended = [];
  gameManager.endGame = async (gameId, result) => ended.push({ gameId, result });

  gameManager.offerDraw(game.id, 'user-x');
  await gameManager.acceptDraw(game.id, 'user-x');
  await gameManager.acceptDraw(game.id, 'spectator');
  assert.equal(ended.length, 0);

  await gameManager.acceptDraw(game.id, 'user-o');
  assert.deepEqual(ended, [{
    gameId: game.id,
    result: { winner: 'D', reason: 'agreement' }
  }]);
});

test('only the opponent can decline a pending draw offer', () => {
  const { gameManager, game } = createDrawTestManager();

  gameManager.offerDraw(game.id, 'user-x');
  gameManager.declineDraw(game.id, 'user-x');
  assert.equal(game.drawOffer, 'user-x');

  gameManager.declineDraw(game.id, 'user-o');
  assert.equal(game.drawOffer, null);
});

test('a legal move clears a pending draw offer', async () => {
  const { gameManager, game } = createDrawTestManager();
  const socket = { id: 'socket-x' };
  game.drawOffer = 'user-o';

  await gameManager.makeMove(socket, {
    gameId: game.id,
    boardIndex: 0,
    cellIndex: 0
  });

  assert.equal(game.drawOffer, null);
});

test('a private game admits one invited player and rejects nonparticipants', async t => {
  const originalFindById = User.findById;
  const users = new Map([
    ['host', { _id: 'host', username: 'Host', elo: 1200 }],
    ['guest', { _id: 'guest', username: 'Guest', elo: 1300 }],
    ['spectator', { _id: 'spectator', username: 'Spectator', elo: 1000 }],
    ['another-host', { _id: 'another-host', username: 'Another host', elo: 1200 }]
  ]);
  User.findById = id => ({
    select: async () => users.get(String(id))
  });
  t.after(() => {
    User.findById = originalFindById;
  });

  const io = { to: () => ({ emit: () => {} }) };
  const gameManager = new GameManager(io);
  const host = {
    id: 'host-socket',
    userId: 'host',
    join: () => {}
  };
  const guest = {
    id: 'guest-socket',
    userId: 'guest',
    join: () => {},
    emit: () => {}
  };
  const spectator = {
    id: 'spectator-socket',
    userId: 'spectator',
    join: () => {}
  };

  const game = await gameManager.createPrivateGame(host, '5+0', 'X');
  assert.equal(game.waitingForOpponent, true);

  const joinedGame = await gameManager.joinGame(guest, game.id);
  assert.equal(joinedGame, game);
  assert.equal(game.waitingForOpponent, false);
  assert.deepEqual(game.playerDetails.map(player => player.id), ['host', 'guest']);
  assert.deepEqual(game.players, ['host-socket', 'guest-socket']);
  assert.equal(gameManager.getActiveGameId('guest'), game.id);
  assert.equal(await gameManager.joinGame(spectator, game.id), null);

  clearInterval(gameManager.timers.get(game.id));
  gameManager.timers.delete(game.id);

  const secondHost = {
    id: 'second-host-socket',
    userId: 'another-host',
    join: () => {}
  };
  const waitingGame = await gameManager.createPrivateGame(secondHost, '5+0');
  gameManager.handleDisconnect(secondHost);
  assert.equal(gameManager.getGame(waitingGame.id), undefined);
  assert.equal(gameManager.getActiveGameId('another-host'), undefined);
});
