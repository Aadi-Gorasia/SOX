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
    const competitiveRating = user.elo || 1200;
    const puzzle = await generateAdaptivePuzzle(competitiveRating);

    res.json({
      difficulty: puzzle.difficulty,
      competitiveRating,
      userCurrentRating: user.puzzleRating || 1200,
      puzzle
    });

  } catch (err) {
    console.error('[Adaptive Puzzle Generation Pipeline Error]:', err.message);
    res.status(500).json({ msg: 'Generation engine failed to yield positional states.' });
  }
});

// ─── PROGRESSIVE ADAPTIVE TRAINING: SUBMIT RESPONSE ───
router.post('/puzzle/infinite-submit', authMiddleware, async (req, res) => {
  const { answer, position } = req.body && typeof req.body === 'object'
    ? req.body
    : {};
  if (!Number.isInteger(answer) || answer < 0 || answer > 80 ||
      !Array.isArray(position) || position.length > 80 ||
      position.some(move => !Number.isInteger(move) || move < 0 || move > 80)) {
    return res.status(400).json({ msg: 'A position and numerical answer are required' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const competitiveRating = user.elo || 1200;
    const result = await checkPuzzleAnswer(position, answer, competitiveRating);
    const isCorrect = result.correct;
    const oldRating = user.puzzleRating || 1200;
    const expectedScore = 1 / (1 + Math.pow(10, (competitiveRating - oldRating) / 400));
    const proposedDelta = Math.round(24 * ((isCorrect ? 1 : 0) - expectedScore));
    user.puzzleRating = Math.max(100, oldRating + proposedDelta);
    const ratingDelta = user.puzzleRating - oldRating;
    await user.save();

    res.json({
      correct: isCorrect,
      newRating: user.puzzleRating,
      delta: ratingDelta,
      bestMove: result.bestMove,
      theme: result.theme
    });
  } catch (err) {
    console.error('[Puzzle Submission Pipeline Error]:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── BASELINE MATCH PUZZLE VERIFY ENDPOINT ───
router.post('/puzzle/check', authMiddleware, async (req, res) => {
  try {
    const { position, answer } = req.body && typeof req.body === 'object'
      ? req.body
      : {};
    if (!Array.isArray(position) || position.length > 80 ||
        position.some(move => !Number.isInteger(move) || move < 0 || move > 80) ||
        !Number.isInteger(answer) || answer < 0 || answer > 80) {
      return res.status(400).json({ msg: 'A valid position and move are required' });
    }
    const result = await checkPuzzleAnswer(position, answer, 3500);
    res.json(result);
  } catch (err) {
    console.error('[Manual Check Endpoint Trap Failure]:', err.message);
    res.status(500).json({ msg: 'Evaluation network handshake error', error: err.message });
  }
});

// ─── MATCH ENGINE IN-GAME LIVE HELPER EXTRACTOR ───
router.post('/hint', authMiddleware, async (req, res) => {
  try {
    const { moves = [] } = req.body && typeof req.body === 'object'
      ? req.body
      : {};
    if (!Array.isArray(moves) || moves.length > 80 ||
        moves.some(move => !Number.isInteger(move) || move < 0 || move > 80)) {
      return res.status(400).json({ msg: 'A valid move sequence is required' });
    }

    const user = await User.findById(req.user.id).select('elo');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    const result = await getBestMove(moves, user.elo || 1200);
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

    const hasCompleteAnnotations = game.annotations.length === game.moves.length &&
      game.annotations.length > 0 &&
      game.annotations.every(annotation =>
        Array.isArray(annotation.positionStateBefore) &&
        typeof annotation.quality === 'string' &&
        typeof annotation.explanation === 'string' &&
        typeof annotation.recommendation === 'string'
      );
    if (game.reviewedAt && hasCompleteAnnotations) {
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

    const isPlayer = game.players.some(player =>
      player.toString() === req.user.id
    );
    if (!isPlayer) return res.status(403).json({ msg: 'Access denied' });

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
