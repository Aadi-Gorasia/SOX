// server/routes/games.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Game = require('../models/Game');
const User = require('../models/User'); // 🔥 ADD THIS

// --- GAME HISTORY ---
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find({ players: req.user.id })
      .sort({ endDate: -1 })
      .limit(20)
      .populate('players', 'username')
      .populate('winner', 'username');

    res.json(games);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// --- 🔥 ADD LEADERBOARD ROUTE ---
router.get('/leaderboard', async (req, res) => {
  try {
    const users = await User.find()
      .sort({ elo: -1 })          // highest ELO first
      .limit(10)
      .select('username elo');

    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;