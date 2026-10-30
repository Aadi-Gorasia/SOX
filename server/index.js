
require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const GameManager = require('./classes/GameManager');
const TournamentManager = require('./classes/TournamentManager');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;

// ─── CONFIGURATION ────────────────────────────────────────────────────────────

if (!process.env.MONGO_URI) {
  console.error('[Startup] MONGO_URI is missing.');
  process.exit(1);
}

const allowedOrigins = [
  'http://localhost:3000',
  'https://soxc.vercel.app',
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [])
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    const isAllowed =
      !origin ||
      allowedOrigins.includes(origin) ||
      /^https:\/\/sox-[a-z0-9-]+-aadis-projects-641df6d8\.vercel\.app$/.test(origin);

    if (isAllowed) {
      return callback(null, true);
    }

    console.error('[CORS] Rejected origin:', origin);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// ─── HEALTH AND READINESS ─────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    database: mongoose.connection.readyState === 1
      ? 'connected'
      : 'disconnected'
  });
});

app.get('/ready', (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      status: 'not_ready',
      database: 'disconnected'
    });
  }

  res.status(200).json({ status: 'ready' });
});

// ─── API ROUTES ───────────────────────────────────────────────────────────────

app.use('/api/users', require('./routes/users'));
app.use('/api/auth', require('./routes/auth'));
console.log('[DEBUG] Auth routes mounted');
console.log('[DEBUG] Working directory:', process.cwd());
const gamesRouter = require('./routes/games');

app.use('/api/games', gamesRouter);
app.use('/api/puzzles', gamesRouter);

// ─── SOCKET.IO ────────────────────────────────────────────────────────────────

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

const gameManager = new GameManager(io);
const tournamentManager = new TournamentManager(io, gameManager);

// Authenticate socket connections.
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;

  if (!token) {
    return next(new Error('Authentication token missing'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.user?.id) {
      return next(new Error('Invalid authentication token'));
    }

    socket.userId = decoded.user.id;
    next();
  } catch (err) {
    next(new Error('Invalid or expired authentication token'));
  }
});

// ─── REALTIME GAME EVENTS ─────────────────────────────────────────────────────

