// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

// Import your services
const { updateEloAndStats } = require('./services/eloService');
const { saveGameResult } = require('./services/gameService');
const User = require('./models/User');
const authMiddleware = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json({ extended: false }));

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[Server] MongoDB Connected...'))
  .catch(err => console.error('[Server] MongoDB connection error:', err));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));

// Track active games per user (userId -> gameId)
const activeUserGames = new Map();

app.get('/api/games/active', authMiddleware, (req, res) => {
  res.json({ gameId: activeUserGames.get(req.user.id) || null });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

// In-memory game storage
const games = new Map();
// waitingPlayers: timeControl -> array of { socket, preferredSymbol }
const waitingPlayers = new Map();
// gameId -> interval
const gameIntervals = new Map();

/**
 * Helper: calculate winner (small board or big board)
 */
function calculateWinner(squares) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] !== 'D' && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a] };
    }
  }
  if (squares.every(square => square !== null && square !== undefined)) {
    return { winner: 'D' };
  }
  return null;
}

/**
 * Helper: clean up on game end
 */
async function finalizeGameAndCleanup(game) {
  // Remove active game mapping for both players
  try {
    if (game && game.playerDetails) {
      game.playerDetails.forEach(p => {
        if (p && p.id) {
          activeUserGames.delete(p.id);
        }
      });
    }
  } catch (err) {
    console.error('[Server] finalizeGameAndCleanup error (activeUserGames):', err);
  }

  // Stop timer if running
  try {
    if (game && game.id && gameIntervals.has(game.id)) {
      clearInterval(gameIntervals.get(game.id));
      gameIntervals.delete(game.id);
    }
  } catch (err) {
    console.error('[Server] finalizeGameAndCleanup error (interval):', err);
  }
}

/**
 * TIMER FIX: central timer function
 * Runs every second and pushes full game updates.
 */
function startGameTimer(gameId) {
  if (gameIntervals.has(gameId)) return; // Already running

  const loop = setInterval(async () => {
    const game = games.get(gameId);

    // If no game or already finished, cleanup and stop timer
    if (!game || game.gameWinner) {
      if (game) await finalizeGameAndCleanup(game);
      clearInterval(loop);
      gameIntervals.delete(gameId);
      return;
    }

    // Initialize lastTickTimestamp if missing
    if (!game.lastTickTimestamp) {
      game.lastTickTimestamp = Date.now();
      return;
    }

    const now = Date.now();
    const timeElapsed = now - game.lastTickTimestamp;
    game.lastTickTimestamp = now;

    const activePlayerIndex = game.players.indexOf(game.playerToMove);
    if (activePlayerIndex === -1) {
      // No active player right now (e.g. waiting for second player)
      io.to(gameId).emit('updateGame', game);
      return;
    }

    // Decrement active player's clock
    game.playerTimes[activePlayerIndex] -= timeElapsed;
    if (game.playerTimes[activePlayerIndex] < 0) {
      game.playerTimes[activePlayerIndex] = 0;
    }

    // Handle timeout
    if (game.playerTimes[activePlayerIndex] === 0 && !game.gameWinner) {
      const winnerIndex = 1 - activePlayerIndex;
      game.gameWinner = winnerIndex === 0 ? 'X' : 'O';

      try {
        const winnerUserId = game.playerDetails[winnerIndex]?.id;
        const loserUserId = game.playerDetails[activePlayerIndex]?.id;
        if (winnerUserId && loserUserId) {
          await updateEloAndStats(winnerUserId, loserUserId, false);
        }
        await saveGameResult(game);
      } catch (err) {
        console.error('[Timer] Error saving timeout result:', err);
      }

      await finalizeGameAndCleanup(game);
    }

    // Push full game state every second so client timer updates
    io.to(gameId).emit('updateGame', game);
  }, 1000);

  gameIntervals.set(gameId, loop);
}

