
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

const missingRequiredConfig = ['MONGO_URI', 'JWT_SECRET']
  .filter(key => !process.env[key]);
if (missingRequiredConfig.length) {
  console.error(`[Startup] Required configuration is missing: ${missingRequiredConfig.join(', ')}`);
  process.exit(1);
}

const allowedOrigins = [
  'http://localhost:3000',
  'https://soxc.vercel.app',
  ...(process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
    : [])
].filter(Boolean);

function allowOrigin(origin, callback) {
  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    /^https:\/\/sox-[a-z0-9-]+-aadis-projects-641df6d8\.vercel\.app$/.test(origin);

  if (isAllowed) return callback(null, true);

  console.error('[CORS] Rejected origin:', origin);
  return callback(new Error('Origin not allowed by CORS'));
}

app.use(cors({
  origin: allowOrigin,
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
    origin: allowOrigin,
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

  socket.on('findGame', (payload = {}) => {
    const timeControl = payload?.timeControl;
    const preferredSymbol = payload?.preferredSymbol;
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
      .catch(err => {
        console.error(
          `[Matchmaking] Error: user=${socket.userId}, socket=${socket.id}, timeControl=${timeControl}`,
          err
        );
        socket.emit('matchmakingError', {
          message: 'Unable to start matchmaking. Please try again.'
        });
      });
  });

  socket.on('cancelFindGame', () => {
    gameManager.cancelMatchmaking(socket);
    console.log(
      `[Matchmaking] Cancelled: user=${socket.userId}, socket=${socket.id}`
    );
  });

  socket.on('createFriendGame', (payload = {}, acknowledge) => {
    const timeControl = payload?.timeControl;
    const preferredSymbol = payload?.preferredSymbol;
    gameManager.createPrivateGame(socket, timeControl, preferredSymbol)
      .then(game => {
        if (typeof acknowledge === 'function') acknowledge({ gameId: game.id });
      })
      .catch(err => {
        console.error('[Game] Private game creation error:', err);
        if (typeof acknowledge === 'function') {
          acknowledge({ error: err.message || 'Unable to create a private game.' });
        }
      });
  });

  socket.on('joinGame', (gameId) => {
    gameManager.joinGame(socket, gameId)
      .then(game => {
        if (!game) {
          socket.emit('gameJoinError', {
            message: 'This game is unavailable or you are not a participant.'
          });
          return;
        }
        console.log(`[Game ${gameId}] Joined by user=${socket.userId}, socket=${socket.id}`);
      })
      .catch(err => {
        console.error('[Game] Join error:', err);
        socket.emit('gameJoinError', {
          message: 'Unable to join this game. Please try again.'
        });
      });
  });

  socket.on('requestGameState', (payload = {}) => {
    const gameId = payload?.gameId;
    const game = gameManager.getGame(gameId);
    if (!game) {
      socket.emit('gameJoinError', { message: 'Game not found.' });
      return;
    }

    const isPlayer = game.playerDetails.some(player =>
      player && String(player.id ?? player._id) === String(socket.userId)
    );
    if (!isPlayer) {
      if (game.waitingForOpponent) return;
      socket.emit('gameJoinError', {
        message: 'You are not a participant in this game.'
      });
      return;
    }

    socket.emit('updateGame', game);
  });

  socket.on('makeMove', (data) => {
    gameManager.makeMove(socket, data ?? {})
      .catch(err => console.error('[Game] Move error:', err));
  });

  socket.on('resign', (payload = {}) => {
    const gameId = payload?.gameId;
    try {
      const game = gameManager.getGame(gameId);
      if (!game) return;

      const pIdx = game.players.indexOf(socket.id);
      if (pIdx === -1) return;

      const winnerSymbol = pIdx === 0 ? 'O' : 'X';

      Promise.resolve(gameManager.endGame(gameId, {
        winner: winnerSymbol,
        reason: 'resignation'
      })).catch(err => console.error('[Game] Resignation error:', err));
    } catch (err) {
      console.error('[Game] Resignation error:', err);
    }
  });

  socket.on('offerDraw', (payload = {}) => {
    const gameId = payload?.gameId;
    gameManager.offerDraw(gameId, socket.userId);
  });

  socket.on('acceptDraw', (payload = {}) => {
    const gameId = payload?.gameId;
    gameManager.acceptDraw(gameId, socket.userId)
      .catch(err => console.error('[Game] Draw acceptance error:', err));
  });

  socket.on('declineDraw', (payload = {}) => {
    const gameId = payload?.gameId;
    gameManager.declineDraw(gameId, socket.userId);
  });

  socket.on('sendChatMessage', (payload = {}) => {
    try {
      const gameId = payload?.gameId;
      const message = payload?.message;
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

  socket.on('joinTournamentQueue', (user = {}) => {
    try {
      // Never trust a client-supplied user identity.
      tournamentManager.joinQueue(socket, {
        ...user,
        id: socket.userId
      });
    } catch (err) {
      console.error('[Tournament] Queue join error:', err);
      socket.emit('tournamentError', {
        message: err.message || 'Unable to join the tournament queue.'
      });
    }
  });

  socket.on('leaveTournamentQueue', () => {
    tournamentManager.leaveQueue(socket);
  });

  socket.on('requestTournamentState', (tId) => {
    const tournament = tournamentManager.getTournamentForUser(tId, socket.userId);

    if (tournament) {
      socket.join(tId);
      socket.emit('tournamentState', tournament);
    } else {
      socket.emit('tournamentError', {
        message: 'Tournament not found or you are not a participant.'
      });
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
