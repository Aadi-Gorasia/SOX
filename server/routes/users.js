
console.log('--- The users.js route file was successfully loaded! ---');

// server/routes/users.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Game = require('../models/Game');
const auth = require('../middleware/auth'); // Make sure the path to your middleware is correct
const CUSTOM_THEME_COLOR_KEYS = ['bg', 'panel', 'text', 'accent', 'secondary', 'line', 'x', 'o'];

function sanitizeCustomThemes(themes) {
  if (!Array.isArray(themes) || themes.length > 20) return null;
  const sanitized = [];
  for (const theme of themes) {
    if (!theme || typeof theme !== 'object' ||
        typeof theme.id !== 'string' || !/^custom-[a-zA-Z0-9-]{1,60}$/.test(theme.id) ||
        typeof theme.name !== 'string' || !theme.name.trim() || theme.name.length > 40 ||
        !theme.tokens || typeof theme.tokens !== 'object') return null;
    const tokens = {};
    for (const key of CUSTOM_THEME_COLOR_KEYS) {
      if (typeof theme.tokens[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(theme.tokens[key])) return null;
      tokens[key] = theme.tokens[key];
    }
    if (sanitized.some(item => item.id === theme.id)) return null;
    sanitized.push({
      id: theme.id,
      name: theme.name.trim(),
      philosophy: 'A personal variation.',
      description: 'A custom SOX theme.',
      colors: CUSTOM_THEME_COLOR_KEYS.map(key => tokens[key]),
      tokens: { ...tokens, card: tokens.panel, muted: tokens.text },
      heading: 'Arial, Helvetica, sans-serif',
      body: 'Arial, Helvetica, sans-serif',
      mono: '"Courier New", monospace',
      style: 'custom'
    });
  }
  return sanitized;
}

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
  } catch (err) {
  console.error("REGISTER ERROR:", err); // <--- Print the full error object
  res.status(500).send('Server error: ' + err.message); // <--- Send detail to frontend for now
}
});

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    let user = await User.findOne({ email });
    if (!user) { return res.status(400).json({ msg: 'Invalid Credentials' }); }
    if (!user.password) {
      return res.status(400).json({ msg: 'This account uses social sign-in. Please continue with its provider.' });
    }
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

router.put('/update-identity', auth, async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findById(req.user.id);
    
    if (username && username !== user.username) {
      const sixMonths = 180 * 24 * 60 * 60 * 1000;
      if (user.lastUsernameChange && (Date.now() - user.lastUsernameChange < sixMonths)) {
        return res.status(400).json({ msg: "Username can only be changed once every 6 months." });
      }
      user.username = username;
      user.lastUsernameChange = Date.now();
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    res.json({ msg: "Identity updated successfully" });
  } catch (err) { res.status(500).send('Server Error'); }
});

router.put('/preferences', auth, async (req, res) => {
  const { themePreference, preferences } = req.body && typeof req.body === 'object'
    ? req.body
    : {};
  const availableThemes = new Set([
    'international-typographic', 'bauhaus', 'japanese-editorial', 'neo-brutalist',
    'macintosh-classic', 'transit-system', 'mid-century', 'editorial-luxury',
    'technical-drafting', 'arcade-hardware', 'scandinavian', 'constructivism',
    'archival-academia', 'y2k-industrial', 'experimental-swiss'
  ]);
  if (typeof themePreference !== 'string' ||
      (!availableThemes.has(themePreference) && !/^custom-[a-zA-Z0-9-]{1,60}$/.test(themePreference)) ||
      !preferences || typeof preferences !== 'object' || Array.isArray(preferences)) {
    return res.status(400).json({ msg: 'Invalid theme or preferences.' });
  }

  const booleanPreferences = [
    'reducedMotion', 'backgroundAnimations', 'victoryAnimation',
    'highContrast', 'largerText'
  ];
  const enumPreferences = {
    landingPage: ['dashboard', 'play', 'history'],
    defaultGameMode: ['online', 'private'],
    density: ['comfortable', 'compact'],
    customThemes: []
  };
  const cleanPreferences = {};
  for (const key of booleanPreferences) {
    if (key in preferences && typeof preferences[key] !== 'boolean') {
      return res.status(400).json({ msg: `Invalid preference: ${key}.` });
    }
    if (key in preferences) cleanPreferences[key] = preferences[key];
  }
  for (const [key, values] of Object.entries(enumPreferences)) {
    if (key === 'customThemes') {
      if (key in preferences) {
        const sanitizedThemes = sanitizeCustomThemes(preferences[key]);
        if (!sanitizedThemes) return res.status(400).json({ msg: 'Invalid custom themes.' });
        cleanPreferences[key] = sanitizedThemes;
      }
      continue;
    }
    if (key in preferences && !values.includes(preferences[key])) {
      return res.status(400).json({ msg: `Invalid preference: ${key}.` });
    }
    if (key in preferences) cleanPreferences[key] = preferences[key];
  }
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ msg: 'User not found.' });
    const customThemes = cleanPreferences.customThemes || user.preferences?.customThemes || [];
    if (themePreference.startsWith('custom-') &&
        !customThemes.some(theme => theme.id === themePreference)) {
      return res.status(400).json({ msg: 'The selected custom theme is not saved to this account.' });
    }
    user.themePreference = themePreference;
    user.preferences = { ...(user.preferences || {}), ...cleanPreferences };
    await user.save();
    res.json({
      themePreference: user.themePreference,
      preferences: user.preferences
    });
  } catch (error) {
    console.error('[User Preferences Error]:', error.message);
    res.status(500).json({ msg: 'Unable to save preferences.' });
  }
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
