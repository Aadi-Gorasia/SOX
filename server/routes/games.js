// server/routes/games.js
const express = require('express');
const router  = express.Router();
const authMiddleware = require('../middleware/auth');
const Game = require('../models/Game');
const User = require('../models/User');
const {
  annotateGame,
  buildReviewSummary,
  generatePuzzlesFromAnnotations,
  checkPuzzleAnswer,
  getBestMove,
  generateAdaptivePuzzle
} = require('../services/engineService');

// =============================================================================
// ─── 1. STATIC PATH COMPONENT ENDPOINTS (EXPLICIT MATCHES) ───────────────────
// =============================================================================

// ─── GAME MATCH HISTORY METADATA ───
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find({ players: req.user.id })
      .sort({ endDate: -1 })
      .limit(20)
      .populate('players', 'username')
      .populate('winner', 'username');
    res.json(games);
  } catch (err) {
    console.error('[History Route Error]:', err.message);
    res.status(500).send('Server Error');
  }
});

// ─── COMPETITIVE MATCHMAKING LEADERBOARD ───
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ elo: -1 })
      .limit(10)
      .select('username elo');
    res.json(users);
  } catch (err) {
    console.error('[Leaderboard Route Error]:', err.message);
    res.status(500).send('Server Error');
  }
});

// ─── PROGRESSIVE ADAPTIVE TRAINING: INFINITE GENERATE ───
router.get('/puzzle/infinite-generate', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    // Match training difficulty to the player's live competitive Elo.
    const userRating = user.elo || 1200;
    const puzzle = await generateAdaptivePuzzle(userRating);

    res.json({
      difficulty: puzzle.difficulty,
      userCurrentRating: userRating,
      puzzle
    });

  } catch (err) {
    console.error('[Adaptive Puzzle Generation Pipeline Error]:', err.message);
    res.status(500).json({ msg: 'Generation engine failed to yield positional states.' });
  }
});

// ─── PROGRESSIVE ADAPTIVE TRAINING: SUBMIT RESPONSE ───
router.post('/puzzle/infinite-submit', authMiddleware, async (req, res) => {
  const { answer, position } = req.body;
  if (typeof answer !== 'number' || !Array.isArray(position)) {
    return res.status(400).json({ msg: 'A position and numerical answer are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const result = await checkPuzzleAnswer(position, answer, user.elo || 1200);
    const isCorrect = result.correct;
    const K_FACTOR = 20;
    const ratingDelta = isCorrect ? K_FACTOR : -K_FACTOR;
    
    user.puzzleRating = Math.max(100, (user.puzzleRating || 1200) + ratingDelta);
    await user.save();

    res.json({
      correct: isCorrect,
      newRating: user.puzzleRating,
      delta: ratingDelta,
      bestMove: result.bestMove
    });
  } catch (err) {
    console.error('[Puzzle Submission Pipeline Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── BASELINE MATCH PUZZLE VERIFY ENDPOINT ───
router.post('/puzzle/check', authMiddleware, async (req, res) => {
  try {
    const { position, answer } = req.body;
    if (!Array.isArray(position) || typeof answer !== 'number') {
      return res.status(400).json({ msg: 'Array configuration mismatch error' });
    }
    const result = await checkPuzzleAnswer(position, answer);
    res.json(result);
  } catch (err) {
    console.error('[Manual Check Endpoint Trap Failure]:', err.message);
    res.status(500).json({ msg: 'Evaluation network handshake error', error: err.message });
  }
});

// ─── MATCH ENGINE IN-GAME LIVE HELPER EXTRACTOR ───
router.post('/hint', authMiddleware, async (req, res) => {
  try {
    const { moves = [], elo = 1500 } = req.body;
    const result = await getBestMove(moves, elo);
    res.json(result);
  } catch (err) {
    console.error('[Live Match Optimization Extraction Mistake]:', err.message);
    res.status(500).json({ msg: 'Handshake pipeline extraction failure', error: err.message });
  }
});

// =============================================================================
// ─── 2. DYNAMIC PARAMETER ROUTES (REGEX GUARDED AGAINST AMBIGUITY) ──────────
// =============================================================================

// ─── GET SINGLE MATCH RECORD FROM MOUNT PROFILE ───
router.get('/:id([0-9a-fA-F]{24})', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('players', 'username elo')
      .populate('winner',  'username');

    if (!game) return res.status(404).json({ msg: 'Game compilation profile missing' });

    const isPlayer = game.players.some(p => p._id.toString() === req.user.id);
    if (!isPlayer) return res.status(403).json({ msg: 'Access Denied: Player mismatch error' });

    res.json(game);
  } catch (err) {
    console.error('[Game Fetch Error]:', err.message);
    res.status(500).send('Server Error');
  }
});

// ─── POST-GAME ENGINE GRAPH ANALYSIS REVIEW ───
router.get('/:id([0-9a-fA-F]{24})/review', authMiddleware, async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ msg: 'Game profile entry not found' });

    const isPlayer = game.players.some(p => p.toString() === req.user.id);
    if (!isPlayer) return res.status(403).json({ msg: 'Access Denied: Player mismatch error' });

    if (game.reviewedAt && game.annotations.length > 0) {
      return res.json({
        annotations:   game.annotations,
        reviewSummary: game.reviewSummary,
        cached:        true,
      });
    }

    if (!game.moves || game.moves.length === 0) {
      return res.status(400).json({ msg: 'Zero move indices reported' });
    }

    console.log(`[Engine Review Loop Execution] Compiling analysis for game profile ID: ${game._id}`);
    const annotations   = await annotateGame(game.moves, 3500);
    const reviewSummary = buildReviewSummary(annotations);

    game.annotations   = annotations;
    game.reviewSummary = reviewSummary;
    game.reviewedAt    = new Date();
    await game.save();

    res.json({ annotations, reviewSummary, cached: false });
  } catch (err) {
    console.error('[Review Engine Error Block]:', err.message);
    res.status(500).json({ msg: 'Engine review compilation timeout', error: err.message });
  }
});

// ─── REVIEW PUZZLES GENERATION ───
async function reviewPuzzles(req, res) {
  try {
    const game = await Game.findById(req.params.id);
    if (!game) return res.status(404).json({ msg: 'Target Game Entry Absent' });

    if (!game.reviewedAt || game.annotations.length === 0) {
      return res.status(400).json({ msg: 'Please call the baseline review pipeline endpoint first.' });
    }

    const puzzles = generatePuzzlesFromAnnotations(game.moves, game.annotations);
    res.json({ puzzles, count: puzzles.length });
  } catch (err) {
    console.error('[Review Analysis Extraction Failure]:', err.message);
    res.status(500).send('Server Error');
  }
}

router.get('/:id([0-9a-fA-F]{24})/puzzles', authMiddleware, reviewPuzzles);
router.post('/:id([0-9a-fA-F]{24})/puzzles', authMiddleware, reviewPuzzles);

module.exports = router;
