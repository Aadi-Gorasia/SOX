const { v4: uuidv4 } = require('uuid');
const { updateEloAndStats, getPotentialChanges } = require('../services/eloService');
const { saveGameResult } = require('../services/gameService');
const User = require('../models/User');

// Helper: Win Logic
function calculateWinner(squares) {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] !== 'D' && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a] };
    }
  }
  if (squares.every(s => s !== null)) return { winner: 'D' };
  return null;
}

function toEngineIdx(boardIndex, cellIndex) {
  return boardIndex * 9 + cellIndex;
}

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map();
    this.activeUserGames = new Map();
    this.waitingPlayers = new Map();
    this.timers = new Map();
  }

  getGame(gameId) { return this.games.get(gameId); }
  getActiveGameId(userId) { return this.activeUserGames.get(userId); }

  // --- 1. MATCHMAKING ---
  addPlayerToQueue(socket, timeControl, preferredSymbol) {
    this.cancelMatchmaking(socket);
    const queue = this.waitingPlayers.get(timeControl) || [];
    queue.push({ socket, preferredSymbol });
    this.waitingPlayers.set(timeControl, queue);
  }

  cancelMatchmaking(socket) {
    for (const [timeControl, queue] of this.waitingPlayers) {
      const remainingPlayers = queue.filter(player => player.socket.id !== socket.id);

      if (remainingPlayers.length === 0) {
        this.waitingPlayers.delete(timeControl);
      } else if (remainingPlayers.length !== queue.length) {
        this.waitingPlayers.set(timeControl, remainingPlayers);
      }
    }
  }

  async findMatch(socket, timeControl, preferredSymbol) {
    const queue = this.waitingPlayers.get(timeControl) || [];
    const opponentIndex = queue.findIndex(p => p.socket.id !== socket.id && !p.socket.disconnected);
    
    if (opponentIndex === -1) {
      this.addPlayerToQueue(socket, timeControl, preferredSymbol);
      return null;
    }

    const opponent = queue[opponentIndex];
    queue.splice(opponentIndex, 1);
    this.waitingPlayers.set(timeControl, queue);

    return this.createGame([opponent.socket, socket], timeControl, opponent.preferredSymbol, preferredSymbol);
  }

  // --- 2. GAME CREATION ---
  async createGame(sockets, timeControlStr, p1Pref, p2Pref) {
    const gameId = uuidv4();
    const [u1, u2] = await Promise.all(sockets.map(s => User.findById(s.userId).select('username elo')));
    
    if (!u1 || !u2) return null;

    let p1Symbol = 'X';
    if (p1Pref === 'O' || (p2Pref === 'X' && p1Pref !== 'X')) p1Symbol = 'O';
    if (p1Pref === p2Pref && Math.random() > 0.5) p1Symbol = p1Symbol === 'X' ? 'O' : 'X';

    const playersInOrder = p1Symbol === 'X' ? [sockets[0], sockets[1]] : [sockets[1], sockets[0]];
    const detailsInOrder = p1Symbol === 'X' ? [u1, u2] : [u2, u1];

    const timeParts = timeControlStr.split('+');
    const initialTime = parseInt(timeParts[0]) * 60 * 1000;
    const increment = parseInt(timeParts[1] || '0') * 1000;

    const newGame = {
      id: gameId,
      players: playersInOrder.map(s => s.id),
      playerDetails: detailsInOrder.map(u => ({ id: u._id.toString(), username: u.username, elo: u.elo })),
      playerToMove: playersInOrder[0].id,
      allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
      boardWinners: Array(9).fill(null),
      activeBoard: null,
      gameWinner: null,
      timeControl: { base: initialTime, increment },
      playerTimes: [initialTime, initialTime],
      lastMoveTimestamp: Date.now(),
      lastTickTimestamp: Date.now(),
      chat: [],
      moves: [],
      engineMoves: [], 
      drawOffer: null,
    };

    this.games.set(gameId, newGame);
    detailsInOrder.forEach(u => this.activeUserGames.set(u.id, gameId));
    sockets.forEach(s => s.join(gameId));

    this.io.to(gameId).emit('gameStarted', { gameId });
    this.io.to(gameId).emit('updateGame', newGame);
    
    this.startGameTimer(gameId);
    return newGame;
  }

  // --- 3. SEND PERSONAL STAKES (Called on Join) ---
  sendPlayerStakes(gameId, socket) {
    const game = this.games.get(gameId);
    if (!game) return;

    // Identify player via User ID (safe) or Socket ID (fallback)
    const myId = socket.userId; 
    const p1 = game.playerDetails[0];
    const p2 = game.playerDetails[1];

    if (!p1 || !p2) return;

    let myStakes = null;
    let opponentName = "";

    // Calculate stakes relative to WHO is asking
    if (p1.id === myId) {
      myStakes = getPotentialChanges(p1.elo, p2.elo);
      opponentName = p2.username;
    } else if (p2.id === myId) {
      myStakes = getPotentialChanges(p2.elo, p1.elo);
      opponentName = p1.username;
    } else {
      return; // Spectator
    }

    socket.emit('personalStakes', {
      win: myStakes.win,
      loss: myStakes.loss,
      draw: myStakes.draw,
      opponent: opponentName
    });
  }

  // --- 4. MOVE LOGIC ---
  async makeMove(socket, { gameId, boardIndex, cellIndex }) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner) return;

    // Validate Turn
    if (game.playerToMove !== socket.id) return;
    if (game.boardWinners[boardIndex] || game.allBoards[boardIndex][cellIndex]) return;
    if (game.activeBoard !== null && game.activeBoard !== boardIndex) return;

    const pIdx = game.players.indexOf(socket.id);
    const symbol = pIdx === 0 ? 'X' : 'O';

    // 1. Save Move to History
    if (!game.moves) game.moves = [];
    game.moves.push({
      player: symbol,
      boardIndex,
      cellIndex,
      moveNumber: game.moves.length + 1,
      timestamp: Date.now()
    });

    if (!game.engineMoves) game.engineMoves = [];
