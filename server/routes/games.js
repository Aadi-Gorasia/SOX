// server/routes/games.js
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const Game = require('../models/Game');
router.get('/history', authMiddleware, async (req, res) => {
  try {
    const games = await Game.find({ players: req.user.id })
      .sort({ endDate: -1 }).limit(20)
      .populate('players', 'username').populate('winner', 'username');
    res.json(games);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});
module.exports = router;