'use strict';

const { uidFromReq } = require('./jwt');
const { haveValidTokens } = require('../storage/tokens');
const config = require('../config/env');

function requireAuth(req, res, next) {
  (async () => {
    let uid = uidFromReq(req);
    if (!uid && config.SINGLE_USER) uid = config.GLOBAL_UID;
    if (!uid || !(await haveValidTokens(uid))) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    req.uid = uid;
    next();
  })().catch(next);
}

module.exports = { requireAuth };
