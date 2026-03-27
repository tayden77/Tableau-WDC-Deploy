'use strict';

const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const config = require('./config/env');
const requestId = require('./middleware/requestId');
const errorHandler = require('./middleware/errorHandler');
const { authLimiter, dataLimiter } = require('./middleware/rateLimiter');
const { redis } = require('./storage/redis');

const oauthRoutes = require('./auth/oauth');
const dataRoutes = require('./api/endpoints/data');
const queryRoutes = require('./api/endpoints/query');
const bulkActionsRoutes = require('./api/endpoints/bulkActions');

const app = express();
app.set('port', config.PORT);
app.set('trust proxy', 1);

// HTTPS redirect
if (config.FORCE_HTTPS) {
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    if (isLocal || req.secure) return next();
    res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}

// Request ID
app.use(requestId);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          'https://ajax.googleapis.com',
          'https://cdn.jsdelivr.net',
          'https://connectors.tableau.com',
          'https://cdnjs.cloudflare.com',
        ],
        styleSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        imgSrc: ["'self'", 'data:'],
        connectSrc: [
          "'self'",
          'https://oauth2.sky.blackbaud.com',
          'https://api.sky.blackbaud.com',
        ],
        frameAncestors: ["'self'", 'https://*.tableau.com'],
        baseUri: ["'none'"],
        objectSrc: ["'none'"],
        formAction: ["'self'", 'https://oauth2.sky.blackbaud.com'],
      },
    },
    frameguard: false, // CSP frame-ancestors handles this
    hsts:
      config.NODE_ENV === 'production'
        ? { maxAge: 15552000, includeSubDomains: true, preload: true }
        : false,
    referrerPolicy: { policy: 'no-referrer' },
  })
);

// Static files
app.use(
  express.static(path.join(__dirname, '..', 'public'), {
    maxAge: config.NODE_ENV === 'production' ? '5m' : 0,
    etag: true,
  })
);

// CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      if (config.PUBLIC_BASE_URL && origin === config.PUBLIC_BASE_URL) return cb(null, true);
      if (config.CORS_ORIGINS.includes(origin)) return cb(null, true);
      if (config.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) return cb(null, true);
      return cb(new Error('CORS blocked'), false);
    },
    credentials: false,
  })
);

app.disable('x-powered-by');

// Rate limiting
app.use(['/auth', config.REDIRECT_PATH, '/getBlackbaudData'], authLimiter);
app.use(['/bulk/query/init', '/bulk/query/chunk', '/bulk/actions', '/bulk/actions/chunk'], dataLimiter);

// Health + readiness
app.get('/', (_, res) => res.redirect('/wdc.html'));

app.get('/healthz', async (_req, res) => {
  try {
    await redis.ping();
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

app.get('/readyz', async (_req, res) => {
  try {
    await redis.ping();
    if (!config.CLIENT_ID || !config.CLIENT_SECRET || !config.SUBSCRIPTION_KEY) {
      return res.status(503).json({ ok: false, reason: 'missing env' });
    }
    res.json({ ok: true });
  } catch {
    res.status(503).json({ ok: false, reason: 'redis' });
  }
});

// Routes
app.use(oauthRoutes);
app.use(dataRoutes);
app.use(queryRoutes);
app.use(bulkActionsRoutes);

// Error handler (must be last)
app.use(errorHandler);

module.exports = app;