/**
 * Socket auth middleware
 */
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error: No token provided.'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user.id;
    return next();
  } catch (err) {
    return next(new Error('Authentication error: Token is not valid.'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User Connected: socketId=${socket.id}, userId=${socket.userId}`);

  /**
   * FIND GAME (matchmaking)
   */
  socket.on('findGame', async ({ timeControl, preferredSymbol }) => {
    try {
      if (!timeControl) {
        socket.emit('error', 'Time control not specified.');
        return;
      }
      if (!['X', 'O'].includes(preferredSymbol)) {
        preferredSymbol = null;
      }

      const queue = waitingPlayers.get(timeControl) || [];
      const opponent = queue.find(p => p.socket && !p.socket.disconnected);

      // If there's a waiting player, pair them
      if (opponent) {
        // Remove opponent from queue
        const newQueue = queue.filter(p => p.socket.id !== opponent.socket.id);
        if (newQueue.length > 0) {
          waitingPlayers.set(timeControl, newQueue);
        } else {
          waitingPlayers.delete(timeControl);
        }

        const player1Socket = opponent.socket;
        const player2Socket = socket;
        let p1Symbol, p2Symbol;

        // Assign symbols
        if (preferredSymbol && opponent.preferredSymbol && preferredSymbol !== opponent.preferredSymbol) {
          p1Symbol = opponent.preferredSymbol;
          p2Symbol = preferredSymbol;
        } else {
          if (Math.random() < 0.5) {
            p1Symbol = 'X';
            p2Symbol = 'O';
          } else {
            p1Symbol = 'O';
            p2Symbol = 'X';
          }
        }

        const playersInOrder = p1Symbol === 'X' ? [player1Socket, player2Socket] : [player2Socket, player1Socket];

        const [playerX, playerO] = await Promise.all([
          User.findById(playersInOrder[0].userId).select('username elo'),
          User.findById(playersInOrder[1].userId).select('username elo')
        ]);

        if (!playerX || !playerO) {
          socket.emit('error', 'Could not find player data.');
          return;
        }

        const gameId = uuidv4();
        const timeParts = timeControl.split('+');
        const initialTime = parseInt(timeParts[0], 10) * 60 * 1000;
        const increment = parseInt(timeParts[1] || '0', 10) * 1000;

        const newGame = {
          id: gameId,
          players: playersInOrder.map(s => s.id), // socket IDs
          playerDetails: [
            { id: playerX._id.toString(), username: playerX.username, elo: playerX.elo }, // X
            { id: playerO._id.toString(), username: playerO.username, elo: playerO.elo }  // O
          ],
          playerToMove: playersInOrder[0].id, // socket id of X
          allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
          boardWinners: Array(9).fill(null),
          activeBoard: null,
          gameWinner: null,
          timeControl: { base: initialTime, increment },
          playerTimes: [initialTime, initialTime],
          lastMoveTimestamp: Date.now(),
          lastTickTimestamp: Date.now(), // TIMER FIX
          chat: [],
          moves: [], // History Init
          drawOffer: null,
        };

        games.set(gameId, newGame);
        activeUserGames.set(playerX._id.toString(), gameId);
        activeUserGames.set(playerO._id.toString(), gameId);

        playersInOrder.forEach(sock => sock.join(gameId));

        io.to(gameId).emit('gameStarted', { gameId });
        io.to(gameId).emit('updateGame', newGame);

        // TIMER FIX: Start timer loop
        startGameTimer(gameId);
      } else {
        const currentQueue = waitingPlayers.get(timeControl) || [];
        currentQueue.push({ socket, preferredSymbol });
        waitingPlayers.set(timeControl, currentQueue);
        socket.emit('waitingForOpponent');
      }
    } catch (err) {
      console.error('[Socket] findGame error:', err);
      socket.emit('error', 'Error while finding/creating game.');
    }
  });

  /**
   * CREATE FRIEND GAME
   */
  socket.on('createFriendGame', async ({ timeControl, preferredSymbol }, callback) => {
    try {
      const gameId = uuidv4();
      const player1 = await User.findById(socket.userId).select('username elo');
      if (!player1) {
        if (callback) callback({ error: 'Could not find creator data.' });
        return;
      }
      if (!['X', 'O'].includes(preferredSymbol)) preferredSymbol = 'X';

      const timeParts = timeControl.split('+');
      const initialTime = parseInt(timeParts[0], 10) * 60 * 1000;
      const increment = parseInt(timeParts[1] || '0', 10) * 1000;

      const playerDetails = preferredSymbol === 'X'
        ? [{ id: player1._id.toString(), username: player1.username, elo: player1.elo }, null]
        : [null, { id: player1._id.toString(), username: player1.username, elo: player1.elo }];

      const players = preferredSymbol === 'X' ? [socket.id, null] : [null, socket.id];

      const newGame = {
        id: gameId,
        players,
        playerDetails,
        playerToMove: preferredSymbol === 'X' ? socket.id : null, // socket id of X or null
        allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
        boardWinners: Array(9).fill(null),
        activeBoard: null,
        gameWinner: null,
        timeControl: { base: initialTime, increment },
        playerTimes: [initialTime, initialTime],
        lastMoveTimestamp: null,
        lastTickTimestamp: null, // TIMER FIX
        chat: [],
        moves: [], // History Init
        drawOffer: null
      };

      games.set(gameId, newGame);
      socket.join(gameId);

      if (preferredSymbol === 'X') {
        activeUserGames.set(player1._id.toString(), gameId);
      }

      if (callback && typeof callback === 'function') {
        callback({ gameId });
      }
    } catch (err) {
      console.error('[Socket] createFriendGame error:', err);
    }
  });

  /**
   * JOIN GAME
   */
  socket.on('joinGame', async (gameId) => {
    try {
      if (!gameId) return;
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', 'Game not found.');
        return;
      }

      const joiningUserId = socket.userId;
      const existingPlayerIndex = game.playerDetails.findIndex(p => p && p.id === joiningUserId);
      const emptySlotIndex = game.players.findIndex(p => p === null);

      if (emptySlotIndex !== -1 && existingPlayerIndex === -1) {
        const joiningPlayer = await User.findById(joiningUserId).select('username elo');
        if (!joiningPlayer) return;

        game.players[emptySlotIndex] = socket.id;
        game.playerDetails[emptySlotIndex] = {
          id: joiningPlayer._id.toString(),
          username: joiningPlayer.username,
          elo: joiningPlayer.elo
        };

        if (!game.playerToMove) {
          // If no one had the move yet, assign to whoever joined (preserve X/O by index)
          game.playerToMove = socket.id;
        }

        game.lastMoveTimestamp = Date.now();
        game.lastTickTimestamp = Date.now();

        socket.join(gameId);
        if (game.playerDetails[0]?.id) activeUserGames.set(game.playerDetails[0].id, gameId);
        if (game.playerDetails[1]?.id) activeUserGames.set(game.playerDetails[1].id, gameId);

        io.to(game.id).emit('friendJoined', { gameId: game.id });
        io.to(game.id).emit('updateGame', game);

        // TIMER FIX: Start timer loop for friend game once both are in
        startGameTimer(gameId);
      }
      else if (existingPlayerIndex !== -1) {
        const oldSocketId = game.players[existingPlayerIndex];
        if (oldSocketId !== socket.id) {
          game.players[existingPlayerIndex] = socket.id;
          if (game.playerToMove === oldSocketId) {
            game.playerToMove = socket.id;
          }
        }
        socket.join(gameId);
        activeUserGames.set(joiningUserId, gameId);
        socket.emit('updateGame', game);

        // Make sure timer is running if game is active
        if (!game.gameWinner) {
          if (!game.lastTickTimestamp) game.lastTickTimestamp = Date.now();
          startGameTimer(gameId);
        }
      }
      else {
        socket.emit('error', 'This game is full or you are not a player in it.');
      }
    } catch (err) {
      console.error('[Socket] joinGame error:', err);
    }
  });

  /**
   * MAKE MOVE
   */
  socket.on('makeMove', async ({ gameId, boardIndex, cellIndex }) => {
    try {
      const game = games.get(gameId);
      if (!game || game.gameWinner) return;
      if (socket.id !== game.playerToMove) return;
      if (game.boardWinners[boardIndex]) return;
      if (game.allBoards[boardIndex][cellIndex]) return;

      const playerIndex = game.players.indexOf(socket.id);
      if (playerIndex === -1) return;
      const opponentIndex = 1 - playerIndex;
      const symbol = playerIndex === 0 ? 'X' : 'O';

      // Add increment for the player who just moved
      game.playerTimes[playerIndex] += game.timeControl.increment;

      // Place move
      game.allBoards[boardIndex][cellIndex] = symbol;

      // Push to history
      if (!game.moves) game.moves = [];
      game.moves.push({
        player: symbol,
        boardIndex,
        cellIndex,
        moveNumber: game.moves.length + 1,
        timestamp: new Date()
      });

      // Small board result
      const smallBoardResult = calculateWinner(game.allBoards[boardIndex]);
      if (smallBoardResult) {
        game.boardWinners[boardIndex] = smallBoardResult.winner;
      }

      // Big board result
      const gameResult = calculateWinner(game.boardWinners);
      if (gameResult) {
        game.gameWinner = gameResult.winner;
        try {
          const p1Id = game.playerDetails[0].id;
          const p2Id = game.playerDetails[1].id;

          if (game.gameWinner !== 'D') {
            const winnerId = game.gameWinner === 'X' ? p1Id : p2Id;
            const loserId = game.gameWinner === 'X' ? p2Id : p1Id;
            await updateEloAndStats(winnerId, loserId, false);
          } else {
            await updateEloAndStats(p1Id, p2Id, true);
          }
          await saveGameResult(game);
        } catch (err) {
          console.error('[Socket] makeMove saveGameResult error:', err);
        }
        await finalizeGameAndCleanup(game);
      }

      // Decide next active board
      const nextBoardIsWonOrFull =
        game.boardWinners[cellIndex] !== null ||
        game.allBoards[cellIndex].every(c => c !== null);
      game.activeBoard = nextBoardIsWonOrFull ? null : cellIndex;

      // Switch player
      if (!game.gameWinner) {
        game.playerToMove = game.players[opponentIndex];
      }

      game.lastMoveTimestamp = Date.now();
      if (!game.lastTickTimestamp) game.lastTickTimestamp = Date.now();

      io.to(gameId).emit('updateGame', game);
    } catch (err) {
      console.error('[Socket] makeMove error:', err);
    }
  });

  /**
   * RESIGN
   */
  socket.on('resign', async ({ gameId }) => {
    try {
      const game = games.get(gameId);
      if (!game || game.gameWinner) return;

      const resigningPlayerIndex = game.players.indexOf(socket.id);
      if (resigningPlayerIndex === -1) return;

      const winningPlayerIndex = 1 - resigningPlayerIndex;
      game.gameWinner = winningPlayerIndex === 0 ? 'X' : 'O';

      const winnerId = game.playerDetails[winningPlayerIndex]?.id;
      const loserId = game.playerDetails[resigningPlayerIndex]?.id;
      try {
        if (winnerId && loserId) await updateEloAndStats(winnerId, loserId, false);
        await saveGameResult(game);
      } catch (err) {
        console.error('[Socket] resign saveGameResult error:', err);
      }

      await finalizeGameAndCleanup(game);
      io.to(gameId).emit('updateGame', game);
    } catch (err) {
      console.error('[Socket] resign error:', err);
    }
  });

  /**
   * CHAT
   */
  socket.on('sendChatMessage', ({ gameId, message }) => {
    try {
      const game = games.get(gameId);
      if (game && socket.userId) {
        const playerDetail = game.playerDetails.find(
          p => p && String(p.id) === String(socket.userId)
        );

        if (playerDetail) {
          if (!game.chat) game.chat = [];
          game.chat.push({
            userId: socket.userId,
            user: playerDetail.username,
            text: message,
            timestamp: new Date()
          });
          io.to(gameId).emit('updateGame', game);
        }
      }
    } catch (err) {
      console.error('[Socket] sendChatMessage error:', err);
    }
  });

  /**
   * DRAW OFFERS
   */
  socket.on('offerDraw', (gameId) => {
    try {
      const game = games.get(gameId);
      if (game && !game.gameWinner) {
        game.drawOffer = socket.id;
        const opponentSocketId = game.players.find(pId => pId !== socket.id);
        if (opponentSocketId) io.to(opponentSocketId).emit('drawOffered');
        io.to(gameId).emit('updateGame', game);
      }
    } catch (err) {
      console.error('[Socket] offerDraw error:', err);
    }
  });

  socket.on('acceptDraw', async (gameId) => {
    try {
      const game = games.get(gameId);
      if (game && game.drawOffer && game.drawOffer !== socket.id && !game.gameWinner) {
        game.gameWinner = 'D';
        try {
          await saveGameResult(game);
          await updateEloAndStats(game.playerDetails[0].id, game.playerDetails[1].id, true);
        } catch (err) {
          console.error('[Socket] acceptDraw saveGameResult error:', err);
        }

        await finalizeGameAndCleanup(game);
        io.to(gameId).emit('updateGame', game);
      }
    } catch (err) {
      console.error('[Socket] acceptDraw error:', err);
    }
  });

  socket.on('declineDraw', (gameId) => {
    try {
      const game = games.get(gameId);
      if (game) {
        game.drawOffer = null;
        io.to(gameId).emit('updateGame', game);
      }
    } catch (err) {
      console.error('[Socket] declineDraw error:', err);
    }
  });

  /**
   * TIME UPDATE (Optional client sync – server timer is authoritative now)
   */
  socket.on('updateTime', ({ gameId, playerTimes }) => {
    try {
      const game = games.get(gameId);
      if (
        game &&
        Array.isArray(playerTimes) &&
        playerTimes.length === 2 &&
        game.players.includes(socket.id)
      ) {
        game.playerTimes = playerTimes.map(t => Math.max(0, Number(t) || 0));
        io.to(gameId).emit('updateGame', game);
      }
    } catch (err) {
      console.error('[Socket] updateTime error:', err);
    }
  });

  /**
   * Disconnect handling
   */
  socket.on('disconnect', () => {
    try {
      console.log(`[Socket.IO] User Disconnected: ${socket.id}`);
      // Remove from waiting queues
      for (const [tc, queue] of waitingPlayers.entries()) {
        const newQueue = queue.filter(p => p.socket.id !== socket.id);
        if (newQueue.length > 0) waitingPlayers.set(tc, newQueue);
        else waitingPlayers.delete(tc);
      }
      // Note: active games remain; reconnection is handled by joinGame.
    } catch (err) {
      console.error('[Socket] disconnect error:', err);
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] is running on port ${PORT}`));
