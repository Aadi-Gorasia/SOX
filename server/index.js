// server/index.js (or server.js)
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const GameManager = require('./classes/GameManager');
const TournamentManager = require('./classes/TournamentManager');

const app = express();

const allowedOrigin = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, "http://localhost:3000"]
  : "http://localhost:3000";

app.use(cors({
  origin: allowedOrigin,
  credentials: true
}));

app.use(express.json({ extended: false }));

// ─── DATABASE CONNECTION ──────────────────────────────────────────────────────
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('[Server] MongoDB Connected...'))
  .catch(err => console.error('[Server] MongoDB connection error:', err));

// ─── API ROUTING LAYER ────────────────────────────────────────────────────────
app.use('/api/users', require('./routes/users'));
app.use('/api/auth',  require('./routes/auth'));

// Mount the unified game/engine controller
const gamesRouter = require('./routes/games');
app.use('/api/games', gamesRouter);
app.use('/api/puzzles', gamesRouter); // Alias redirection for absolute DRY compatibility

// ─── SOX ENGINE KEEPALIVE LOOP ────────────────────────────────────────────────
// Pings Render every 10 min so the engine instance container never enters a cold start state.
if (process.env.SOX_ENGINE_URL) {
  setInterval(async () => {
    try {
      const res = await fetch(process.env.SOX_ENGINE_URL);
      console.log(`[Engine] Keepalive status verify: OK (${res.status})`);
    } catch (e) {
      console.warn('[Engine] Keepalive execution ping failed:', e.message);
    }
  }, 10 * 60 * 1000);
  console.log('[Engine] Active heartbeat loop bound to:', process.env.SOX_ENGINE_URL);
}

// ─── SERVER & SOCKETS INITIALIZATION ──────────────────────────────────────────
const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigin,
    methods: ["GET", "POST"]
  } 
});

const gameManager = new GameManager(io);
const tournamentManager = new TournamentManager(io, gameManager);

// WebSockets Security Identification Interceptor
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Auth Error: Token absent'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.user.id;
    next();
  } catch (err) { 
    next(new Error('Auth Error: Verification fallback signature failure')); 
  }
});

// ─── REALTIME EVENT COMMUNICATIONS ────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Operational stream bind: ${socket.userId} (${socket.id})`);

  socket.on('ping_latency', () => socket.emit('pong_latency'));

  // ── MATCHMAKING & GAMEPLAY ──
  socket.on('findGame', ({ timeControl, preferredSymbol }) => {
    gameManager.findMatch(socket, timeControl, preferredSymbol)
      .catch(err => console.error(err));
  });

  socket.on('joinGame', (gameId) => {
    const game = gameManager.getGame(gameId);
    if (game) {
      socket.join(gameId);
      const pIdx = game.playerDetails.findIndex(p => 
        (p.id  && p.id.toString()  === socket.userId.toString()) || 
        (p._id && p._id.toString() === socket.userId.toString())
      );
      if (pIdx !== -1) {
        const oldSocketId = game.players[pIdx];
        game.players[pIdx] = socket.id;
        if (game.playerToMove === oldSocketId) game.playerToMove = socket.id;
        console.log(`[Game ${gameId}] Connection re-route assigned. ${oldSocketId} → ${socket.id}`);
        gameManager.sendPlayerStakes(gameId, socket);
      }
      io.to(gameId).emit('updateGame', game);
    }
  });

  socket.on('makeMove', (data) => gameManager.makeMove(socket, data));

  socket.on('resign', ({ gameId }) => {
    const game = gameManager.getGame(gameId);
    if (!game) return;
    const pIdx   = game.players.indexOf(socket.id);
    const winSym = pIdx === 0 ? 'X' : 'O';
    const oppSym = winSym === 'X' ? 'O' : 'X';
    const winnerDetails = game.playerDetails.find(p => 
      (p.id  && p.id.toString()  !== socket.userId.toString()) || 
      (p._id && p._id.toString() !== socket.userId.toString())
    );
    gameManager.endGame(gameId, { winner: oppSym, reason: 'resignation' });
    if (winnerDetails) tournamentManager.handleMatchEnd(gameId, winnerDetails);
  });

  socket.on('offerDraw',   ({ gameId }) => gameManager.offerDraw(gameId, socket.id));
  socket.on('acceptDraw',  ({ gameId }) => gameManager.acceptDraw(gameId, socket.id));
  socket.on('declineDraw', ({ gameId }) => gameManager.declineDraw(gameId));

  socket.on('sendChatMessage', ({ gameId, message }) => {
    const game = gameManager.getGame(gameId);
    if (game) {
      const p = game.playerDetails.find(pd => 
        (pd.id  && pd.id.toString()  === socket.userId.toString()) || 
        (pd._id && pd._id.toString() === socket.userId.toString())
      );
      if (p) {
        game.chat.push({ user: p.username, text: message });
        io.to(gameId).emit('updateGame', game);
      }
    }
  });

  // ── TOURNAMENT MANAGEMENT ──
  socket.on('joinTournamentQueue',    (user) => tournamentManager.joinQueue(socket, user));
  socket.on('leaveTournamentQueue',   ()     => tournamentManager.leaveQueue(socket));
  socket.on('requestTournamentState', (tId)  => {
    const t = tournamentManager.tournaments.get(tId);
    if (t) { socket.join(tId); socket.emit('tournamentState', t); }
  });

  // ── TERMINATION UTILS ──
  socket.on('disconnect', () => {
    gameManager.handleDisconnect(socket);
    tournamentManager.leaveQueue(socket);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => console.log(`[Server] Technical runtime hosting established on port ${PORT}`));