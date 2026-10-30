const crypto = require('crypto');
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const User = require('../models/User');

const PROVIDERS = {
  google: {
    clientId: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scopes: 'openid email profile'
  },
  facebook: {
    clientId: 'FACEBOOK_APP_ID',
    clientSecret: 'FACEBOOK_APP_SECRET',
    authorizeUrl: 'https://www.facebook.com/v20.0/dialog/oauth',
    tokenUrl: 'https://graph.facebook.com/v20.0/oauth/access_token',
    scopes: 'email public_profile'
  }
};

function clientUrl() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
}

function callbackUrl(req, provider) {
  const publicBase = (process.env.OAUTH_REDIRECT_BASE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
  return `${publicBase}/api/auth/${provider}/callback`;
}

function configured(provider) {
  const definition = PROVIDERS[provider];
  if (!definition) return false;
  return Boolean(process.env[definition.clientId] && process.env[definition.clientSecret]);
}

function redirectWithError(res, message) {
  res.redirect(`${clientUrl()}/login?oauth_error=${encodeURIComponent(message)}`);
}

function signedState(provider) {
  return jwt.sign({ provider }, process.env.JWT_SECRET, { expiresIn: '10m' });
}

function verifyState(state, provider) {
  const payload = jwt.verify(state, process.env.JWT_SECRET);
  if (payload.provider !== provider) throw new Error('Invalid sign-in state');
}

async function requestJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error_description || data.error?.message || 'Provider request failed');
  return data;
}

function usernameSeed(name, email, provider) {
  const raw = (name || email.split('@')[0] || provider).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 18);
  return raw || provider;
}

async function uniqueUsername(name, email, provider) {
  const seed = usernameSeed(name, email, provider);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = attempt ? `${Math.floor(1000 + Math.random() * 9000)}` : '';
    const username = `${seed}${suffix}`.slice(0, 24);
    // eslint-disable-next-line no-await-in-loop
    if (!await User.exists({ username })) return username;
  }
  return `${provider}${crypto.randomBytes(5).toString('hex')}`;
}

async function findOrCreateOAuthUser({ provider, providerId, email, name }) {
  if (!providerId || !email) throw new Error('Your provider did not supply a verified email address.');
  const normalizedEmail = email.toLowerCase();
  let user = await User.findOne({ oauthProviders: { $elemMatch: { provider, providerId } } });
  if (user) return user;

  user = await User.findOne({ email: normalizedEmail });
  if (user) {
    user.oauthProviders.push({ provider, providerId });
    await user.save();
    return user;
  }

  user = new User({
    username: await uniqueUsername(name, normalizedEmail, provider),
    email: normalizedEmail,
    oauthProviders: [{ provider, providerId }]
  });
  await user.save();
  return user;
}

function completeLogin(res, user) {
  const token = jwt.sign({ user: { id: user.id } }, process.env.JWT_SECRET, { expiresIn: '100h' });
  // A URL fragment is never sent to the frontend server or as a referrer.
  res.redirect(`${clientUrl()}/auth/callback#token=${encodeURIComponent(token)}`);
}

router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/:provider', (req, res) => {
  const { provider } = req.params;
  const definition = PROVIDERS[provider];
  if (!definition) return redirectWithError(res, 'Unsupported social provider');
  if (!configured(provider)) return redirectWithError(res, `${provider} sign-in is not configured yet`);

  const params = new URLSearchParams({
    client_id: process.env[definition.clientId],
    redirect_uri: callbackUrl(req, provider),
    response_type: 'code',
    scope: definition.scopes,
    state: signedState(provider)
  });
  res.redirect(`${definition.authorizeUrl}?${params}`);
});

async function oauthCallback(req, res) {
  const { provider } = req.params;
  const { code, state, error } = req.query;
  try {
    if (!PROVIDERS[provider]) throw new Error('Unsupported social provider');
    if (error) throw new Error(error);
    verifyState(state, provider);
    if (!code) throw new Error('No authorization code was returned');

    const body = new URLSearchParams({
      client_id: process.env[PROVIDERS[provider].clientId],
      code,
      redirect_uri: callbackUrl(req, provider),
      grant_type: 'authorization_code'
    });
    body.set('client_secret', process.env[PROVIDERS[provider].clientSecret]);
    const tokens = await requestJson(PROVIDERS[provider].tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });

    let identity;
    if (provider === 'google') {
      const data = await requestJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      if (!data.email_verified) throw new Error('Google did not provide a verified email address');
      identity = { providerId: data.sub, email: data.email, name: data.name };
    } else if (provider === 'facebook') {
      const data = await requestJson(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokens.access_token)}`);
      identity = { providerId: data.id, email: data.email, name: data.name };
    }

    completeLogin(res, await findOrCreateOAuthUser({ provider, ...identity }));
  } catch (err) {
    console.error(`[OAuth:${provider}]`, err.message);
    redirectWithError(res, err.message || 'Social sign-in failed');
  }
}

router.get('/:provider/callback', oauthCallback);

module.exports = router;
