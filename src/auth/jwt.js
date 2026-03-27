'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

function issueJwt(uid) {
  return jwt.sign(
    { uid, sub: uid },
    config.JWT_SECRET,
    { expiresIn: '30m', issuer: config.JWT_ISSUER, audience: config.JWT_AUDIENCE }
  );
}

function uidFromReq(req) {
  const h = req.headers['authorization'] || '';
  const bearer = h.startsWith('Bearer ') ? h.slice(7) : null;
  const tok = bearer || req.query.tok || null;
  if (tok) {
    try {
      const payload = jwt.verify(tok, config.JWT_SECRET, {
        audience: config.JWT_AUDIENCE,
        issuer: config.JWT_ISSUER,
        clockTolerance: 60,
      });
      return payload.uid;
    } catch {
      /* invalid token */
    }
  }
  return null;
}

module.exports = { issueJwt, uidFromReq };
