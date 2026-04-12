require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const GameManager = require('./classes/GameManager');

const app = express();

const allowedOrigin = process.env.FRONTEND_URL 
  ?[process.env.FRONTEND_URL, "http://localhost:3000"]
  : "http://localhost:3000";

app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json({ extended: false }));

// DB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[Server] MongoDB Connected...'))
  .catch(err => console.error(err));

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/games', require('./routes/games'));

const server = http.createServer(app);

const io = new Server(server, { 
  cors: { 
    origin: allowedOrigin,
    methods:["GET", "POST"]
  } 
});

const gameManager = new GameManager(io);

// Auth Middleware for Socket
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth Error'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user.id;
    next();
  } catch (err) { next(new Error('Invalid Token')); }
});

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.userId} (Socket ID: ${socket.id})`);

  socket.on('ping_latency', () => {
    socket.emit('pong_latency');
  });

  socket.on('findGame', ({ timeControl, preferredSymbol }) => {
    gameManager.findMatch(socket, timeControl, preferredSymbol)
      .catch(err => console.error(err));
  });

  // ==========================================
  // RECONNECTION / PAGE RELOAD FIX
  // ==========================================
  socket.on('joinGame', (gameId) => {
    const game = gameManager.getGame(gameId);
    if (game) {
      // 1. ALWAYS let the socket join the room so they can receive data
      socket.join(gameId);

      // 2. Find the player using loose String comparison (fixes ObjectId vs String mismatch)
      const pIdx = game.playerDetails.findIndex(p => 
        (p.id && p.id.toString() === socket.userId.toString()) || 
        (p._id && p._id.toString() === socket.userId.toString())
      );
      
      if (pIdx !== -1) {
        const oldSocketId = game.players[pIdx];
        
        // Update the player's socket ID in the game array
        game.players[pIdx] = socket.id;
        
        // CRITICAL FIX: If it was their turn, update playerToMove to the NEW socket ID
        if (game.playerToMove === oldSocketId) {
          game.playerToMove = socket.id;
        }

        console.log(`[Game ${gameId}] Player reconnected. Replaced socket ${oldSocketId} with ${socket.id}`);
        
        // Send ELO stakes specifically to this reconnected player
        gameManager.sendPlayerStakes(gameId, socket);
      }

      // 3. ALWAYS broadcast the updated game state so the frontend loading screen unfreezes!
      io.to(gameId).emit('updateGame', game);
    }
  });

  socket.on('makeMove', (data) => gameManager.makeMove(socket, data));
  
  socket.on('resign', ({ gameId }) => {
     const game = gameManager.getGame(gameId);
     if(!game) return;
     const pIdx = game.players.indexOf(socket.id);
     const winSym = pIdx === 0 ? 'X' : 'O'; // Fixed symbol mapping (Player 0 is X)
     const oppSym = winSym === 'X' ? 'O' : 'X';
     gameManager.endGame(gameId, { winner: oppSym, reason: 'resignation' });
  });
  
  socket.on('offerDraw', ({ gameId }) => gameManager.offerDraw(gameId, socket.id));
  socket.on('acceptDraw', ({ gameId }) => gameManager.acceptDraw(gameId, socket.id));
  socket.on('declineDraw', ({ gameId }) => gameManager.declineDraw(gameId));

  socket.on('sendChatMessage', ({ gameId, message }) => {
    const game = gameManager.getGame(gameId);
    if (game) {
      const p = game.playerDetails.find(pd => pd.id === socket.userId);
      if (p) {
        game.chat.push({ user: p.username, text: message });
        io.to(gameId).emit('updateGame', game);
      }
    }
  });

  socket.on('disconnect', () => gameManager.handleDisconnect(socket));
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`[Server] running on port ${PORT}`));