# SOX

SOX is a real-time Ultimate Tic-Tac-Toe arena. Play rated matches, challenge a
friend, join a tournament, train with rating-aware puzzles, and review completed
games move by move.

The project is a JavaScript monorepo: a React single-page application
communicates with an Express and Socket.IO API backed by MongoDB.

## Features

- **Live multiplayer:** time-control matchmaking, private friend games, move
  synchronization, clocks, chat, draw offers, and resignation.
- **Ratings and player profiles:** Elo updates, match history, leaderboards, and
  player statistics.
- **Tournaments:** four-player single-elimination brackets with live match
  updates.
- **Puzzles:** generated Ultimate Tic-Tac-Toe positions with difficulty based
  on the player's competitive rating, plus puzzles drawn from reviewed games.
- **Game review:** replay a completed game, navigate through its moves, see
  strategic move grades and suggested alternatives, and revisit key moments.
- **Authentication:** email/password accounts and optional Google or Facebook
  sign-in when provider credentials are configured.

> **Engine note:** Puzzle and review analysis use SOX's strategic
> Ultimate-Tic-Tac-Toe heuristics. They are intended as learning guidance, not
> as deep-search or tournament-grade engine evaluations.

## Tech stack

| Area | Technologies |
| --- | --- |
| Client | React 18, React Router, Socket.IO Client |
| API and realtime | Node.js, Express, Socket.IO |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens, bcrypt, optional OAuth |
| Game analysis | In-process Ultimate Tic-Tac-Toe engine and Elo services |

## Repository layout

```text
.
├── client/                 # React application
│   └── src/
│       ├── components/     # Shared UI and game components
│       ├── context/        # Authentication, socket, game, and theme state
│       ├── pages/          # App routes and page styles
│       └── utils/          # Client-side game helpers
├── server/                 # Express and Socket.IO service
│   ├── classes/            # Game and tournament managers
│   ├── middleware/         # Authentication middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # HTTP API routes
│   └── services/           # Elo, game persistence, and analysis
├── package.json            # Monorepo development and build scripts
└── README.md
```

## Requirements

- Node.js 18 or later
- npm
- A MongoDB database (local or hosted)

## Local development

Install dependencies in the root, client, and server packages:

```bash
npm install
npm install --prefix server
npm install --prefix client
```

Create `server/.env`:

```dotenv
MONGO_URI=mongodb://127.0.0.1:27017/sox
JWT_SECRET=replace-with-a-long-random-secret
PORT=5001
FRONTEND_URL=http://localhost:3000
OAUTH_REDIRECT_BASE_URL=http://localhost:5001
```

`MONGO_URI` and `JWT_SECRET` are required. The server exits at startup if either
is missing. Do not commit `.env` files or real credentials.

Create `client/.env`:

```dotenv
REACT_APP_API_URL=http://localhost:5001
REACT_APP_SOCKET_URL=http://localhost:5001
```

Restart the client after editing its environment file; Create React App reads
these values at build/start time.

Start both services from the repository root:

```bash
npm run dev
```

