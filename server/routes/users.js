
console.log('--- The users.js route file was successfully loaded! ---');

// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');

// --- REGISTER ROUTE ---
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) { return res.status(400).json({ msg: 'User with that email already exists' }); }
    user = await User.findOne({ username });
    if (user) { return res.status(400).json({ msg: 'Username is already taken' }); }
    
    user = new User({ username, email, password });
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    await user.save();

    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
        if (err) throw err;
        res.status(201).json({ token });
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server error'); }
});

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) { return res.status(400).json({ msg: 'Invalid Credentials' }); }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) { return res.status(400).json({ msg: 'Invalid Credentials' }); }
    const payload = { user: { id: user.id } };
    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 360000 }, (err, token) => {
        if (err) throw err;
        res.json({ token });
    });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- PROFILE ROUTE ---
router.get('/profile/:username', async (req, res) => {
  try {
    const usernameRegex = new RegExp(`^${req.params.username}$`, 'i');
    const user = await User.findOne({ username: usernameRegex }).select('-password -email');
    if (!user) { return res.status(404).json({ msg: 'User not found' }); }
    const games = await Game.find({ players: user._id }).sort({ endDate: -1 }).limit(50).populate('players', 'username').populate('winner', 'username');
    res.json({ user, games });
  } catch (err) { console.error(err.message); res.status(500).send('Server Error'); }
});

// --- LEADERBOARD ROUTE ---
router.get('/leaderboard', async (req, res) => {
    try {
        const topUsers = await User.find()
            .sort({ elo: -1 })
            .limit(10)
            .select('username elo');
        res.json(topUsers);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;