io.on('connection', (socket) => {
  console.log(
    `[Socket] Connected: user=${socket.userId}, socket=${socket.id}`
  );

  socket.on('ping_latency', () => {
    socket.emit('pong_latency');
  });

  socket.on('findGame', ({ timeControl, preferredSymbol } = {}) => {
    console.log(
      `[Matchmaking] Request: user=${socket.userId}, socket=${socket.id}, timeControl=${timeControl}, symbol=${preferredSymbol}`
    );

    Promise.resolve()
      .then(() => gameManager.findMatch(
        socket,
        timeControl,
        preferredSymbol
      ))
      .then(game => {
        console.log(
          `[Matchmaking] ${game ? 'Paired' : 'No game returned'}: user=${socket.userId}, socket=${socket.id}, timeControl=${timeControl}${game ? `, game=${game.id}` : ''}`
        );
      })
      .catch(err => console.error(
        `[Matchmaking] Error: user=${socket.userId}, socket=${socket.id}, timeControl=${timeControl}`,
        err
      ));
  });

  socket.on('cancelFindGame', () => {
    gameManager.cancelMatchmaking(socket);
    console.log(
      `[Matchmaking] Cancelled: user=${socket.userId}, socket=${socket.id}`
    );
  });

  socket.on('joinGame', (gameId) => {
    try {
      const game = gameManager.getGame(gameId);
      if (!game) return;

      socket.join(gameId);

      const userId = String(socket.userId);
      const pIdx = game.playerDetails.findIndex(p =>
        String(p.id ?? p._id) === userId
      );

      if (pIdx !== -1) {
        const oldSocketId = game.players[pIdx];

        game.players[pIdx] = socket.id;

        if (game.playerToMove === oldSocketId) {
          game.playerToMove = socket.id;
        }

        console.log(
          `[Game ${gameId}] Reconnected: ${oldSocketId} -> ${socket.id}`
        );

        gameManager.sendPlayerStakes(gameId, socket);
      }

      io.to(gameId).emit('updateGame', game);
    } catch (err) {
      console.error('[Game] Join error:', err);
    }
  });

  socket.on('makeMove', (data) => {
    try {
      gameManager.makeMove(socket, data);
    } catch (err) {
      console.error('[Game] Move error:', err);
    }
  });

  socket.on('resign', ({ gameId } = {}) => {
    try {
      const game = gameManager.getGame(gameId);
      if (!game) return;

      const pIdx = game.players.indexOf(socket.id);
      if (pIdx === -1) return;

      const winnerSymbol = pIdx === 0 ? 'O' : 'X';

      const winnerDetails = game.playerDetails.find(p =>
        String(p.id ?? p._id) !== String(socket.userId)
      );

      gameManager.endGame(gameId, {
        winner: winnerSymbol,
        reason: 'resignation'
      });

      if (winnerDetails) {
        Promise.resolve(
          tournamentManager.handleMatchEnd(gameId, winnerDetails)
        ).catch(err =>
          console.error('[Tournament] Match-end error:', err)
        );
      }
    } catch (err) {
      console.error('[Game] Resignation error:', err);
    }
  });

  socket.on('offerDraw', ({ gameId } = {}) => {
    gameManager.offerDraw(gameId, socket.id);
  });

  socket.on('acceptDraw', ({ gameId } = {}) => {
    gameManager.acceptDraw(gameId, socket.id);
  });

  socket.on('declineDraw', ({ gameId } = {}) => {
    gameManager.declineDraw(gameId);
  });

  socket.on('sendChatMessage', ({ gameId, message } = {}) => {
    try {
      if (typeof message !== 'string' || !message.trim()) return;
      if (message.length > 2000) return;

      const game = gameManager.getGame(gameId);
      if (!game) return;

      const userId = String(socket.userId);

      const player = game.playerDetails.find(p =>
        String(p.id ?? p._id) === userId
      );

      if (!player) return;

      game.chat.push({
        user: player.username,
        text: message.trim()
      });

      io.to(gameId).emit('updateGame', game);
    } catch (err) {
      console.error('[Game] Chat error:', err);
    }
  });

  // ─── TOURNAMENT EVENTS ────────────────────────────────────────────────────

  socket.on('joinTournamentQueue', (user) => {
    try {
      // Never trust a client-supplied user identity.
      tournamentManager.joinQueue(socket, {
        ...user,
        id: socket.userId
      });
    } catch (err) {
      console.error('[Tournament] Queue join error:', err);
    }
  });

  socket.on('leaveTournamentQueue', () => {
    tournamentManager.leaveQueue(socket);
  });

  socket.on('requestTournamentState', (tId) => {
    const tournament = tournamentManager.tournaments.get(tId);

    if (tournament) {
      socket.join(tId);
      socket.emit('tournamentState', tournament);
    }
  });

  socket.on('disconnect', (reason) => {
    try {
      gameManager.handleDisconnect(socket);
      tournamentManager.leaveQueue(socket);
    } catch (err) {
      console.error('[Socket] Disconnect cleanup error:', err);
    }

    console.log(
      `[Socket] Disconnected: user=${socket.userId}, socket=${socket.id}, reason=${reason}`
    );
  });
});

// ─── DATABASE AND SERVER STARTUP ──────────────────────────────────────────────

let shuttingDown = false;

async function startServer() {
  try {
    console.log('[Startup] Connecting to MongoDB...');

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000
    });

    console.log('[Startup] MongoDB connected successfully.');

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[Server] Listening on port ${PORT}`);
    });

    // Keep the optional engine service warm.
    if (process.env.SOX_ENGINE_URL) {
      const engineUrl = process.env.SOX_ENGINE_URL;

      const heartbeat = async () => {
        try {
          const response = await fetch(engineUrl);
          console.log(
            `[Engine] Keepalive response: HTTP ${response.status}`
          );
        } catch (err) {
          console.warn('[Engine] Keepalive failed:', err.message);
        }
      };

      const heartbeatTimer = setInterval(heartbeat, 10 * 60 * 1000);
      heartbeatTimer.unref();

      console.log('[Engine] Keepalive enabled for:', engineUrl);
    }
  } catch (err) {
    console.error('[Startup] Failed to start server:', err);
    process.exitCode = 1;
    await mongoose.disconnect().catch(() => {});
  }
}

// ─── CONNECTION MONITORING ───────────────────────────────────────────────────

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB] Connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.error('[MongoDB] Connection lost.');
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`[Shutdown] Received ${signal}; closing services...`);

  const forceExitTimer = setTimeout(() => {
    console.error('[Shutdown] Forced exit after timeout.');
    process.exit(1);
  }, 10000);

  forceExitTimer.unref();

  try {
    await new Promise(resolve => {
      if (!server.listening) return resolve();

      server.close(resolve);
      io.close();
    });

    await mongoose.disconnect();

    console.log('[Shutdown] Services closed.');
    process.exit(0);
  } catch (err) {
    console.error('[Shutdown] Error:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
