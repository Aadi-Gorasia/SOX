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
  getBestMove
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
    const userRating = user.puzzleRating || 1200;

    let targetDifficulty = 'easy';
    let engineSearchDepthElo = 1000; 

    if (userRating >= 1800) {
      targetDifficulty = 'hard';
      engineSearchDepthElo = 3000;
    } else if (userRating >= 1400) {
      targetDifficulty = 'medium';
      engineSearchDepthElo = 2000;
    }

    const positionSequence = [];
    const macroBlocksPlayed = Array(9).fill(0);
    let currentFocusMacro = 9; 

    const randomPlayoutDepth = 8 + Math.floor(Math.random() * 8); 
    
    for (let step = 0; step < randomPlayoutDepth; step++) {
      let validMovesInMacro = [];
      
      if (currentFocusMacro === 9 || macroBlocksPlayed[currentFocusMacro] >= 9) {
        for (let baseIdx = 0; baseIdx < 81; baseIdx++) {
          if (!positionSequence.includes(baseIdx)) validMovesInMacro.push(baseIdx);
        }
      } else {
        const structuralBase = currentFocusMacro * 9;
        for (let cell = 0; cell < 9; cell++) {
          const targetCellIdx = structuralBase + cell;
          if (!positionSequence.includes(targetCellIdx)) validMovesInMacro.push(targetCellIdx);
        }
      }

      if (validMovesInMacro.length === 0) break;

      const pickedMove = validMovesInMacro[Math.floor(Math.random() * validMovesInMacro.length)];
      positionSequence.push(pickedMove);
      macroBlocksPlayed[Math.floor(pickedMove / 9)]++;
      currentFocusMacro = pickedMove % 9;
    }

    const evaluation = await getBestMove(positionSequence, engineSearchDepthElo);

    if (evaluation.bestMove < 0) {
      return res.redirect('/api/games/puzzle/infinite-generate');
    }

    res.json({
      difficulty: targetDifficulty,
      userCurrentRating: userRating,
      puzzle: {
        moveNumber: positionSequence.length,
        position:   positionSequence,
        solution:   evaluation.bestMove,
        score:      evaluation.score
      }
    });

  } catch (err) {
    console.error('[Adaptive Puzzle Generation Pipeline Error]:', err.message);
    res.status(500).json({ msg: 'Generation engine failed to yield positional states.' });
  }
});

// ─── PROGRESSIVE ADAPTIVE TRAINING: SUBMIT RESPONSE ───
router.post('/puzzle/infinite-submit', authMiddleware, async (req, res) => {
  const { answer, correctSolution } = req.body;
  if (typeof answer !== 'number' || typeof correctSolution !== 'number') {
    return res.status(400).json({ msg: 'Missing numerical verification coordinates' });
  }

  try {
    const isCorrect = answer === correctSolution;
    const user = await User.findById(req.user.id);
    
    const K_FACTOR = 25; 
    const ratingDelta = isCorrect ? K_FACTOR : -K_FACTOR;
    
    user.puzzleRating = Math.max(100, (user.puzzleRating || 1200) + ratingDelta);
    await user.save();

    res.json({
      correct: isCorrect,
      newRating: user.puzzleRating,
      delta: ratingDelta
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
router.post('/:id([0-9a-fA-F]{24})/puzzles', authMiddleware, async (req, res) => {
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
});

module.exports = router;