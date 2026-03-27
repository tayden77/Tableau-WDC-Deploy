'use strict';

const crypto = require('crypto');

const b64url = (b) =>
  b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256 = (s) => crypto.createHash('sha256').update(s).digest();

module.exports = { b64url, sha256 };
