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
  },
  apple: {
    clientId: 'APPLE_CLIENT_ID',
    authorizeUrl: 'https://appleid.apple.com/auth/authorize',
    tokenUrl: 'https://appleid.apple.com/auth/token',
    scopes: 'name email'
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
  if (provider === 'apple') {
    return Boolean(process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY);
  }
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

function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid identity token');
  return {
    header: JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8')),
    payload: JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')),
    signature: Buffer.from(parts[2], 'base64url'),
    signingInput: Buffer.from(`${parts[0]}.${parts[1]}`)
  };
}

async function verifyAppleIdentityToken(identityToken) {
  const decoded = decodeJwt(identityToken);
  const keys = await requestJson('https://appleid.apple.com/auth/keys');
  const jwk = keys.keys.find(key => key.kid === decoded.header.kid);
  if (!jwk || decoded.header.alg !== 'RS256') throw new Error('Unable to verify Apple identity token');
  const verifier = crypto.createVerify('RSA-SHA256');
  verifier.update(decoded.signingInput);
  verifier.end();
  if (!verifier.verify(crypto.createPublicKey({ key: jwk, format: 'jwk' }), decoded.signature)) {
    throw new Error('Invalid Apple identity token');
  }
  const now = Math.floor(Date.now() / 1000);
  if (decoded.payload.iss !== 'https://appleid.apple.com' || decoded.payload.aud !== process.env.APPLE_CLIENT_ID || decoded.payload.exp <= now) {
    throw new Error('Expired or invalid Apple identity token');
  }
  return decoded.payload;
}

function appleClientSecret() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: process.env.APPLE_KEY_ID })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ iss: process.env.APPLE_TEAM_ID, iat: now, exp: now + 60 * 60 * 24 * 180, aud: 'https://appleid.apple.com', sub: process.env.APPLE_CLIENT_ID })).toString('base64url');
  const signer = crypto.createSign('SHA256');
  signer.update(`${header}.${payload}`);
  signer.end();
  const privateKey = process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, '\n');
  return `${header}.${payload}.${signer.sign(privateKey).toString('base64url')}`;
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
  if (provider === 'apple') params.set('response_mode', 'form_post');
  res.redirect(`${definition.authorizeUrl}?${params}`);
});

async function oauthCallback(req, res) {
  const { provider } = req.params;
  const { code, state, error, user: appleUser } = { ...req.query, ...req.body };
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
    if (provider === 'apple') body.set('client_secret', appleClientSecret());
    else body.set('client_secret', process.env[PROVIDERS[provider].clientSecret]);
    const tokens = await requestJson(PROVIDERS[provider].tokenUrl, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });

    let identity;
    if (provider === 'google') {
      const data = await requestJson('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
      if (!data.email_verified) throw new Error('Google did not provide a verified email address');
      identity = { providerId: data.sub, email: data.email, name: data.name };
    } else if (provider === 'facebook') {
      const data = await requestJson(`https://graph.facebook.com/me?fields=id,name,email&access_token=${encodeURIComponent(tokens.access_token)}`);
      identity = { providerId: data.id, email: data.email, name: data.name };
    } else {
      const claims = await verifyAppleIdentityToken(tokens.id_token);
      const firstTimeName = appleUser ? JSON.parse(appleUser) : {};
      identity = { providerId: claims.sub, email: claims.email, name: [firstTimeName.name?.firstName, firstTimeName.name?.lastName].filter(Boolean).join(' ') };
    }

    completeLogin(res, await findOrCreateOAuthUser({ provider, ...identity }));
  } catch (err) {
    console.error(`[OAuth:${provider}]`, err.message);
    redirectWithError(res, err.message || 'Social sign-in failed');
  }
}

router.get('/:provider/callback', oauthCallback);
router.post('/:provider/callback', oauthCallback);

module.exports = router;
