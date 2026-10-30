const assert = require('node:assert/strict');
const test = require('node:test');
const TournamentManager = require('./TournamentManager');

test('a completed tournament match advances its winner through the bracket', async () => {
  const users = new Map();
  const games = [];
  let gameNumber = 0;
  const gameManager = {
    pendingUserGames: new Set(),
    getActiveGameId: () => null,
    async createTournamentGame(player1Id, player2Id) {
      const game = {
        id: `game-${++gameNumber}`,
        playerDetails: [users.get(player1Id), users.get(player2Id)],
        boardWinners: Array(9).fill(null),
        playerTimes: [300000, 300000]
      };
      games.push(game);
      return game;
    }
  };
  const io = { to: () => ({ emit: () => {} }) };
  const tournamentManager = new TournamentManager(io, gameManager);

  for (let index = 1; index <= 4; index += 1) {
    const user = { id: `user-${index}`, username: `Player ${index}` };
    users.set(user.id, user);
    tournamentManager.joinQueue({
      id: `socket-${index}`,
      userId: user.id,
      join: () => {},
      emit: () => {}
    }, user);
  }
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(tournamentManager.tournaments.size, 1);
  const tournament = [...tournamentManager.tournaments.values()][0];
  assert.equal(games.length, 2);

  await gameManager.onGameEnded(games[0], { winner: 'X' });
  assert.equal(tournament.rounds[1][0].p1.id, games[0].playerDetails[0].id);
  await gameManager.onGameEnded(games[1], { winner: 'X' });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(games.length, 3);

  await gameManager.onGameEnded(games[2], { winner: 'O' });
  assert.equal(tournament.status, 'COMPLETED');
  assert.equal(tournament.rounds[1][0].winner.id, games[2].playerDetails[1].id);
});

test('players with an active game cannot enter the tournament queue', () => {
  const gameManager = {
    pendingUserGames: new Set(),
    getActiveGameId: () => 'active-game'
  };
  const tournamentManager = new TournamentManager(
    { to: () => ({ emit: () => {} }) },
    gameManager
  );

  assert.throws(() => tournamentManager.joinQueue({
    id: 'socket',
    userId: 'user'
  }, {
    id: 'user',
    username: 'Player'
  }), /Finish your active game/);
});
