# SOX readiness — 27 November 2026

Status: playable beta. Local checks are not a production capacity guarantee.

## Verified and repaired

- Server clocks charge elapsed time before accepting moves and applying increment. Moves after flag fall are rejected. Private lobby waiting does not consume the starting clock.
- Private matches are saved without modifying ranked Elo or ranked win/loss statistics. Historical private matches were not retroactively changed.
- Reconnecting replaces the player's old socket and preserves the current in-memory position. The browser rejoins automatically, disables unavailable squares, and displays connection state.
- Finished live games expose the saved database ID for review. Failed saves are reported instead of presenting a broken review link.
- Missing games and matchmaking failures have recoverable UI states. Private links survive email registration/sign-in and social sign-in redirects.
- Private lobbies render an empty player slot safely. Puzzle routing hints now respond to mouse and keyboard focus.
- Chat history retained in a live game is capped at 200 messages.
- GitHub Actions runs backend tests, client tests, and a production build for pushes and pull requests.

Backend production dependency audit after compatible upgrades and replacing UUID with Node’s built-in generator: zero reported vulnerabilities. This is not a security audit of the application.

## Evidence

- 100 simultaneous in-memory games completed with isolated state. Every move's live rules were compared against the engine rules. This is a simulation with fake persistence, not a 200-user network load test.
- Real local Socket.IO clients survived a forced transport interruption, rejoined, and continued legal play.
- Browser checks covered reconnection, unavailable cells, saved review navigation, missing games, and seven laptop/tablet viewport sizes; computer flows also covered two phone sizes.
- Reproducible self-play: `node server/engine/botBenchmark.js 2`. Daniel won 4/4 against Bob and 4/4 against Emma, with paired colours and seeded six-move openings. All 306 searched moves were legal. Mean search time was 549ms and 644ms respectively on the test machine, with a maximum of 1542ms. This small sample does not validate the displayed Elo estimates or prove optimal play.

## Still required before claiming production readiness

1. Durable live multiplayer state: games, queues and tournament brackets currently live in process memory. Restarting or replacing the backend can interrupt unfinished matches. Multiple backend instances do not yet share match state.
2. Atomic result persistence: ranked statistics and game records are separate database writes. An outage can leave a partial result; idempotent transactional settlement is needed before promising financial-grade consistency or automatic retries.
3. Production-like load and soak testing with an isolated database, real sockets, and measured CPU/memory/latency. Local simulations do not establish hosted capacity.
4. Human playtesting and rating calibration. Bot difficulty numbers remain estimates, and review grades reflect bounded engine search rather than mathematically optimal play in every position.
5. Real provider callback testing for Google/Facebook, mobile Safari coverage, and manual accessibility review. No real accounts or production matches were created by automated tests.
6. Review the remaining frontend audit findings, including legacy build/test tooling and the React Router 6 advisory. Compatible upgrades removed the critical findings; remaining major-version migrations need a separate regression pass. Return destinations are restricted to local paths without backslashes, and this app does not use router SSR hydration.

## Repeat checks

Use `npm ci --prefix server` and `npm ci --prefix client` to install the locked versions before testing; do not rely on copied dependency folders.

- `npm test --prefix server`
- `npm test --prefix client -- --watchAll=false --runInBand`
- `npm run build --prefix client`
- `npm audit --prefix server --omit=dev`
- `npm audit --prefix client --omit=dev`
