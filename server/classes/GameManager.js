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

function parseTimeControl(timeControl) {
  if (typeof timeControl !== 'string') return null;
  const match = /^(\d{1,2})\+(\d{1,2})$/.exec(timeControl);
  if (!match) return null;

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  if (minutes < 1 || minutes > 60 || seconds > 30) return null;

  return { base: minutes * 60 * 1000, increment: seconds * 1000 };
}

class GameManager {
  constructor(io) {
    this.io = io;
    this.games = new Map();
    this.activeUserGames = new Map();
    this.pendingUserGames = new Set();
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
      const remainingPlayers = queue.filter(player =>
        player.socket.id !== socket.id &&
        (socket.userId == null ||
          String(player.socket.userId) !== String(socket.userId))
      );

      if (remainingPlayers.length === 0) {
        this.waitingPlayers.delete(timeControl);
      } else if (remainingPlayers.length !== queue.length) {
        this.waitingPlayers.set(timeControl, remainingPlayers);
      }
    }
  }

  async findMatch(socket, timeControl, preferredSymbol) {
    if (!socket?.id || !parseTimeControl(timeControl) ||
        !['X', 'O'].includes(preferredSymbol)) {
      throw new Error('Invalid matchmaking request');
    }

    if (this.getActiveGameId(socket.userId) ||
        this.pendingUserGames.has(String(socket.userId))) {
      throw new Error('Player already has an active game');
    }

    const queue = this.waitingPlayers.get(timeControl) || [];
    const opponentIndex = queue.findIndex(player =>
      player.socket.id !== socket.id &&
      String(player.socket.userId) !== String(socket.userId) &&
      !player.socket.disconnected &&
      !this.getActiveGameId(player.socket.userId) &&
      !this.pendingUserGames.has(String(player.socket.userId))
    );
    
    if (opponentIndex === -1) {
      this.addPlayerToQueue(socket, timeControl, preferredSymbol);
      return null;
    }

    const opponent = queue[opponentIndex];
    queue.splice(opponentIndex, 1);
    if (queue.length) this.waitingPlayers.set(timeControl, queue);
    else this.waitingPlayers.delete(timeControl);

    try {
      return await this.createGame(
        [opponent.socket, socket],
        timeControl,
        opponent.preferredSymbol,
        preferredSymbol
      );
    } catch (error) {
      if (!opponent.socket.disconnected) {
        this.addPlayerToQueue(opponent.socket, timeControl, opponent.preferredSymbol);
      }
      throw error;
    }
  }

  // --- 2. GAME CREATION ---
  async createGame(sockets, timeControlStr, p1Pref, p2Pref) {
    const timeControl = parseTimeControl(timeControlStr);
    if (!timeControl || !Array.isArray(sockets) || sockets.length !== 2 ||
        sockets.some(socket => !socket?.id || !socket.userId) ||
        String(sockets[0].userId) === String(sockets[1].userId)) {
      throw new Error('Cannot create a game from invalid players or time control');
    }

    if (sockets.some(socket =>
      this.getActiveGameId(socket.userId) ||
      this.pendingUserGames.has(String(socket.userId))
    )) {
      throw new Error('A player already has an active game');
    }

    const gameId = uuidv4();
    sockets.forEach(socket => this.pendingUserGames.add(String(socket.userId)));
    let users;
    try {
      users = await Promise.all(
        sockets.map(socket => User.findById(socket.userId).select('username elo'))
      );
    } catch (error) {
      sockets.forEach(socket => this.pendingUserGames.delete(String(socket.userId)));
      throw error;
    }
    const [u1, u2] = users;

    if (!u1 || !u2) {
      sockets.forEach(socket => this.pendingUserGames.delete(String(socket.userId)));
      throw new Error('Unable to find both players for this game');
    }
    if (sockets.some(socket => socket.disconnected)) {
      sockets.forEach(socket => this.pendingUserGames.delete(String(socket.userId)));
      throw new Error('A player disconnected before the game could start');
    }

    let p1Symbol = 'X';
    if (p1Pref === 'O' || (p2Pref === 'X' && p1Pref !== 'X')) p1Symbol = 'O';
    if (p1Pref === p2Pref && Math.random() > 0.5) p1Symbol = p1Symbol === 'X' ? 'O' : 'X';

    const playersInOrder = p1Symbol === 'X' ? [sockets[0], sockets[1]] : [sockets[1], sockets[0]];
    const detailsInOrder = p1Symbol === 'X' ? [u1, u2] : [u2, u1];

    const newGame = {
      id: gameId,
      players: playersInOrder.map(s => s.id),
      playerDetails: detailsInOrder.map(u => ({ id: u._id.toString(), username: u.username, elo: u.elo })),
      playerToMove: playersInOrder[0].id,
      allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
      boardWinners: Array(9).fill(null),
      activeBoard: null,
      gameWinner: null,
      timeControl,
      playerTimes: [timeControl.base, timeControl.base],
      lastMoveTimestamp: Date.now(),
      lastTickTimestamp: Date.now(),
      chat: [],
      moves: [],
      engineMoves: [], 
      drawOffer: null,
    };

    this.games.set(gameId, newGame);
    detailsInOrder.forEach(u => this.activeUserGames.set(u.id, gameId));
    detailsInOrder.forEach(u => this.pendingUserGames.delete(u.id));
    sockets.forEach(s => s.join(gameId));

    this.io.to(gameId).emit('gameStarted', { gameId });
    this.io.to(gameId).emit('updateGame', newGame);
    
    this.startGameTimer(gameId);
    return newGame;
  }

  async createPrivateGame(socket, timeControlStr, preferredSymbol = 'X') {
    const timeControl = parseTimeControl(timeControlStr);
    if (!socket?.id || !socket.userId || !timeControl ||
        !['X', 'O'].includes(preferredSymbol)) {
      throw new Error('Invalid private game request');
    }
    if (this.getActiveGameId(socket.userId) ||
        this.pendingUserGames.has(String(socket.userId))) {
      throw new Error('Player already has an active game');
    }

    const userId = String(socket.userId);
    this.pendingUserGames.add(userId);
    let user;
    try {
      user = await User.findById(socket.userId).select('username elo');
    } catch (error) {
      this.pendingUserGames.delete(userId);
      throw error;
    }
    if (!user) {
      this.pendingUserGames.delete(userId);
      throw new Error('Unable to find the game creator');
    }

    const userDetails = {
      id: user._id.toString(),
      username: user.username,
      elo: user.elo
    };
    const hostIsX = preferredSymbol === 'X';
    const players = hostIsX ? [socket.id, null] : [null, socket.id];
    const playerDetails = hostIsX ? [userDetails, null] : [null, userDetails];
    const gameId = uuidv4();
    const game = {
      id: gameId,
      players,
      playerDetails,
      playerToMove: null,
      allBoards: Array.from({ length: 9 }, () => Array(9).fill(null)),
      boardWinners: Array(9).fill(null),
      activeBoard: null,
      gameWinner: null,
      timeControl,
      playerTimes: [timeControl.base, timeControl.base],
      lastMoveTimestamp: Date.now(),
      lastTickTimestamp: Date.now(),
      chat: [],
      moves: [],
      engineMoves: [],
      drawOffer: null,
      waitingForOpponent: true
    };

    this.games.set(gameId, game);
    this.activeUserGames.set(userDetails.id, gameId);
    this.pendingUserGames.delete(userId);
    socket.join(gameId);
    return game;
  }

  async joinGame(socket, gameId) {
    const game = this.games.get(gameId);
    if (!game || !socket?.userId) return null;

    let playerIndex = game.playerDetails.findIndex(player =>
      player && String(player.id ?? player._id) === String(socket.userId)
    );

    if (playerIndex === -1 && game.waitingForOpponent) {
      playerIndex = game.playerDetails.findIndex(player => player === null);
      if (playerIndex === -1 || game.joiningUserId) return null;
      if (this.getActiveGameId(socket.userId) ||
          this.pendingUserGames.has(String(socket.userId))) return null;

      game.joiningUserId = String(socket.userId);
      this.pendingUserGames.add(String(socket.userId));
      let user;
      try {
        user = await User.findById(socket.userId).select('username elo');
      } catch (error) {
        delete game.joiningUserId;
        this.pendingUserGames.delete(String(socket.userId));
        throw error;
      }
      if (!user) {
        delete game.joiningUserId;
        this.pendingUserGames.delete(String(socket.userId));
        throw new Error('Unable to find the joining player');
      }

      const userDetails = {
        id: user._id.toString(),
        username: user.username,
        elo: user.elo
      };
      game.playerDetails[playerIndex] = userDetails;
      game.players[playerIndex] = socket.id;
      game.waitingForOpponent = false;
      delete game.joiningUserId;
      this.activeUserGames.set(userDetails.id, game.id);
      this.pendingUserGames.delete(userDetails.id);
      game.playerToMove = game.players[0];
    } else if (playerIndex === -1) {
      return null;
    } else {
      const oldSocketId = game.players[playerIndex];
      game.players[playerIndex] = socket.id;
      if (game.playerToMove === oldSocketId) game.playerToMove = socket.id;
    }

    socket.join(gameId);
    if (!game.waitingForOpponent) {
      this.io.to(gameId).emit('gameStarted', { gameId });
      this.sendPlayerStakes(gameId, socket);
      this.startGameTimer(gameId);
    }
    this.io.to(gameId).emit('updateGame', game);
    return game;
  }

  async createTournamentGame(player1Id, player2Id, timeControlStr = '5+0') {
    const sockets = [...this.io.sockets.sockets.values()];
    const player1 = sockets.find(socket =>
      String(socket.userId) === String(player1Id) && !socket.disconnected
    );
    const player2 = sockets.find(socket =>
      String(socket.userId) === String(player2Id) && !socket.disconnected
    );

    if (!player1 || !player2) {
      throw new Error('Both tournament players must be connected to start a match');
    }

    return this.createGame([player1, player2], timeControlStr, 'X', 'O');
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
  async makeMove(socket, { gameId, boardIndex, cellIndex } = {}) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner || game.waitingForOpponent) return;
    if (!Number.isInteger(boardIndex) || boardIndex < 0 || boardIndex > 8 ||
        !Number.isInteger(cellIndex) || cellIndex < 0 || cellIndex > 8) return;

    // Validate Turn
    if (game.playerToMove !== socket.id) return;
    if (game.boardWinners[boardIndex] !== null ||
        game.allBoards[boardIndex][cellIndex] !== null) return;
    if (game.activeBoard !== null && game.activeBoard !== boardIndex) return;

    const pIdx = game.players.indexOf(socket.id);
    if (pIdx === -1) return;
    const symbol = pIdx === 0 ? 'X' : 'O';

    game.drawOffer = null;

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
      await this.endGame(gameId, {
        winner: bigWin.winner,
        reason: bigWin.winner === 'D' ? 'draw' : 'checkmate'
      });
    } else {
      // Switch Turn
      game.playerToMove = game.players[pIdx === 0 ? 1 : 0];
      this.io.to(gameId).emit('updateGame', game);
    }
  }

  // --- 5. END GAME ---
  async endGame(gameId, result) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner || game.waitingForOpponent ||
        !game.playerDetails?.[0] || !game.playerDetails?.[1]) return;

    if (this.timers.has(gameId)) {
      clearInterval(this.timers.get(gameId));
      this.timers.delete(gameId);
    }

    game.gameWinner = result.winner;
    game.drawOffer = null;
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
    game.playerDetails.forEach(player => {
      if (this.activeUserGames.get(player.id) === gameId) {
        this.activeUserGames.delete(player.id);
      }
    });
    game.playerDetails.forEach(player =>
      this.pendingUserGames.delete(String(player.id))
    );
    if (typeof this.onGameEnded === 'function') {
      try {
        await this.onGameEnded(game, result);
      } catch (error) {
        console.error('[Tournament] Game-end processing failed:', error);
      }
    }
  }

  // --- 6. UTILS ---
  startGameTimer(gameId) {
    if (this.timers.has(gameId)) return;
    const interval = setInterval(() => {
      const game = this.games.get(gameId);
      if (!game || game.gameWinner || game.waitingForOpponent) {
        clearInterval(interval);
        this.timers.delete(gameId);
        return;
      }
      
      const now = Date.now();
      const delta = now - (game.lastTickTimestamp || now);
      game.lastTickTimestamp = now;

      if (game.players.includes(null)) return; 
      const activeIdx = game.players.indexOf(game.playerToMove);
      if (activeIdx === -1) return;

      game.playerTimes[activeIdx] = Math.max(0, game.playerTimes[activeIdx] - delta);

      if (game.playerTimes[activeIdx] <= 0) {
        const winSym = activeIdx === 0 ? 'O' : 'X';
        this.endGame(gameId, { winner: winSym, reason: 'timeout' })
          .catch(error => console.error(`[Game ${gameId}] Timeout handling failed:`, error));
      } else {
        this.io.to(gameId).emit('updateGame', game);
      }
    }, 1000);
    this.timers.set(gameId, interval);
  }

  handleDisconnect(socket) {
    this.cancelMatchmaking(socket);
    for (const [gameId, game] of this.games) {
      if (!game.waitingForOpponent || !game.players.includes(socket.id)) continue;

      game.playerDetails.forEach(player => {
        if (player && this.activeUserGames.get(player.id) === gameId) {
          this.activeUserGames.delete(player.id);
        }
      });
      this.games.delete(gameId);
      this.io.to(gameId).emit('gameCancelled', {
        reason: 'creator-disconnected'
      });
    }
  }

  // Draw handlers
  offerDraw(gameId, userId) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner || game.waitingForOpponent || game.drawOffer) return;

    const playerIndex = game.playerDetails.findIndex(player =>
      String(player.id ?? player._id) === String(userId)
    );
    if (playerIndex === -1) return;

    game.drawOffer = String(userId);
    const opponentSocketId = game.players[playerIndex === 0 ? 1 : 0];
    this.io.to(opponentSocketId).emit('drawOffered', {
      username: game.playerDetails[playerIndex].username
    });
    this.io.to(gameId).emit('updateGame', game);
  }

  async acceptDraw(gameId, userId) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner || !game.drawOffer) return;

    const playerIndex = game.playerDetails.findIndex(player =>
      String(player.id ?? player._id) === String(userId)
    );
    if (playerIndex === -1 || game.drawOffer === String(userId)) return;

    await this.endGame(gameId, { winner: 'D', reason: 'agreement' });
  }

  declineDraw(gameId, userId) {
    const game = this.games.get(gameId);
    if (!game || game.gameWinner || !game.drawOffer || game.drawOffer === String(userId)) return;

    const isPlayer = game.playerDetails.some(player =>
      String(player.id ?? player._id) === String(userId)
    );
    if (!isPlayer) return;

    game.drawOffer = null;
    this.io.to(gameId).emit('drawDeclined');
    this.io.to(gameId).emit('updateGame', game);
  }
}

module.exports = GameManager;