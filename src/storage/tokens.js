'use strict';

const { redis } = require('./redis');
const sleep = require('../util/sleep');

async function setTokens(uid, tok) {
  await redis.hset(`session:${uid}`, {
    access: tok.access,
    refresh: tok.refresh,
    exp: String(tok.exp),
  });
  const ttlSeconds = Math.max(60, Math.ceil((tok.exp - Date.now()) / 1000) + 900);
  await redis.expire(`session:${uid}`, ttlSeconds);
}

async function getTokens(uid) {
  const data = await redis.hgetall(`session:${uid}`);
  if (!data || !data.access) return null;
  return { access: data.access, refresh: data.refresh, exp: Number(data.exp) };
}

async function haveValidTokens(uid) {
  const t = await getTokens(uid);
  return !!(t && t.exp > Date.now());
}

async function withRefreshLock(uid, fn) {
  const lockKey = `session:${uid}:refresh_lock`;
  const gotLock = await redis.set(lockKey, '1', 'NX', 'PX', 30000);
  if (gotLock) {
    try {
      return await fn();
    } finally {
      await redis.del(lockKey);
    }
  }
  // Wait for another refresh to complete
  const start = Date.now();
  while (Date.now() - start < 10000) {
    await sleep(300);
    const t = await getTokens(uid);
    if (t && t.exp > Date.now() + 60_000) return t.access;
  }
  return await fn();
}

module.exports = { setTokens, getTokens, haveValidTokens, withRefreshLock };
