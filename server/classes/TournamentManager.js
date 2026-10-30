const { v4: uuidv4 } = require('uuid');

function playerId(player) {
  return String(player?.id ?? player?._id ?? '');
}

class TournamentManager {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager;
    this.queue = [];
    this.tournaments = new Map();
    this.TOURNAMENT_SIZE = 4;
    this.gameManager.onGameEnded = (game, result) =>
      this.handleMatchEnd(game, result);
  }

  joinQueue(socket, user) {
    if (!socket?.userId || !user?.id) {
      throw new Error('Authenticated player is required to join a tournament');
    }
    if (this.gameManager.getActiveGameId(socket.userId) ||
        this.gameManager.pendingUserGames.has(String(socket.userId))) {
      throw new Error('Finish your active game before joining a tournament');
    }

    this.leaveQueue(socket);
    this.queue = this.queue.filter(player =>
      String(player.user.id) !== String(user.id)
    );
    this.queue.push({
      socket,
      user: {
        id: String(user.id),
        username: user.username
      }
    });

    this.broadcastQueueUpdate();
    if (this.queue.length >= this.TOURNAMENT_SIZE) {
      this.startTournament().catch(error => {
        console.error('[Tournament] Failed to start tournament:', error);
      });
    }
  }

  leaveQueue(socket) {
    const remaining = this.queue.filter(player =>
      player.socket.id !== socket.id &&
      String(player.user.id) !== String(socket.userId)
    );
    if (remaining.length === this.queue.length) return;
    this.queue = remaining;
    this.broadcastQueueUpdate();
  }

  broadcastQueueUpdate() {
    const update = {
      current: this.queue.length,
      required: this.TOURNAMENT_SIZE
    };
    this.queue.forEach(player => player.socket.emit('tournamentQueueUpdate', update));
  }

  async startTournament() {
    if (this.queue.length < this.TOURNAMENT_SIZE) return;

    const players = this.queue.splice(0, this.TOURNAMENT_SIZE);
    const tournamentId = uuidv4();
    const bracket = {
      id: tournamentId,
      status: 'ACTIVE',
      players: players.map(player => player.user),
      rounds: [
        [
          { id: 'm1', p1: players[0].user, p2: players[1].user, winner: null, gameId: null },
          { id: 'm2', p1: players[2].user, p2: players[3].user, winner: null, gameId: null }
        ],
        [{ id: 'm3', p1: null, p2: null, winner: null, gameId: null }]
      ]
    };

    this.tournaments.set(tournamentId, bracket);
    players.forEach(player => {
      player.socket.join(tournamentId);
      player.socket.emit('tournamentStarted', tournamentId);
    });

    this.broadcastQueueUpdate();
    await this.generateMatchesForRound(tournamentId, 0);
  }

  async generateMatchesForRound(tournamentId, roundIndex) {
    const tournament = this.tournaments.get(tournamentId);
    const round = tournament?.rounds[roundIndex];
    if (!round) return;

    for (const match of round) {
      if (!match.p1 || !match.p2 || match.gameId) continue;

      try {
        const game = await this.gameManager.createTournamentGame(
          playerId(match.p1),
          playerId(match.p2),
          '5+0'
        );
        game.tournamentId = tournamentId;
        game.tournamentMatchId = match.id;
        match.gameId = game.id;
      } catch (error) {
        console.error(
          `[Tournament ${tournamentId}] Failed to create ${match.id}:`,
          error
        );
        this.io.to(tournamentId).emit('tournamentError', {
          message: 'A tournament match could not be created. Please retry.'
        });
      }
    }

    this.io.to(tournamentId).emit('tournamentState', tournament);
  }

  async handleMatchEnd(game, result) {
    if (!game?.tournamentId || !game.tournamentMatchId) return;

    const tournament = this.tournaments.get(game.tournamentId);
    if (!tournament || tournament.status === 'COMPLETED') return;

    const roundIndex = tournament.rounds.findIndex(round =>
      round.some(match =>
        match.id === game.tournamentMatchId && match.gameId === game.id
      )
    );
    if (roundIndex === -1) return;

    const round = tournament.rounds[roundIndex];
    const match = round.find(item => item.id === game.tournamentMatchId);
    if (!match || match.winner) return;

    let winner = null;
    if (result.winner === 'D') {
      const xBoards = game.boardWinners.filter(value => value === 'X').length;
      const oBoards = game.boardWinners.filter(value => value === 'O').length;
      if (xBoards !== oBoards) {
        winner = game.playerDetails[xBoards > oBoards ? 0 : 1];
      } else if (game.playerTimes[0] !== game.playerTimes[1]) {
        winner = game.playerDetails[game.playerTimes[0] > game.playerTimes[1] ? 0 : 1];
      } else {
        match.gameId = null;
        await this.generateMatchesForRound(game.tournamentId, roundIndex);
        return;
      }
    } else {
      winner = game.playerDetails[result.winner === 'X' ? 0 : 1];
    }

    match.winner = {
      id: playerId(winner),
      username: winner.username
    };

    if (roundIndex + 1 < tournament.rounds.length) {
      const nextMatch = tournament.rounds[roundIndex + 1][Math.floor(round.indexOf(match) / 2)];
      if (!nextMatch.p1) nextMatch.p1 = match.winner;
      else nextMatch.p2 = match.winner;

      if (nextMatch.p1 && nextMatch.p2) {
        await this.generateMatchesForRound(game.tournamentId, roundIndex + 1);
        return;
      }
    } else {
      tournament.status = 'COMPLETED';
    }

    this.io.to(game.tournamentId).emit('tournamentState', tournament);
  }

  getTournamentForUser(tournamentId, userId) {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) return null;
    return tournament.players.some(player => playerId(player) === String(userId))
      ? tournament
      : null;
  }
}

module.exports = TournamentManager;
