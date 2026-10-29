// routes/puzzles.js
import express from "express";
import Game    from "../models/Game.js";
import { getBestMove } from "../services/engineService.js";

const router = express.Router();

// ── POST /api/puzzles/generate
// Scan a game for puzzle moments (positions where engine disagrees with played move).
// Body: { gameId }
router.post("/generate", async (req, res) => {
  try {
    const game = await Game.findById(req.body.gameId);
    if (!game) return res.status(404).json({ error: "Game not found" });

    const moves   = game.moves.map(m => m.idx);
    const puzzles = [];

    for (let i = 1; i < moves.length - 1; i++) {
      const history    = moves.slice(0, i);
      const { bestMove } = await getBestMove(history, 3500);
      const actualMove = moves[i];

      // Puzzle = engine strongly disagrees with what was played
      if (bestMove !== actualMove && bestMove >= 0) {
        puzzles.push({
          gameId:     game._id,
          moveNumber: i,
          position:   history,       // moves to replay to reach this state
          solution:   bestMove,      // correct move
          played:     actualMove,    // what was actually played
        });
      }
    }

    res.json({ puzzles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/puzzles/check
// Check if a user's puzzle answer is correct.
// Body: { position: [moves...], answer: 40 }
router.post("/check", async (req, res) => {
  try {
    const { position, answer } = req.body;
    const { bestMove } = await getBestMove(position, 3500);
    res.json({
      correct: answer === bestMove,
      bestMove,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;