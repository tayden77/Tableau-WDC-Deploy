'use strict';

const config = require('../config/env');

// Structured logger — lightweight wrapper around console with levels + JSON output in production
const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || (config.NODE_ENV === 'production' ? 'info' : 'debug')];

function formatMsg(level, msg, meta) {
  if (config.NODE_ENV === 'production') {
    return JSON.stringify({ level, msg, ...meta, ts: new Date().toISOString() });
  }
  const prefix = `[${new Date().toISOString()}] [${level.toUpperCase()}]`;
  const metaStr = meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
  return `${prefix} ${msg}${metaStr}`;
}

function log(level, msg, meta = {}) {
  if (LOG_LEVELS[level] < currentLevel) return;
  const formatted = formatMsg(level, msg, meta);
  if (level === 'error') console.error(formatted);
  else if (level === 'warn') console.warn(formatted);
  else console.log(formatted);
}

// Create a child logger with default meta (e.g., requestId)
function child(defaultMeta) {
  return {
    debug: (msg, meta) => log('debug', msg, { ...defaultMeta, ...meta }),
    info: (msg, meta) => log('info', msg, { ...defaultMeta, ...meta }),
    warn: (msg, meta) => log('warn', msg, { ...defaultMeta, ...meta }),
    error: (msg, meta) => log('error', msg, { ...defaultMeta, ...meta }),
  };
}

module.exports = {
  debug: (msg, meta) => log('debug', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  error: (msg, meta) => log('error', msg, meta),
  child,
};
