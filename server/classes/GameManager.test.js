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
