# Ultimate Tic-Tac-Toe engine

This folder contains the search and position evaluation used by game hints,
reviews, and puzzles. Positions use the service's flattened move format:
`macroBoard * 9 + cell`, with `X` moving first.

- `state.js` owns legal moves, forced-board routing, wins, draws, and reversible
  make/unmake operations.
- `evaluation.js` scores macro-board threats, unfinished sector potential, and
  the active forced board.
- `search.js` uses iterative-deepening negamax with alpha-beta pruning, a
  transposition table, and tactical move ordering.
- `index.js` exports the engine API consumed by `services/engineService.js`.

Search work is bounded by a node budget so HTTP requests remain responsive.
Higher ratings receive larger budgets; review annotations use a smaller budget
because a full game requires evaluating many positions. This is a dedicated
Ultimate Tic-Tac-Toe engine, not a port of Stockfish or a claim of equivalent
playing strength.
