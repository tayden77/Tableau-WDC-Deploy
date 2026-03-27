'use strict';

require('dotenv').config();

function requireEnv(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var: ${name}`);
  return val;
}

const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, '');

const config = Object.freeze({
  PORT: Number(process.env.PORT || 3333),
  HOST: process.env.HOST || 'localhost',
  REDIRECT_PATH: process.env.REDIRECT_PATH || '/redirect',
  HTTP_TIMEOUT_MS: parseInt(process.env.HTTP_TIMEOUT_MS || '30000', 10),
  HTTP_MAX_WAIT_MS: parseInt(process.env.HTTP_MAX_WAIT_MS || '120000', 10),
  TMP_FILE_TTL_MS: parseInt(process.env.TMP_FILE_TTL_MS || '', 10) || 30 * 60 * 1000,

  PUBLIC_BASE_URL,
  REDIRECT_URI:
    process.env.REDIRECT_URI ||
    (PUBLIC_BASE_URL
      ? `${PUBLIC_BASE_URL}${process.env.REDIRECT_PATH || '/redirect'}`
      : `http://${process.env.HOST || 'localhost'}:${process.env.PORT || 3333}${process.env.REDIRECT_PATH || '/redirect'}`),

  CLIENT_ID: requireEnv('CLIENT_ID'),
  CLIENT_SECRET: requireEnv('CLIENT_SECRET'),
  SUBSCRIPTION_KEY: requireEnv('SUBSCRIPTION_KEY'),

  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_ISSUER: process.env.JWT_ISSUER || PUBLIC_BASE_URL || 'http://localhost:3333',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'bb-wdc',

  SINGLE_USER: process.env.SINGLE_USER === 'true',
  GLOBAL_UID: 'single-user',

  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',

  FORCE_HTTPS: process.env.FORCE_HTTPS === 'true',
  NODE_ENV: process.env.NODE_ENV || 'development',

  CORS_ORIGINS: (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean),
});

// Validate JWT_SECRET strength in production
if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

module.exports = config;
