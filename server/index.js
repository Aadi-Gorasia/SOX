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
mongoose.connect(process.env.MONGO_URI).then(() => console.log('[Server] MongoDB Connected...')).catch(err => console.error(err));

app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));

const activeUserGames = new Map();
app.get('/api/games/active', authMiddleware, (req, res) => {
    res.json({ gameId: activeUserGames.get(req.user.id) || null });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "http://localhost:3000" } });

const games = new Map();
const waitingPlayers = new Map();
const gameIntervals = new Map();

function calculateWinner(squares) {
  const lines = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] !== 'D' && squares[a] === squares[b] && squares[a] === squares[c]) {
      return { winner: squares[a] };
    }
  }
  if (squares.every(square => square !== null)) { return { winner: 'D' }; }
  return null;
}

io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) { return next(new Error('Authentication error: No token provided.')); }
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.user.id;
        next();
    } catch (err) {
        return next(new Error('Authentication error: Token is not valid.'));
    }
});

io.on('connection', (socket) => {
  console.log(`[Socket.IO] User Connected: ${socket.id}, UserID: ${socket.userId}`);

  socket.on('findGame', async ({ timeControl }) => {
    if (waitingPlayers.has(timeControl)) {
      const player1Socket = waitingPlayers.get(timeControl);
      waitingPlayers.delete(timeControl);
      try {
        const gameId = uuidv4();
        const players = [player1Socket.id, socket.id];
        const [player1, player2] = await Promise.all([ User.findById(player1Socket.userId).select('username elo'), User.findById(socket.userId).select('username elo') ]);
        if (!player1 || !player2) throw new Error('Could not find player data.');
        const timeParts = timeControl.split('+');
        const initialTime = parseInt(timeParts[0]) * 60 * 1000;
        const increment = parseInt(timeParts[1]) * 1000;
        const newGame = {
          id: gameId, players,
          playerDetails: [{ id: player1._id.toString(), username: player1.username, elo: player1.elo }, { id: player2._id.toString(), username: player2.username, elo: player2.elo }],
          playerToMove: players[0], allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
          boardWinners: Array(9).fill(null), activeBoard: null, gameWinner: null,
          timeControl: { base: initialTime, increment },
          playerTimes: [initialTime, initialTime], lastMoveTimestamp: Date.now(),
          chat: [], drawOffer: null,
        };
        games.set(gameId, newGame);
        activeUserGames.set(player1Socket.userId, gameId); activeUserGames.set(socket.userId, gameId);
        player1Socket.join(gameId); socket.join(gameId);
        io.to(gameId).emit('gameStarted', { gameId });
        
        const gameLoop = setInterval(async () => {
          const game = games.get(gameId);
          if (!game || game.gameWinner) {
            if (game) { activeUserGames.delete(game.playerDetails[0].id); activeUserGames.delete(game.playerDetails[1].id); }
            clearInterval(gameLoop); gameIntervals.delete(gameId);
            return;
          }
          const now = Date.now();
          const timeElapsed = now - game.lastMoveTimestamp;
          const activePlayerIndex = game.players.indexOf(game.playerToMove);
          if (activePlayerIndex !== -1) { game.playerTimes[activePlayerIndex] -= timeElapsed; }
          game.lastMoveTimestamp = now;
          if (game.playerTimes[activePlayerIndex] <= 0) {
            game.playerTimes[activePlayerIndex] = 0;
            game.gameWinner = activePlayerIndex === 0 ? 'O' : 'X';
            const winnerId = game.playerDetails[activePlayerIndex === 0 ? 1 : 0].id;
            const loserId = game.playerDetails[activePlayerIndex].id;
            await updateEloAndStats(winnerId, loserId, false);
            await saveGameResult(game);
          }
          io.to(gameId).emit('updateGame', game);
          if (game.gameWinner) {
            activeUserGames.delete(game.playerDetails[0].id); activeUserGames.delete(game.playerDetails[1].id);
            clearInterval(gameLoop); gameIntervals.delete(gameId);
          }
        }, 1000);
        gameIntervals.set(gameId, gameLoop);
      } catch (err) { console.error("Error creating game:", err); }
    } else {
      waitingPlayers.set(timeControl, socket);
      socket.emit('waitingForOpponent');
    }
  });
  
  socket.on('createFriendGame', async ({ timeControl }, callback) => {
    try {
        const gameId = uuidv4();
        const player1 = await User.findById(socket.userId).select('username elo');
        if (!player1) throw new Error('Could not find creator data.');
        const timeParts = timeControl.split('+');
        const initialTime = parseInt(timeParts[0]) * 60 * 1000;
        const increment = parseInt(timeParts[1]) * 1000;
        const newGame = {
          id: gameId, players: [socket.id, null],
          playerDetails: [ { id: player1._id.toString(), username: player1.username, elo: player1.elo }, null ],
          playerToMove: socket.id,
          allBoards: Array(9).fill(null).map(() => Array(9).fill(null)),
          boardWinners: Array(9).fill(null), activeBoard: null, gameWinner: null,
          timeControl: { base: initialTime, increment },
          playerTimes: [initialTime, initialTime], lastMoveTimestamp: null,
          chat: [], drawOffer: null
        };
        games.set(gameId, newGame);
        socket.join(gameId);
        callback({ gameId });
    } catch (err) { console.error("Error creating friend game:", err); }
  });

  socket.on('joinGame', async (gameId) => {
    const game = games.get(gameId);
    if (game) {
      if (game.players[1] === null && game.players[0] !== socket.id) {
        const player2 = await User.findById(socket.userId).select('username elo');
        if (!player2) return;
        game.players[1] = socket.id;
        game.playerDetails[1] = { id: player2._id.toString(), username: player2.username, elo: player2.elo };
        game.lastMoveTimestamp = Date.now();
        socket.join(gameId);
        io.to(game.players[0]).emit('friendJoined', { gameId: game.id });
        io.to(gameId).emit('updateGame', game);
        const gameLoop = setInterval(async () => {
            const currentGame = games.get(gameId);
            if (!currentGame || currentGame.gameWinner) { clearInterval(gameLoop); gameIntervals.delete(gameId); return; }
            const now = Date.now();
            const timeElapsed = now - currentGame.lastMoveTimestamp;
            const activePlayerIndex = currentGame.players.indexOf(currentGame.playerToMove);
            if (activePlayerIndex !== -1) { currentGame.playerTimes[activePlayerIndex] -= timeElapsed; }
            currentGame.lastMoveTimestamp = now;
            if (currentGame.playerTimes[activePlayerIndex] <= 0) { /* ... timeout logic ... */ }
            io.to(gameId).emit('timeUpdate', { playerTimes: currentGame.playerTimes });
        }, 1000);
        gameIntervals.set(gameId, gameLoop);
      } else {
        socket.join(gameId);
        socket.emit('updateGame', game);
      }
    }
  });

  socket.on('makeMove', async ({ gameId, boardIndex, cellIndex }) => {
    const game = games.get(gameId);
    if (!game || game.gameWinner || socket.id !== game.playerToMove || game.boardWinners[boardIndex] || game.allBoards[boardIndex][cellIndex]) { return; }
    const playerIndex = game.players.indexOf(socket.id);
    const opponentIndex = playerIndex === 0 ? 1 : 0;
    game.playerTimes[playerIndex] += game.timeControl.increment;
    const playerMark = playerIndex === 0 ? 'X' : 'O';
    game.allBoards[boardIndex][cellIndex] = playerMark;
    const smallBoardResult = calculateWinner(game.allBoards[boardIndex]);
    if (smallBoardResult) { game.boardWinners[boardIndex] = smallBoardResult.winner; }
    const gameResult = calculateWinner(game.boardWinners);
    if (gameResult) {
      game.gameWinner = gameResult.winner;
      await saveGameResult(game);
      if (game.gameWinner !== 'D') {
        const winnerId = game.playerDetails[playerIndex].id;
        const loserId = game.playerDetails[opponentIndex].id;
        await updateEloAndStats(winnerId, loserId, false);
      } else {
        await updateEloAndStats(game.playerDetails[0].id, game.playerDetails[1].id, true);
      }
    }
    const nextBoardIsWonOrFull = game.boardWinners[cellIndex] !== null;
    game.activeBoard = nextBoardIsWonOrFull ? null : cellIndex;
    if (!game.gameWinner) { game.playerToMove = game.players[opponentIndex]; }
    io.to(gameId).emit('updateGame', game);
  });
  
  socket.on('resign', async ({ gameId }) => {
    const game = games.get(gameId);
    if (!game || game.gameWinner) { return; }
    const resigningPlayerIndex = game.players.indexOf(socket.id);
    const winningPlayerIndex = resigningPlayerIndex === 0 ? 1 : 0;
    game.gameWinner = winningPlayerIndex === 0 ? 'X' : 'O';
    const winnerId = game.playerDetails[winningPlayerIndex].id;
    const loserId = game.playerDetails[resigningPlayerIndex].id;
    await updateEloAndStats(winnerId, loserId, false);
    await saveGameResult(game);
    io.to(gameId).emit('updateGame', game);
  });

  socket.on('sendChatMessage', ({ gameId, message }) => {
    const game = games.get(gameId);
    if (game && socket.userId) {
        const playerDetail = game.playerDetails.find(p => p.id === socket.userId);
        if(playerDetail){
            const chatMessage = { sender: playerDetail.username, text: message, timestamp: new Date() };
            game.chat.push(chatMessage);
            io.to(gameId).emit('updateGame', game);
        }
    }
  });

  socket.on('offerDraw', (gameId) => {
    const game = games.get(gameId);
    if (game && !game.gameWinner) {
        game.drawOffer = socket.id;
        const opponentSocketId = game.players.find(pId => pId !== socket.id);
        if (opponentSocketId) { io.to(opponentSocketId).emit('drawOffered'); }
    }
  });

  socket.on('acceptDraw', async (gameId) => {
    const game = games.get(gameId);
    if (game && game.drawOffer && game.drawOffer !== socket.id) {
        game.gameWinner = 'D';
        await saveGameResult(game);
        await updateEloAndStats(game.playerDetails[0].id, game.playerDetails[1].id, true);
        io.to(gameId).emit('updateGame', game);
    }
  });
  
  socket.on('declineDraw', (gameId) => {
    const game = games.get(gameId);
    if(game) {
        game.drawOffer = null;
        io.to(gameId).emit('updateGame', game);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] User Disconnected: ${socket.id}`);
    for (const [key, value] of waitingPlayers.entries()) {
      if (value.id === socket.id) {
        waitingPlayers.delete(key);
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`[Server] is running on port ${PORT}`));