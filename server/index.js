// server/index.js
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

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
const games = new Map();            // gameId -> gameObject
const waitingPlayers = new Map();  // timeControl -> socket
const gameIntervals = new Map();   // gameId -> intervalId

/**
 * Helper: calculate small/overall winner for tic-tac-toe style board
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
 * Socket auth middleware
 * Expects token in socket.handshake.auth.token
 */
io.use((socket, next) => {
  const token = socket.handshake.auth && socket.handshake.auth.token;
  if (!token) {
    console.warn('[Socket.IO] Authentication error: No token provided.');
    return next(new Error('Authentication error: No token provided.'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // decoded.user expected shape: { id: '...' }
    socket.userId = decoded.user.id;
    return next();
  } catch (err) {
    console.warn('[Socket.IO] Authentication error: Token invalid.', err);
    return next(new Error('Authentication error: Token is not valid.'));
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User Connected: socketId=${socket.id}, userId=${socket.userId}`);

  /**
   * FIND GAME (matchmaking)
   * Payload: { timeControl: "5+2" } (string)
   */
  socket.on('findGame', async ({ timeControl }) => {
    try {
      if (!timeControl) {
        socket.emit('error', 'Time control not specified.');
        return;
      }

      // If there's a waiting player for the same timeControl, pair them
      if (waitingPlayers.has(timeControl)) {
        const player1Socket = waitingPlayers.get(timeControl);
        // if the waiting socket disconnected in-between, remove and set this socket as waiting
        if (!player1Socket || player1Socket.disconnected) {
          waitingPlayers.delete(timeControl);
          waitingPlayers.set(timeControl, socket);
          socket.emit('waitingForOpponent');
          return;
        }

        // Remove waiting entry
        waitingPlayers.delete(timeControl);

        // Create game
        const gameId = uuidv4();
        const players = [player1Socket.id, socket.id];

        // fetch user data for both players
        const [player1, player2] = await Promise.all([
          User.findById(player1Socket.userId).select('username elo'),
          User.findById(socket.userId).select('username elo')
        ]);

        if (!player1 || !player2) {
          // this is unexpected but handle gracefully
          socket.emit('error', 'Could not find player data for matchmaking.');
          player1Socket.emit('error', 'Could not find player data for matchmaking.');
          return;
        }

        const timeParts = (timeControl || '5+0').split('+');
        const initialTime = parseInt(timeParts[0], 10) * 60 * 1000;
        const increment = parseInt(timeParts[1] || '0', 10) * 1000;

        const newGame = {
          id: gameId,
          players, // socket ids
          playerDetails: [
            { id: player1._id.toString(), username: player1.username, elo: player1.elo },
            { id: player2._id.toString(), username: player2.username, elo: player2.elo }
          ],
          playerToMove: players[0], // socket id who moves first
          allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
          boardWinners: Array(9).fill(null),
          activeBoard: null,
          gameWinner: null,
          timeControl: { base: initialTime, increment },
          playerTimes: [initialTime, initialTime],
          lastMoveTimestamp: Date.now(),
          chat: [],
          drawOffer: null,
        };

        // save game
        games.set(gameId, newGame);
        activeUserGames.set(player1Socket.userId, gameId);
        activeUserGames.set(socket.userId, gameId);

        // join sockets to room
        player1Socket.join(gameId);
        socket.join(gameId);

        // emit initial notifications
        io.to(gameId).emit('gameStarted', { gameId });
        // IMPORTANT: send full game state immediately so clients don't wait
        io.to(gameId).emit('updateGame', newGame);

        // start loop for this game
        const gameLoop = setInterval(async () => {
          const game = games.get(gameId);
          if (!game || game.gameWinner) {
            if (game) {
              // cleanup user->game mapping (playerDetails contain user ids)
              try {
                const p0Id = game.playerDetails?.[0]?.id;
                const p1Id = game.playerDetails?.[1]?.id;
                if (p0Id) activeUserGames.delete(p0Id);
                if (p1Id) activeUserGames.delete(p1Id);
              } catch (err) {
                console.warn('[GameLoop] cleanup mapping error', err);
              }
            }
            clearInterval(gameLoop);
            gameIntervals.delete(gameId);
            return;
          }

          const now = Date.now();
          const timeElapsed = now - (game.lastMoveTimestamp || now);
          const activePlayerIndex = game.players.indexOf(game.playerToMove);

          if (activePlayerIndex !== -1) {
            game.playerTimes[activePlayerIndex] -= timeElapsed;
            if (game.playerTimes[activePlayerIndex] < 0) {
              game.playerTimes[activePlayerIndex] = 0;
            }
          }
          game.lastMoveTimestamp = now;

          // timeout detection
          if (activePlayerIndex !== -1 && game.playerTimes[activePlayerIndex] <= 0) {
            // If one player's time hit zero -> opponent wins
            const winnerIndex = activePlayerIndex === 0 ? 1 : 0;
            game.gameWinner = winnerIndex === 0 ? 'X' : 'O';
            // winner/loser are by playerDetails user ids
            const winnerUserId = game.playerDetails[winnerIndex]?.id;
            const loserUserId = game.playerDetails[activePlayerIndex]?.id;

            try {
              if (winnerUserId && loserUserId) {
                await updateEloAndStats(winnerUserId, loserUserId, false);
              }
              await saveGameResult(game);
            } catch (err) {
              console.error('[GameLoop] Error saving result after timeout', err);
            }
          }

          // broadcast current state (time updates, game updates)
          io.to(gameId).emit('updateGame', game);
          io.to(gameId).emit('timeUpdate', { playerTimes: game.playerTimes });

          // if gameWinner set during processing, cleanup
          if (game.gameWinner) {
            try {
              const p0Id = game.playerDetails?.[0]?.id;
              const p1Id = game.playerDetails?.[1]?.id;
              if (p0Id) activeUserGames.delete(p0Id);
              if (p1Id) activeUserGames.delete(p1Id);
            } catch (err) {
              console.warn('[GameLoop] cleanup mapping error after finish', err);
            }
            clearInterval(gameLoop);
            gameIntervals.delete(gameId);
          }
        }, 1000);

        gameIntervals.set(gameId, gameLoop);
      } else {
        // No waiting player for this timeControl: become the waiting player
        waitingPlayers.set(timeControl, socket);
        socket.emit('waitingForOpponent');
      }
    } catch (err) {
      console.error('[Socket] findGame error:', err);
      socket.emit('error', 'Error while finding/creating game.');
    }
  });

  /**
   * CREATE FRIEND GAME
   * Payload: { timeControl: '5+0' }
   * Callback: ( { gameId } ) => {}
   */
  socket.on('createFriendGame', async ({ timeControl }, callback) => {
    try {
      const gameId = uuidv4();
      const player1 = await User.findById(socket.userId).select('username elo');
      if (!player1) {
        if (callback) callback({ error: 'Could not find creator data.' });
        return;
      }

      const timeParts = (timeControl || '5+0').split('+');
      const initialTime = parseInt(timeParts[0], 10) * 60 * 1000;
      const increment = parseInt(timeParts[1] || '0', 10) * 1000;

      const newGame = {
        id: gameId,
        players: [socket.id, null], // second player will join later
        playerDetails: [
          { id: player1._id.toString(), username: player1.username, elo: player1.elo },
          null
        ],
        playerToMove: socket.id,
        allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
        boardWinners: Array(9).fill(null),
        activeBoard: null,
        gameWinner: null,
        timeControl: { base: initialTime, increment },
        playerTimes: [initialTime, initialTime],
        lastMoveTimestamp: null, // will be set when second player joins
        chat: [],
        drawOffer: null
      };

      games.set(gameId, newGame);
      socket.join(gameId);

      // return gameId to creator
      if (callback && typeof callback === 'function') {
        callback({ gameId });
      }
    } catch (err) {
      console.error('[Socket] createFriendGame error:', err);
      if (callback && typeof callback === 'function') callback({ error: 'Error creating friend game.' });
    }
  });

  /**
   * JOIN GAME (friend game or reconnect)
   * Payload: gameId (string)
   * --- THIS HANDLER IS FIXED ---
   */
  socket.on('joinGame', async (gameId) => {
    try {
      if (!gameId) {
        socket.emit('error', 'Game ID not provided.');
        return;
      }
      const game = games.get(gameId);
      if (!game) {
        socket.emit('error', 'Game not found.');
        return;
      }

      const joiningUserId = socket.userId;
      const playerIndexInGame = game.playerDetails.findIndex(p => p && p.id === joiningUserId);

      // Case 1: Joining a friend game where the second slot is empty
      if (game.players[1] === null && playerIndexInGame === -1) {
        const player2 = await User.findById(joiningUserId).select('username elo');
        if (!player2) {
          socket.emit('error', 'Could not find player data.');
          return;
        }

        game.players[1] = socket.id;
        game.playerDetails[1] = { id: player2._id.toString(), username: player2.username, elo: player2.elo };
        game.lastMoveTimestamp = Date.now();

        socket.join(gameId);
        activeUserGames.set(joiningUserId, gameId);
        io.to(game.players[0]).emit('friendJoined', { gameId: game.id });
        io.to(gameId).emit('updateGame', game);

        // Start the game loop for this friend game
        const gameLoop = setInterval(async () => {
          const currentGame = games.get(gameId);
          if (!currentGame || currentGame.gameWinner) {
            clearInterval(gameLoop);
            gameIntervals.delete(gameId);
            return;
          }
          const now = Date.now();
          const timeElapsed = now - (currentGame.lastMoveTimestamp || now);
          const activePlayerIndex = currentGame.players.indexOf(currentGame.playerToMove);
          if (activePlayerIndex !== -1) {
            currentGame.playerTimes[activePlayerIndex] -= timeElapsed;
            if (currentGame.playerTimes[activePlayerIndex] < 0) {
              currentGame.playerTimes[activePlayerIndex] = 0;
              const winnerIndex = 1 - activePlayerIndex;
              currentGame.gameWinner = winnerIndex === 0 ? 'X' : 'O';
              try {
                const winnerId = currentGame.playerDetails[winnerIndex]?.id;
                const loserId = currentGame.playerDetails[activePlayerIndex]?.id;
                if (winnerId && loserId) await updateEloAndStats(winnerId, loserId, false);
                await saveGameResult(currentGame);
              } catch (err) {
                console.error('[FriendGameLoop] error saving result after timeout', err);
              }
            }
          }
          currentGame.lastMoveTimestamp = now;
          io.to(gameId).emit('updateGame', currentGame);
          io.to(gameId).emit('timeUpdate', { playerTimes: currentGame.playerTimes });
          if (currentGame.gameWinner) {
            clearInterval(gameLoop);
            gameIntervals.delete(gameId);
          }
        }, 1000);
        gameIntervals.set(gameId, gameLoop);
      }
      // Case 2: Reconnecting or joining a game you are already part of
      else if (playerIndexInGame !== -1) {
        const oldSocketId = game.players[playerIndexInGame];
        if (oldSocketId !== socket.id) {
          console.log(`[Game ${gameId}] Player ${joiningUserId} reconnected. Socket ID ${oldSocketId} -> ${socket.id}`);
          game.players[playerIndexInGame] = socket.id;
          if (game.playerToMove === oldSocketId) {
            game.playerToMove = socket.id;
          }
        }
        socket.join(gameId);
        activeUserGames.set(joiningUserId, gameId);
        socket.emit('updateGame', game); // Send current state to the reconnected player
      }
      // Case 3: Invalid join attempt
      else {
        socket.emit('error', 'This game is full or you are not a player in it.');
      }
    } catch (err) {
      console.error('[Socket] joinGame error:', err);
      socket.emit('error', 'Error joining game.');
    }
  });

  /**
   * MAKE MOVE
   * Payload: { gameId, boardIndex, cellIndex }
   */
  socket.on('makeMove', async ({ gameId, boardIndex, cellIndex }) => {
    try {
      const game = games.get(gameId);
      if (!game) return;

      // validations
      if (game.gameWinner) return;
      if (socket.id !== game.playerToMove) return;
      if (game.boardWinners[boardIndex]) return; // small board already won
      if (game.allBoards[boardIndex][cellIndex]) return; // cell occupied

      const playerIndex = game.players.indexOf(socket.id);
      const opponentIndex = playerIndex === 0 ? 1 : 0;

      // increment clock of player who just moved
      game.playerTimes[playerIndex] += game.timeControl.increment;

      const playerMark = playerIndex === 0 ? 'X' : 'O';
      game.allBoards[boardIndex][cellIndex] = playerMark;

      // check small board result
      const smallBoardResult = calculateWinner(game.allBoards[boardIndex]);
      if (smallBoardResult) {
        game.boardWinners[boardIndex] = smallBoardResult.winner;
      }

      // check overall result
      const gameResult = calculateWinner(game.boardWinners);
      if (gameResult) {
        game.gameWinner = gameResult.winner;
        try {
          await saveGameResult(game);
          if (game.gameWinner !== 'D') {
            const winnerId = game.playerDetails[playerIndex].id;
            const loserId = game.playerDetails[opponentIndex].id;
            await updateEloAndStats(winnerId, loserId, false);
          } else {
            await updateEloAndStats(game.playerDetails[0].id, game.playerDetails[1].id, true);
          }
        } catch (err) {
          console.error('[makeMove] error updating elo / saving result', err);
        }
      }

      // determine next activeBoard
      const nextBoardIsWonOrFull = game.boardWinners[cellIndex] !== null || game.allBoards[cellIndex].every(Boolean);
      game.activeBoard = nextBoardIsWonOrFull ? null : cellIndex;

      // swap turn
      if (!game.gameWinner) {
        game.playerToMove = game.players[opponentIndex];
      }

      // update lastMoveTimestamp to now (tick loop will use this)
      game.lastMoveTimestamp = Date.now();

      io.to(gameId).emit('updateGame', game);
    } catch (err) {
      console.error('[Socket] makeMove error:', err);
    }
  });

  /**
   * RESIGN
   * Payload: { gameId }
   */
  socket.on('resign', async ({ gameId }) => {
    try {
      const game = games.get(gameId);
      if (!game || game.gameWinner) return;

      const resigningPlayerIndex = game.players.indexOf(socket.id);
      if (resigningPlayerIndex === -1) return;

      const winningPlayerIndex = resigningPlayerIndex === 0 ? 1 : 0;
      game.gameWinner = winningPlayerIndex === 0 ? 'X' : 'O';

      const winnerId = game.playerDetails[winningPlayerIndex]?.id;
      const loserId = game.playerDetails[resigningPlayerIndex]?.id;

      try {
        if (winnerId && loserId) {
          await updateEloAndStats(winnerId, loserId, false);
        }
        await saveGameResult(game);
      } catch (err) {
        console.error('[resign] error updating elo / saving result', err);
      }

      io.to(gameId).emit('updateGame', game);
    } catch (err) {
      console.error('[Socket] resign error:', err);
    }
  });

  /**
   * CHAT
   * Payload: { gameId, message }
   */
  socket.on('sendChatMessage', ({ gameId, message }) => {
    try {
      const game = games.get(gameId);
      if (game && socket.userId) {
        // find player detail by userId (playerDetails store user ids)
        const playerDetail = game.playerDetails.find(p => p && p.id === socket.userId);
        if (playerDetail) {
          const chatMessage = { sender: playerDetail.username, text: message, timestamp: new Date() };
          game.chat.push(chatMessage);
          io.to(gameId).emit('updateGame', game);
        } else {
          // User not found in this game's playerDetails -> ignore
          socket.emit('error', 'You are not part of this game chat.');
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
        if (opponentSocketId) {
          io.to(opponentSocketId).emit('drawOffered');
        }
        // broadcast state so UI can reflect draw offer
        io.to(gameId).emit('updateGame', game);
      }
    } catch (err) {
      console.error('[Socket] offerDraw error:', err);
    }
  });

  socket.on('acceptDraw', async (gameId) => {
    try {
      const game = games.get(gameId);
      if (game && game.drawOffer && game.drawOffer !== socket.id) {
        // Mark draw
        game.gameWinner = 'D';
        try {
          await saveGameResult(game);
          await updateEloAndStats(game.playerDetails[0].id, game.playerDetails[1].id, true);
        } catch (err) {
          console.error('[acceptDraw] error saving draw result', err);
        }
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
   * TIME UPDATE (optional client emitted)
   * If client chooses to emit time updates, handle carefully.
   * We will trust server authoritative time, but support a client request
   * to sync times for UI purposes: payload { gameId, playerTimes: [ms, ms] }
   */
  socket.on('updateTime', ({ gameId, playerTimes }) => {
    try {
      const game = games.get(gameId);
      if (!game) return;
      // Basic validation: ensure arrays and lengths correct
      if (!Array.isArray(playerTimes) || playerTimes.length !== 2) return;
      // Overwrite server's playerTimes ONLY if this socket is part of the game.
      if (!game.players.includes(socket.id)) return;
      // For safety, only set for UI sync — do not allow negative values
      game.playerTimes = playerTimes.map(t => (typeof t === 'number' && t >= 0 ? t : 0));
      // Broadcast the authoritative time update (clients will still be reconciled by server loop)
      io.to(gameId).emit('timeUpdate', { playerTimes: game.playerTimes });
    } catch (err) {
      console.error('[Socket] updateTime error:', err);
    }
  });

  /**
   * Disconnect handling
   */
  socket.on('disconnect', () => {
    try {
      console.log(`[Socket.IO] User Disconnected: socketId=${socket.id}, userId=${socket.userId}`);

      // If this socket was waiting for a match, remove it
      for (const [tc, waitSock] of waitingPlayers.entries()) {
        if (waitSock && waitSock.id === socket.id) {
          waitingPlayers.delete(tc);
          break;
        }
      }

      // For active games, we keep the game state for a while to allow reconnects.
      // The robust `joinGame` handler will manage the reconnection logic.
    } catch (err) {
      console.error('[Socket] disconnect handler error:', err);
    }
  });
});

// Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] is running on port ${PORT}`));