game.engineMoves.push({
  idx:  toEngineIdx(boardIndex, cellIndex),
  side: pIdx,   // 0=X, 1=O
});

    // 2. Update Board & Time
    game.allBoards[boardIndex][cellIndex] = symbol;
    game.playerTimes[pIdx] += game.timeControl.increment;
    game.lastMoveTimestamp = Date.now();
    game.lastTickTimestamp = Date.now();

    // 3. Check Small Board
    const smallWin = calculateWinner(game.allBoards[boardIndex]);
    if (smallWin) game.boardWinners[boardIndex] = smallWin.winner;

    // 4. Next Active Board
    const targetFull = game.allBoards[cellIndex].every(c => c !== null);
    const targetWon = game.boardWinners[cellIndex] !== null;
    game.activeBoard = (targetFull || targetWon) ? null : cellIndex;

    // 5. Check Big Win
    const bigWin = calculateWinner(game.boardWinners);
    if (bigWin) {
      await this.endGame(gameId, { winner: bigWin.winner, reason: 'checkmate' });
    } else {
      // Switch Turn
      game.playerToMove = game.players[pIdx === 0 ? 1 : 0];
      this.io.to(gameId).emit('updateGame', game);
    }
  }

  // --- 5. END GAME ---
  async endGame(gameId, result) {
    const game = this.games.get(gameId);
    if (!game) return;

    if (this.timers.has(gameId)) {
      clearInterval(this.timers.get(gameId));
      this.timers.delete(gameId);
    }

    game.gameWinner = result.winner;
    const p1 = game.playerDetails[0];
    const p2 = game.playerDetails[1];
    
    let eloResult = null;
    try {
      if (result.winner === 'D') eloResult = await updateEloAndStats(p1.id, p2.id, true);
      else {
        const wId = result.winner === 'X' ? p1.id : p2.id;
        const lId = result.winner === 'X' ? p2.id : p1.id;
        eloResult = await updateEloAndStats(wId, lId, false);
      }
      await saveGameResult({
  playerDetails: game.playerDetails,
  gameWinner:    game.gameWinner,
  timeControl:   game.timeControl,
  moves:         game.engineMoves || [],
});
    } catch (e) { console.error(e); }

    // Prepare Payload
    let p1Final = { ...p1, newElo: p1.elo, change: 0 };
    let p2Final = { ...p2, newElo: p2.elo, change: 0 };

    if (eloResult) {
      // Align IDs
      const resP1 = eloResult.p1.id.toString() === p1.id.toString() ? eloResult.p1 : eloResult.p2;
      const resP2 = eloResult.p2.id.toString() === p2.id.toString() ? eloResult.p2 : eloResult.p1;
      p1Final.newElo = resP1.newElo; p1Final.change = resP1.change;
      p2Final.newElo = resP2.newElo; p2Final.change = resP2.change;
    }

    const payload = {
      winner: game.gameWinner,
      reason: result.reason,
      players: [p1Final, p2Final]
    };

    this.io.to(gameId).emit('gameEnded', payload);
    this.io.to(gameId).emit('updateGame', game);
    game.playerDetails.forEach(p => this.activeUserGames.delete(p.id));
  }

  // --- 6. UTILS ---
  startGameTimer(gameId) {
    if (this.timers.has(gameId)) return;
    const interval = setInterval(() => {
      const game = this.games.get(gameId);
      if (!game || game.gameWinner) { clearInterval(interval); return; }
      
      const now = Date.now();
      const delta = now - (game.lastTickTimestamp || now);
      game.lastTickTimestamp = now;

      if (game.players.includes(null)) return; 
      const activeIdx = game.players.indexOf(game.playerToMove);
      if (activeIdx === -1) return;

      game.playerTimes[activeIdx] = Math.max(0, game.playerTimes[activeIdx] - delta);

      if (game.playerTimes[activeIdx] <= 0) {
        const winSym = activeIdx === 0 ? 'O' : 'X';
        this.endGame(gameId, { winner: winSym, reason: 'timeout' });
      } else {
        this.io.to(gameId).emit('updateGame', game);
      }
    }, 1000);
    this.timers.set(gameId, interval);
  }

  handleDisconnect(socket) {
    this.cancelMatchmaking(socket);
  }

  // Draw handlers
  offerDraw(gameId, socketId) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner) return;
    game.drawOffer = socketId;
    const oppId = game.players.find(id => id !== socketId);
    if (oppId) this.io.to(oppId).emit('drawOffered');
  }

  async acceptDraw(gameId, socketId) {
    const game = this.games.get(gameId);
    if (!game || !game.drawOffer || game.drawOffer === socketId) return;
    await this.endGame(gameId, { winner: 'D', reason: 'agreement' });
  }

  declineDraw(gameId) {
    const game = this.games.get(gameId);
    if (game) { game.drawOffer = null; this.io.to(gameId).emit('drawDeclined'); }
  }
}

module.exports = GameManager;