The client is available at [http://localhost:3000](http://localhost:3000) and
the API listens on port `5001` by default. You can also run each service
separately:

```bash
npm run server
npm run client
```

## Environment variables

### Server

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign and verify application tokens |
| `PORT` | No | HTTP and Socket.IO listening port; defaults to `5001` |
| `FRONTEND_URL` | No | Allowed frontend origin(s); separate multiple origins with commas |
| `OAUTH_REDIRECT_BASE_URL` | No | Public API origin used to construct OAuth callback URLs |
| `GOOGLE_CLIENT_ID` | No | Enables Google sign-in when paired with its secret |
| `GOOGLE_CLIENT_SECRET` | No | Enables Google sign-in when paired with its client ID |
| `FACEBOOK_APP_ID` | No | Enables Facebook sign-in when paired with its secret |
| `FACEBOOK_APP_SECRET` | No | Enables Facebook sign-in when paired with its app ID |
| `SOX_ENGINE_URL` | No | Optional URL pinged periodically to keep an external engine service warm |

OAuth callback URLs must also be registered with the corresponding identity
provider. The server's `FRONTEND_URL` and `OAUTH_REDIRECT_BASE_URL` must match
the deployed frontend and API origins.

### Client

| Variable | Required | Purpose |
| --- | --- | --- |
| `REACT_APP_API_URL` | Recommended | Base URL for the HTTP API |
| `REACT_APP_SOCKET_URL` | Yes for realtime play | Base URL for the Socket.IO service |

For local development, the client package also defines a development proxy to
`http://localhost:5001`. Set the API and socket URLs explicitly for deployments.

## Useful commands

Run commands from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start the client and server together |
| `npm run client` | Start the React development server |
| `npm run server` | Start the API server |
| `npm run build` | Create the optimized client build |
| `npm --prefix client test -- --watchAll=false` | Run the client test runner once |
| `node --test server/classes/GameManager.test.js server/classes/TournamentManager.test.js server/services/engineService.test.js` | Run focused server tests |

## API overview

The server mounts the game router at both `/api/games` and `/api/puzzles`.
Protected routes use the `x-auth-token` request header.

| Endpoint | Authentication | Purpose |
| --- | --- | --- |
| `GET /health` | No | Liveness status and database connection state |
| `GET /ready` | No | Readiness check; returns `503` until MongoDB is connected |
| `POST /api/users/register` | No | Create an account |
| `POST /api/users/login` | No | Sign in and receive a token |
| `GET /api/auth` | Yes | Get the authenticated user's profile |
| `GET /api/games/history?limit=20&offset=0` | Yes | Browse the caller's saved games |
| `GET /api/games/leaderboard` | No | Get the games leaderboard |
| `GET /api/games/:id` | Yes, game participant | Load a saved game |
| `GET /api/games/:id/review` | Yes, game participant | Generate or retrieve move analysis |
| `GET /api/games/:id/puzzles` | Yes, game participant | Extract puzzles from a game review |
| `GET /api/games/puzzle/infinite-generate` | Yes | Generate a rating-adapted puzzle |
| `POST /api/games/puzzle/infinite-submit` | Yes | Submit an answer and update puzzle rating |
| `POST /api/games/hint` | Yes | Get a move suggestion for a position |

## Realtime events

Authenticated Socket.IO clients use the same JWT token as the HTTP API. The
service supports these main client-to-server events:

- `findGame`, `cancelFindGame`
- `createFriendGame`, `joinGame`, `requestGameState`
- `makeMove`, `resign`, `offerDraw`, `acceptDraw`, `declineDraw`
- `sendChatMessage`
- `joinTournamentQueue`, `leaveTournamentQueue`, `requestTournamentState`

The server emits game state and lifecycle events such as `gameStarted`,
`updateGame`, `gameEnded`, and `matchmakingError`, along with tournament queue,
bracket, and error events.

## Deployment

Deploy the client and server as separate services:

1. Deploy the server with `server` as its working directory and `npm start` as
   its start command. Configure `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`.
2. Deploy the client with `client` as its working directory and
   `npm run build` as its build command. Configure
   `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` to point to the deployed API.
3. Add the deployed frontend origin to `FRONTEND_URL` and configure
   `OAUTH_REDIRECT_BASE_URL` plus any OAuth provider callback URLs if social
   sign-in is enabled.
4. Ensure the hosting provider supports persistent WebSocket connections for
   Socket.IO.

The server exposes `/health` and `/ready` endpoints for hosting-provider health
checks.

## Contributing

1. Create a focused branch for your change.
2. Keep frontend and server changes consistent when changing API or Socket.IO
   behavior.
3. Add or update tests for game rules, matchmaking, tournaments, and analysis
   changes.
4. Run the relevant tests and `npm run build` before opening a pull request.
