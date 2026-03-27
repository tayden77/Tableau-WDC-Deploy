'use strict';

const Redis = require('ioredis');
const config = require('../config/env');
const log = require('../util/logger');

const redis = new Redis(config.REDIS_URL);

redis.on('connect', () => log.info('Redis connected'));
redis.on('error', (err) => log.error('Redis error', { error: err.message }));

async function ensureConnected() {
  try {
    await redis.ping();
  } catch (err) {
    throw new Error(`Redis not reachable: ${err.message}`);
  }
}

async function disconnect() {
  await redis.quit();
}

module.exports = { redis, ensureConnected, disconnect };
