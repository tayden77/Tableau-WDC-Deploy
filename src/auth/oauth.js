'use strict';

const crypto = require('crypto');
const { Router } = require('express');
const { v4: uuidv4 } = require('uuid');

const config = require('../config/env');
const { b64url, sha256 } = require('../util/crypto');
const { redis } = require('../storage/redis');
const { setTokens } = require('../storage/tokens');
const { httpRequestWithRetry } = require('../api/skyClient');
const { issueJwt } = require('./jwt');
const { uidFromReq } = require('./jwt');
const { haveValidTokens } = require('../storage/tokens');
const log = require('../util/logger');

const router = Router();

// Start OAuth2 PKCE flow
router.get('/auth', async (req, res, next) => {
  try {
    const sid = req.query.sid || uuidv4();
    const codeVerifier = b64url(crypto.randomBytes(32));
    const codeChallenge = b64url(sha256(codeVerifier));

    await redis.hset(`oauth:${sid}`, {
      code_verifier: codeVerifier,
      created_at: Date.now().toString(),
    });
    await redis.expire(`oauth:${sid}`, 900);

    log.info('OAuth start', { sid });

    const scopes = 'rnxt.r identity_basic offline_access';
    const oauthUrl =
      'https://oauth2.sky.blackbaud.com/authorization' +
      `?response_type=code&client_id=${encodeURIComponent(config.CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(config.REDIRECT_URI)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&state=${encodeURIComponent(sid)}` +
      `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

    res.redirect(oauthUrl);
  } catch (err) {
    next(err);
  }
});

// OAuth redirect handler
router.get(config.REDIRECT_PATH, async (req, res, next) => {
  try {
    const state = req.query.state;
    const code = req.query.code;

    if (!state || !code) {
      return res.status(400).send('Missing code/state');
    }

    const pending = await redis.hgetall(`oauth:${state}`);
    if (!pending || !pending.code_verifier) {
      return res
        .status(400)
        .send('<h1>Sign-in expired</h1><p>Please go back and click "Connect to Blackbaud" again.</p>');
    }

    const resp = await httpRequestWithRetry({
      method: 'POST',
      url: 'https://oauth2.sky.blackbaud.com/token',
      form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: config.REDIRECT_URI,
        client_id: config.CLIENT_ID,
        code_verifier: pending.code_verifier,
        client_secret: config.CLIENT_SECRET,
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    await redis.del(`oauth:${state}`);

    if (resp.statusCode !== 200) {
      log.error('Token exchange failed', { status: resp.statusCode });
      return res.status(502).send('OAuth exchange failed');
    }

    const tok = JSON.parse(resp.body.toString('utf8'));
    const uid = config.SINGLE_USER ? config.GLOBAL_UID : state;

    await setTokens(uid, {
      access: tok.access_token,
      refresh: tok.refresh_token,
      exp: Date.now() + tok.expires_in * 1000,
    });

    await redis.set(`jwt_bootstrap:${state}`, '1', 'EX', 180);

    log.info('OAuth success', { state, uid, expiresIn: tok.expires_in });
    res.redirect(`/wdc.html?sid=${encodeURIComponent(state)}`);
  } catch (err) {
    next(err);
  }
});

// Auth status
router.get('/status', async (req, res, next) => {
  try {
    const uid = uidFromReq(req);
    if (uid && (await haveValidTokens(uid))) {
      return res.json({ authenticated: true, tok: issueJwt(uid) });
    }

    const sid = req.query.sid;
    if (sid && (await redis.get(`jwt_bootstrap:${sid}`))) {
      const handoffUid = config.SINGLE_USER ? config.GLOBAL_UID : sid;
      if (await haveValidTokens(handoffUid)) {
        return res.json({ authenticated: true, tok: issueJwt(handoffUid) });
      }
    }

    if (config.SINGLE_USER && (await haveValidTokens(config.GLOBAL_UID))) {
      return res.json({ authenticated: true, tok: issueJwt(config.GLOBAL_UID) });
    }

    return res.json({ authenticated: false });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
