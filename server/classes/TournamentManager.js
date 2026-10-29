// backend/classes/TournamentManager.js
const { v4: uuidv4 } = require('uuid');

class TournamentManager {
  constructor(io, gameManager) {
    this.io = io;
    this.gameManager = gameManager; // Needs access to create games
    this.queue =[]; // Users waiting for a tournament
    this.tournaments = new Map(); // Active tournaments
    this.TOURNAMENT_SIZE = 4; // 4-player sit & go
  }

  joinQueue(socket, user) {
    // Check if already in queue
    if (!this.queue.find(p => p.id === user.id)) {
      this.queue.push({ socket, user });
    }

    // Broadcast queue update to those waiting
    this.queue.forEach(p => {
      p.socket.emit('tournamentQueueUpdate', { 
        current: this.queue.length, 
        required: this.TOURNAMENT_SIZE 
      });
    });

    // Start tournament if full
    if (this.queue.length >= this.TOURNAMENT_SIZE) {
      this.startTournament();
    }
  }

  leaveQueue(socket) {
    this.queue = this.queue.filter(p => p.socket.id !== socket.id);
    this.queue.forEach(p => {
      p.socket.emit('tournamentQueueUpdate', { 
        current: this.queue.length, 
        required: this.TOURNAMENT_SIZE 
      });
    });
  }

  startTournament() {
    const players = this.queue.splice(0, this.TOURNAMENT_SIZE);
    const tId = uuidv4();
    
    // Create Bracket (Round 1)
    const bracket = {
      id: tId,
      status: 'ACTIVE',
      players: players.map(p => p.user),
      rounds:[
        [ // Round 1 (Semifinals)
          { id: 'm1', p1: players[0].user, p2: players[1].user, winner: null, gameId: null },
          { id: 'm2', p1: players[2].user, p2: players[3].user, winner: null, gameId: null }
        ],[ // Round 2 (Finals)
          { id: 'm3', p1: null, p2: null, winner: null, gameId: null }
        ]
      ]
    };

    this.tournaments.set(tId, bracket);

    // Notify players and generate Round 1 games
    players.forEach(p => {
      p.socket.join(tId); // Join tournament socket room
      p.socket.emit('tournamentStarted', tId);
    });

    this.generateMatchesForRound(tId, 0);
  }

  generateMatchesForRound(tId, roundIndex) {
    const t = this.tournaments.get(tId);
    if (!t) return;

    t.rounds[roundIndex].forEach(match => {
      if (match.p1 && match.p2 && !match.gameId) {
        // Create a private game using your GameManager
        // Passing 5+0 Rapid as standard tournament time
        const game = this.gameManager.createPrivateGame(match.p1.id, '5+0');
        
        // Force player 2 into the game directly
        game.players[1] = match.p2.id; 
        game.playerDetails.push(match.p2);
        
        match.gameId = game.id;
      }
    });

    this.io.to(tId).emit('tournamentState', t);
  }

  // Called when a game ends from your index.js
  handleMatchEnd(gameId, winnerUser) {
    for (let [tId, t] of this.tournaments) {
      let matchFound = false;

      // Find the match in the bracket
      for (let r = 0; r < t.rounds.length; r++) {
        const match = t.rounds[r].find(m => m.gameId === gameId);
        if (match) {
          match.winner = winnerUser;
          matchFound = true;

          // Advance winner to next round
          if (r + 1 < t.rounds.length) {
            const nextMatch = t.rounds[r + 1][Math.floor(t.rounds[r].indexOf(match) / 2)];
            if (!nextMatch.p1) nextMatch.p1 = winnerUser;
            else nextMatch.p2 = winnerUser;

            // If next match is full, generate the game
            if (nextMatch.p1 && nextMatch.p2) {
              this.generateMatchesForRound(tId, r + 1);
            }
          } else {
            t.status = 'COMPLETED';
          }
          break;
        }
      }

      if (matchFound) {
        this.io.to(tId).emit('tournamentState', t);
      }
    }
  }
}

module.exports = TournamentManager;