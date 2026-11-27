# SOX

**Nine boards. One game.**

[Play SOX](https://soxc.vercel.app) · [Engine documentation](server/engine/README.md) · [Readiness report](docs/READINESS.md) · [Automated checks](https://github.com/Aadi-Gorasia/SOX/actions/workflows/checks.yml)

SOX is a real-time Ultimate Tic-Tac-Toe arena. Play rated matches, challenge a
friend, join a tournament, train with rating-aware puzzles, and review completed
games move by move.

The project is a JavaScript monorepo: a React single-page application
communicates with an Express and Socket.IO API backed by MongoDB.

## Project status

SOX is a **playable beta**, not a fully production-ready or mathematically solved
Ultimate Tic-Tac-Toe platform. Computer games and completed match records are
stored in MongoDB. Active multiplayer games, matchmaking queues, and tournament
brackets are held in server memory: a backend restart can interrupt them.

See the [readiness report](docs/READINESS.md) for verified results, test scope,
and remaining release work. Bot Elo values are difficulty estimates; move grades
and coaching reflect the engine's bounded search, not guaranteed optimal play.

## How to play

1. X starts. Play in one of the nine small tic-tac-toe boards.
2. The square you choose sends your opponent to the corresponding small board.
   For example, the top-right square sends them to the top-right board.
3. Three marks in a row claim a small board. If your move sends the opponent to
   a won or drawn board, they may choose any unfinished board.
4. Claim three small boards in a row, column, or diagonal to win the match.

## Features

- **Live multiplayer:** time-control matchmaking, private friend games, move
  synchronization, server-authoritative clocks, chat, draw offers, and resignation.
  The client automatically rejoins after a connection drop and pauses move input
  until it receives fresh state. Private games are unrated.
- **Ratings and player profiles:** ranked Elo updates, match history, leaderboards,
  and player statistics. Finished multiplayer games link to their saved reviews.
- **Tournaments:** four-player single-elimination brackets with live match
  updates.
- **Puzzles:** generated Ultimate Tic-Tac-Toe positions with difficulty based
  on the player's competitive rating, plus puzzles drawn from reviewed games.
- **Play computer:** six opponents, a custom 400–2600 difficulty slider, side selection, and saved, unrated games. Bot ratings are approximate.
- **Game review:** responsive replay with a searched advantage bar, move grades, suggested lines, and personalised engine coaching linked to actual moves.
- **Appearance:** six visual presets, eight independent board palettes, four mark styles, background textures, and light/dark/system interfaces. Settings apply to every board and sync to the account; failed saves remain on-device with a retry option.
- **Authentication:** email/password accounts and optional Google or Facebook
  sign-in when provider credentials are configured. Invite destinations survive
  sign-in and registration. Email registration does not send a verification email.
- **Site policies:** dedicated terms and cookie-policy pages.

> **Engine:** SOX uses a dedicated iterative-deepening, principal-variation
> search with tactical extensions and routing-aware evaluation. CPU work runs
> in bounded worker threads. Hints return a searched continuation; reviews
> distinguish estimated play from a proven terminal outcome. This is not
> Stockfish-level strength or a fully solved game. See [engine notes](server/engine/README.md).

### Computer opponents

| Opponent | Displayed difficulty |
| --- | --- |
| Bob | 500 |
| Sam | 900 |
| Emma | 1300 |
| Alex | 1700 |
| Maya | 2100 |
| Daniel | 2600 |

Choose X, O, or a random side. The custom slider covers 400–2600. Games are
untimed and unrated; starting computer play resumes an unfinished game if one
already exists. Stronger settings increase search budgets and reduce deliberate
mistakes. These numbers are not calibrated against human competitive Elo.

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
├── .github/workflows/      # Server tests, client tests, and build checks
├── docs/                   # Readiness evidence and remaining limitations
├── client/                 # React application
│   └── src/
│       ├── components/     # Shared UI and game components
│       ├── context/        # Authentication, socket, game, and theme state
│       ├── pages/          # App routes and page styles
│       └── utils/          # Client-side game helpers
├── server/                 # Express and Socket.IO service
│   ├── classes/            # Game and tournament managers
│   ├── engine/             # Rules, search, workers, benchmarks, and engine tests
│   ├── middleware/         # Authentication middleware
│   ├── models/             # Mongoose models
│   ├── routes/             # HTTP API routes
│   └── services/           # Elo, game persistence, and analysis
├── package.json            # Monorepo development and build scripts
└── README.md
```

## Requirements

- Node.js 22 (the version used in CI)
- npm
- A MongoDB database (local or hosted)

## Local development

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/Aadi-Gorasia/SOX.git
cd SOX
```

Run the following from the repository root. Use clean installs rather than relying
on dependency folders copied with a checkout:

```bash
npm ci
npm ci --prefix server
npm ci --prefix client
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

Create `client/.env.local` (ignored by Git):

```dotenv
REACT_APP_API_URL=http://localhost:5001
REACT_APP_SOCKET_URL=http://localhost:5001
```

Restart the client after editing its environment file; Create React App reads
these values at build/start time. Every `REACT_APP_*` value is public in the
browser bundle; never put database credentials, JWT secrets, or OAuth client
secrets there.

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
| `RENDER_GIT_COMMIT` | No | Hosting-provided revision exposed by `/health`; do not set manually for local development |
| `SOX_ENGINE_URL` | No | Optional URL pinged periodically to keep an external engine service warm |

OAuth callback URLs must also be registered with the corresponding identity
provider. The server's `FRONTEND_URL` and `OAUTH_REDIRECT_BASE_URL` must match
the deployed frontend and API origins. When `FRONTEND_URL` contains multiple
origins, its first entry is the OAuth return destination.

Register these callback URLs using your public **API** origin:

```text
https://your-api.example/api/auth/google/callback
https://your-api.example/api/auth/facebook/callback
```

The built-in engine runs locally in worker threads. `SOX_ENGINE_URL` only enables
an optional keepalive request; it does not replace or configure that search engine.

### Client

| Variable | Required | Purpose |
| --- | --- | --- |
| `REACT_APP_API_URL` | Yes for documented setup | Base URL for the HTTP API |
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
| `npm test --prefix server` | Run all backend tests, including rules, search, routes, clocks, and real socket recovery |
| `npm test --prefix client -- --watchAll=false --runInBand` | Run client tests once |
| `node server/engine/botBenchmark.js 2` | Run seeded, paired-colour bot matches; may take several minutes |
| `npm audit --prefix server --omit=dev` | Check backend production dependencies |
| `npm audit --prefix client --omit=dev` | Check frontend dependencies, including tooling listed as dependencies |

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Introduction, interactive rules demonstration, and leaderboard |
| `/login`, `/register` | Account access |
| `/dashboard` | Ranked quick play, recent games, and player summary |
| `/play` | Configure online or private games |
| `/game/:gameId` | Live multiplayer match |
| `/play/computer` | Select a computer opponent |
| `/play/computer/:gameId` | Play or resume a saved computer game |
| `/review/:gameId` | Review a saved game |
| `/games/history` | Saved match history |
| `/puzzles`, `/puzzles/:gameId` | Generated training or review-based puzzles |
| `/tournament`, `/tournament/:tournamentId` | Tournament queue and bracket |
| `/profile/:username` | Player profile |
| `/settings` | Appearance and account preferences |
| `/terms`, `/cookie-policy` | Site policies |

Gameplay, profile, history, and settings pages require sign-in. A live match ID
and its saved database record ID are different: use the saved ID returned when
the match ends for review, rather than constructing a review URL from a live ID.

## API overview

The server mounts the game router at both `/api/games` and `/api/puzzles`.
Protected routes use the `x-auth-token` request header.

| Endpoint | Authentication | Purpose |
| --- | --- | --- |
| `GET /health` | No | Liveness, engine version, database state, and deployment revision when available |
| `GET /ready` | No | Readiness check; returns `503` until MongoDB is connected |
| `POST /api/users/register` | No | Create an account |
| `POST /api/users/login` | No | Sign in and receive a token |
| `GET /api/auth` | Yes | Get the authenticated user's profile |
| `PUT /api/users/preferences` | Yes | Save validated appearance and gameplay preferences |
| `PUT /api/users/update-identity` | Yes | Update username or password |
| `GET /api/bots/catalog` | Yes | List opponents and difficulty limits |
| `POST /api/bots` | Yes | Create or resume the caller's unfinished computer game |
| `GET /api/bots/:id` | Yes, game owner | Load a computer game |
| `POST /api/bots/:id/move` | Yes, game owner | Submit a move and expected ply count; receive the computer reply |
| `POST /api/bots/:id/resign` | Yes, game owner | Resign a computer game |
| `GET /api/games/history?limit=20&offset=0` | Yes | Browse the caller's saved games |
| `GET /api/games/leaderboard` | No | Get the games leaderboard |
| `GET /api/games/:id` | Yes, game participant | Load a saved game |
| `GET /api/games/:id/review` | Yes, game participant | Generate or retrieve move analysis |
| `GET /api/games/:id/puzzles` | Yes, game participant | Extract puzzles from a game review |
| `GET /api/games/puzzle/infinite-generate` | Yes | Generate a rating-adapted puzzle |
| `POST /api/games/puzzle/infinite-submit` | Yes | Submit an answer and update puzzle rating |
| `POST /api/games/hint` | Yes | Get a move suggestion for a position |

## Realtime events

Authenticated Socket.IO clients pass the same JWT in the connection handshake
as `auth: { token }` rather than an HTTP `x-auth-token` header. The
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

1. Deploy the server with `server` as its working directory, `npm ci --omit=dev`
   as its install command, and `npm start` as its start command. Configure `MONGO_URI`, `JWT_SECRET`, and `FRONTEND_URL`.
2. Deploy the client with `client` as its working directory, `npm ci` as its
   install command, `npm run build` as its build command, and `build` as its
   output directory. Configure SPA fallback to `index.html` for application routes. Configure
   `REACT_APP_API_URL` and `REACT_APP_SOCKET_URL` to point to the deployed API.
3. Add the deployed frontend origin to `FRONTEND_URL` and configure
   `OAUTH_REDIRECT_BASE_URL` plus any OAuth provider callback URLs if social
   sign-in is enabled.
4. Ensure the backend supports persistent WebSocket connections for Socket.IO.
   Run a single backend instance until shared durable match state is implemented.
5. Check `/ready`, open the frontend, and test sign-in, a computer game, a private
   match with a second account, and game review. Test provider callbacks separately
   if enabling social sign-in.

The server exposes `/health` and `/ready` endpoints for hosting-provider health
checks. `/health` can report a live process while MongoDB is disconnected; use
`/ready` to check database readiness. Client environment changes require rebuilding
and redeploying the frontend.

Current hosting uses Vercel for the frontend and Render for the backend. A normal
player network reconnect can recover a live game while the same backend process
continues running. A backend restart or deployment is different and can lose
unfinished multiplayer games; plan deployments accordingly.

## Verification and release limits

[SOX checks](.github/workflows/checks.yml) runs backend tests, client tests, and
a production build on every push and pull request, using clean installs and
Node.js 22. These checks do not automatically gate the hosting providers' deploys.

The 27 November 2026 readiness pass included 48 backend tests, a simulation of
100 simultaneous games compared against engine rules, real Socket.IO recovery,
and browser checks for reconnecting, invite return paths, reviews, themes, and
laptop/tablet/phone layouts. Daniel won eight seeded paired games against Bob and
Emma. These are bounded local results, not production capacity or human Elo claims.

Before a production-ready claim, the project still needs:

- Durable multiplayer state that survives backend restarts and supports multiple instances.
- Idempotent, transactional settlement of ratings and saved game records.
- Production-like load/soak testing and human playtesting.
- Bot-rating calibration, real OAuth-provider testing, mobile Safari coverage,
  and a manual accessibility review.
- Resolution of remaining frontend dependency advisories through evaluated
  tooling/router upgrades. Do not blindly apply `npm audit fix --force`.

See [READINESS.md](docs/READINESS.md) for the full evidence and limitations.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API exits during startup | Set `MONGO_URI` and `JWT_SECRET`; confirm MongoDB access and credentials. |
| Frontend cannot reach the API | Set both client URLs, restart/rebuild the client, and allow its exact origin in `FRONTEND_URL`. |
| Game says reconnecting | Check backend availability and WebSocket/proxy support. Moves stay paused until fresh state arrives. |
| A live game disappears after deployment | Live state is currently in memory; backend restart recovery is not implemented. |
| Computer or review is temporarily busy | Analysis uses a bounded worker queue. Retry; computer games retain their saved position. |
| Social sign-in fails | Verify provider credentials and registered API callback URLs. The first frontend origin is the return destination. |
| Theme sync fails | The local choice remains on the device; use the retry control once the API is available. |
| A deep link returns a hosting 404 | Configure the frontend host to serve `index.html` for application routes. |

## Contributing

1. Create a focused branch for your change.
2. Keep frontend and server changes consistent when changing API or Socket.IO
   behavior.
3. Add or update tests for game rules, matchmaking, tournaments, and analysis
   changes.
4. Run the relevant tests and `npm run build` before opening a pull request.
