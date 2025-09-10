// -------------------------------------------------- //
// Module Dependencies & Variables
// -------------------------------------------------- //
require('dotenv').config();

const cookieParser = require('cookie-parser');
const http = require('http');
const request = require('request');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const app = express();
const { promisify } = require('util');
const { parse: parseCsv } = require('csv-parse/sync'); // Requires: npm i csv-parse
const { v4: uuidv4 } = require('uuid'); // Requires: npm i uuid
const { stringify } = require('csv-stringify'); // Requires: npm i csv-stringify
const Redis = require('ioredis'); // Requires: npm i ioredis
const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379'); // Connect to Redis
const helmet = require('helmet'); // Requires: npm i helmet
const rateLimit = require('express-rate-limit'); // Requires: npm i express-rate-limit
// ---- Rate limiters ----
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  max: 60,                        // 60 requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false
});
const dataLimiter = rateLimit({
  windowMs: 60 * 1000,            // 1 minute
  max: 120,                       // 120 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false
});

const SINGLE_USER = process.env.SINGLE_USER === 'true';
const GLOBAL_UID = 'single-user';

const requestPromise = promisify(request);

// ---- Centralised runtime-config object ----
const config = {
  PORT: process.env.PORT || 3333,
  HOSTPATH: process.env.HOSTPATH || 'http://localhost',
  REDIRECT_PATH: process.env.REDIRECT_PATH || '/redirect'
};

// ---- Secrets (read once and never re-declare) ----
const clientID = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const subscriptionKey = process.env.SUBSCRIPTION_KEY;
const redirectURI = process.env.REDIRECT_URI || `${config.HOSTPATH}:${config.PORT}${config.REDIRECT_PATH}`;

// -------------------------
// Express App
// -------------------------
app.set('port', config.PORT);
app.set('trust proxy', 1); // trust the reverse proxy (e.g. Heroku) FOR FUTURE
if (process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    const host = req.headers.host || '';
    const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1');
    if (isLocal || req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
    res.redirect(301, `https://${host}${req.originalUrl}`);
  });
}


app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
});

app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://ajax.googleapis.com", "https://cdn.jsdelivr.net", "https://connectors.tableau.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'", "https://oauth2.sky.blackbaud.com", "https://api.sky.blackbaud.com"],
      frameAncestors: ["'self'", "https://*.tableau.com"],
      baseUri: ["'none'"],
      objectSrc: ["'none'"],
      formAction: ["'self'", "https://oauth2.sky.blackbaud.com"]
    }
  },
  frameguard: { action: 'sameorigin' },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 15552000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'no-referrer' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site'}
}));


app.use(cookieParser());
app.use(express.static(path.join(__dirname + '/public'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
  etag: true,
  immutable: true
}));
const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
// Example: CORS_ORIGIN="http://localhost:8080,http://localhost:3333"
app.use(cors({
  origin: allowed.length ? allowed : [/^http:\/\/localhost:\d+$/],
  credentials: false
}));
redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (err) => console.error('[redis] error', err));
app.disable('x-powered-by'); // Disable X-Powered-By header

const crypto = require('crypto');
const b64url = b => b.toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const sha256 = s => crypto.createHash('sha256').update(s).digest();

// -------------------------------------------------- //
// Helper Functions
// -------------------------------------------------- //
// Truncate console logging (Testing)
function logTruncated(msg, maxLength = 1000) {
  if (msg.length > maxLength) {
    console.log(msg.substring(0, maxLength) + "… [truncated]");
  } else {
    console.log(msg);
  }
}

// Sleep (ms) (Used while polling for a completed query job)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// HTTP Request with Retry Logic
async function httpRequestWithRetry(opts, {
  maxRetries = 5,
  baseDelayMs = 500
} = {}) {
  let attempt = 0;
  while (true) {
    const resp = await requestPromise(opts);

    // Success
    if (resp.statusCode < 400) return resp;

    // retry?
    const retryable = resp.statusCode === 429 || resp.statusCode >= 500;
    if (!retryable || attempt >= maxRetries) return resp;

    const retryAfter = Number(resp.headers?.['retry-after'] || 0);
    const backoff = retryAfter > 0
      ? retryAfter * 1000
      : baseDelayMs * Math.pow(2, attempt); // exponential backoff

    await sleep(backoff);
    attempt += 1;
  }
}

// Extract the header row from the CSV results
function csvHeader(csvText) {
  const { parse } = require('csv-parse/sync');
  return parse(csvText, { to_line: 1 })[0];
}

// Convert a string to a boolean, with an optional fallback
function toBool(v, fallback = false) {
  if (v === undefined) return fallback;
  return String(v).toLowerCase() === 'true';
}

// Safely log URLs, redacting continuation tokens
function safeLogUrl(u) {
  try {
    const url = new URL(u);
    if (url.searchParams.has('continuation_token')) {
      url.searchParams.set('continuation_token', 'REDACTED');
    }
    return url.toString();
  } catch { return u; }
}

// Store the access and refresh tokens in Redis cache
async function setTokens(uid, tok) {
  // store access, refresh, and expiration in the cache (ms since epoch)
  await redis.hset(`session:${uid}`, {
    access: tok.access,
    refresh: tok.refresh,
    exp:     String(tok.exp)
  });
  // optional: store TTL to a bit beyond access-token expiry
  const ttlSeconds = Math.max(60, Math.ceil((tok.exp - Date.now()) / 1000) + 900);
  await redis.expire(`session:${uid}`, ttlSeconds);
}

// Retrieve the tokens for a user ID
async function getTokens(uid) {
  const data = await redis.hgetall(`session:${uid}`);
  if (!data || !data.access) return null;
  return { access: data.access, refresh: data.refresh, exp: Number(data.exp) };
}

// Check if the user has valid tokens
async function haveValidTokens(uid) {
  const t = await getTokens(uid);
  return !!(t && t.exp > Date.now());
}

async function withRefreshLock(uid, fn) {
  const lockKey = `session:${uid}:refresh_lock`;
  const gotLock = await redis.set(lockKey, '1', 'NX', 'PX', 30000); // 30s
  if (gotLock) {
    try { return await fn(); }
    finally { await redis.del(lockKey); }
  } else {
    // someone else is refreshing; wait for a bit until expiry or updates land
    const start = Date.now();
    while (Date.now() - start < 10000) { // wait up to 10s
      await sleep(300);
      const t = await getTokens(uid);
      if (t && t.exp > Date.now() + 60_000) return t.access; // looks refreshed
    }
    // last resort: run fn
    return await fn();
  }
}


const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
if (!process.env.JWT_SECRET || JWT_SECRET === 'dev-only-change-me') {
  throw new Error('JWT_SECRET required (set a strong value in env)');
}

// Issue a JWT token for the user ID
function issueJwt(uid) {
  return jwt.sign({ uid, aud: 'bb-wdc', iss: 'your-app' }, JWT_SECRET, { expiresIn: '30m' });
}

// Extract the user ID from the request, if present
function uidFromReq(req) {
  // prefer Bearer token, fallback to ?tok or ?uid
  const h = req.headers['authorization'] || '';
  const bearer = h.startsWith('Bearer ') ? h.slice(7) : null;
  const tok = bearer || req.query.tok || null;
  if (tok) {
    try { return jwt.verify(tok, JWT_SECRET).uid; } catch {
      /* invalid */
    }
  }
  return null;
}

// Ensure the tokens remain valid on long calls after they expire
async function ensureValidToken(uid) {
  const tok = await getTokens(uid);
  if (!tok) throw new Error('Not authenticated');

  // Refresh 60s early
  if (Date.now() >= tok.exp - 60_000) {
    return await withRefreshLock(uid, async () => {
      // re-check after acquiring lock
      const curr = await getTokens(uid);
      if (curr && curr.exp > Date.now() + 60_000) return curr.access;
  
      const resp = await httpRequestWithRetry({
        method: 'POST',
        url: 'https://oauth2.sky.blackbaud.com/token',
        form: {
          grant_type: 'refresh_token',
          refresh_token: tok.refresh,
          client_id: clientID,
          client_secret: clientSecret
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
  
      if (resp.statusCode !== 200) {
        throw new Error(`Failed to refresh token: ${resp.statusCode} ⇒ ${resp.body}`);
      }
      const body = JSON.parse(resp.body);
      await setTokens(uid, {
        access:  body.access_token,
        refresh: body.refresh_token || tok.refresh,
        exp:     Date.now() + body.expires_in * 1000
      });
      return body.access_token;
    });
  }
  
  return tok.access;
}

// Fetch a single API record 
async function fetchSingleRecord(uid, url) {
  // 3️⃣ Ensure we have a fresh access token
  const access = await ensureValidToken(uid);

  const resp = await httpRequestWithRetry({
    method: 'GET',
    url: url,
    headers: {
      'Authorization': `Bearer ${access}`,
      'Bb-Api-Subscription-Key': subscriptionKey
    }
  });

  if (resp.statusCode !== 200) {
    throw new Error(`Status: ${resp.statusCode} ⇒ ${resp.body}`);
  }

  return JSON.parse(resp.body);
}

// Fetch multiple API records
async function fetchMultipleRecords(uid, url, allItems = [], pageCount = 0, maxPages) {
  // stop if we've hit user’s page cap
  if (Number.isFinite(maxPages) && pageCount >= maxPages) {
    return allItems;
  }

  // 3️⃣ Always refresh before each page
  const access = await ensureValidToken(uid);

  const resp = await httpRequestWithRetry({
    method: 'GET',
    url: url,
    headers: {
      'Authorization': `Bearer ${access}`,
      'Bb-Api-Subscription-Key': subscriptionKey
    }
  });

  if (resp.statusCode !== 200) {
    throw new Error(`Status: ${resp.statusCode} ⇒ ${resp.body}`);
  }

  const data = JSON.parse(resp.body);
  if (pageCount === 0) console.log('first page rows', data.value.length);
  if (Array.isArray(data.value) && data.value.length) {
    allItems.push(...data.value);
  }

  // log continuation token if present
  if (data.next_link) {
    const cont = new URL(data.next_link).searchParams.get('continuation_token');
    if (cont) console.log(`→ page ${pageCount + 1} continuation_token: ${cont}`);
  }
  console.log(`fetched page ${pageCount + 1}`);
  // recurse if we got rows and next_link differs
  if (data.next_link && data.next_link !== url && data.value.length) {
    return fetchMultipleRecords(uid, data.next_link, allItems, pageCount + 1, maxPages);
  }

  return allItems;
}

// -------------------TEST LOGGING-------------------- //
// console.log("Client ID: " + clientID);
// console.log("Client Secret: " + clientSecret);
// console.log("Redirect URI: " + redirectURI);
// console.log("Subscription Key: " + subscriptionKey);

//****  removed while testing multi-user session based token storage ****/
// let storedAccessToken = null;
// let storedRefreshToken = null;
// let tokenExpiry = 0;


// -------------------------------------------------- //
//  ROUTES
// -------------------------------------------------- //

// Base Path
app.get('/', (_, res) => res.redirect('/wdc.html'));

// Health Check Path
app.get('/healthz', async (req, res) => {
  try {
    await redis.ping();
    res.json({ ok: true });  
  } catch {
    res.status(500).json({ ok: false });
  }
});

// BlackBaud Authentication Path
// app.get('/auth', function (req, res) {
//   var oauthUrl = "https://oauth2.sky.blackbaud.com/authorization" +
//     "?response_type=code" +
//     "&client_id=" + encodeURIComponent(clientID) +
//     "&redirect_uri=" + encodeURIComponent(redirectURI) +
//     "&scope=" + encodeURIComponent("rnxt.w rnxt.r identity_basic offline_access");
//   console.log("Redirecting to OAuth URL: " + oauthUrl);
//   res.redirect(oauthUrl);
// });

// New Authentication Path
app.use(['/auth', config.REDIRECT_PATH, '/getBlackbaudData'], authLimiter); // Rate limit auth and data retrieval paths
app.use(
  ['/bulk/query/init','/bulk/query/chunk','/bulk/actions','/bulk/actions/chunk'],
  dataLimiter
);

app.get('/auth', async (req, res) => {
  const sid = req.query.sid || uuidv4();
  const codeVerifier  = b64url(crypto.randomBytes(32));
  const codeChallenge = b64url(sha256(codeVerifier));

  await redis.hmset(`oauth:${sid}`, {
    code_verifier: codeVerifier,
    created_at: Date.now().toString()
  });
  await redis.expire(`oauth:${sid}`, 900); // 15 minutes

  console.log('[auth] start', { sid });

  const scopes = 'rnxt.r identity_basic offline_access';
  const oauthUrl =
    'https://oauth2.sky.blackbaud.com/authorization' +
    `?response_type=code&client_id=${encodeURIComponent(clientID)}` +
    `&redirect_uri=${encodeURIComponent(redirectURI)}` +
    `&scope=${encodeURIComponent(scopes)}` +
    `&state=${encodeURIComponent(sid)}` +
    `&code_challenge=${codeChallenge}&code_challenge_method=S256`;

  res.redirect(oauthUrl);
});

// redirect handler
app.get(config.REDIRECT_PATH, async (req, res) => {
  const state = req.query.state; // raw state from IdP
  const code  = req.query.code;

  if (!state || !code) {
    console.error('[redirect] missing code/state', { state, codePresent: !!code });
    return res.status(400).send('Missing code/state');
  }

  // MUST use raw state to fetch the PKCE entry
  const pending = await redis.hgetall(`oauth:${state}`);
  const ttl = await redis.ttl(`oauth:${state}`);

  if (!pending || !pending.code_verifier) {
    console.error('[redirect] invalid/expired state', { state, hasVerifier: !!pending?.code_verifier, ttl });
    return res
      .status(400)
      .send('<h1>Sign-in expired</h1><p>Please go back to the connector and click “Connect to Blackbaud” again.</p>');
  }

  console.log('[redirect] exchanging code', { state, ttl });

  try {
    const resp = await httpRequestWithRetry({
      method: 'POST',
      url: 'https://oauth2.sky.blackbaud.com/token',
      form: {
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectURI,
        client_id: clientID,
        code_verifier: pending.code_verifier,
        // Blackbaud allows client_secret; PKCE doesn’t require it, but it’s fine to keep:
        client_secret: clientSecret
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000
    });

    await redis.del(`oauth:${state}`);

    if (resp.statusCode !== 200) {
      console.error('[redirect] token exchange failed', { status: resp.statusCode, body: resp.body?.slice?.(0, 200) });
      return res.status(502).send('OAuth exchange failed');
    }

    const tok = JSON.parse(resp.body);

    // Choose the uid we’ll store long-lived BB tokens under:
    const uid = SINGLE_USER ? GLOBAL_UID : state;

    await setTokens(uid, {
      access:  tok.access_token,
      refresh: tok.refresh_token,
      exp:     Date.now() + tok.expires_in * 1000
    });

    // Bootstrap window so the Desktop WDC can mint its short-lived JWT using only sid
    await redis.set(`jwt_bootstrap:${state}`, '1', 'EX', 180); // 3 min

    console.log('[redirect] success', { state, uid, expiresIn: tok.expires_in });

    // Send the browser somewhere harmless; Desktop will call /status with sid=state
    res.redirect(`/wdc.html?sid=${encodeURIComponent(state)}`);
  } catch (e) {
    console.error('[redirect] exception', e);
    return res.status(500).send('OAuth exchange error');
  }
});


// Authentication Status
app.get('/status', async (req, res) => {
  // If caller already has a JWT, honor it
  const uid = uidFromReq(req);
  if (uid && await haveValidTokens(uid)) {
    return res.json({ authenticated: true, tok: issueJwt(uid) });
  }

  // WDC Desktop first-time bootstrapping via sid
  const sid = req.query.sid;
  if (sid && await redis.get(`jwt_bootstrap:${sid}`)) {
    // If you stored BB tokens under SINGLE_USER, hand back a JWT for GLOBAL_UID.
    // Otherwise, tokens are under the sid/state itself.
    const handoffUid = SINGLE_USER ? GLOBAL_UID : sid;
    if (await haveValidTokens(handoffUid)) {
      return res.json({ authenticated: true, tok: issueJwt(handoffUid) });
    }
  }

  // Optional fallback: if SINGLE_USER is enabled and user already authenticated
  if (SINGLE_USER && await haveValidTokens(GLOBAL_UID)) {
    return res.json({ authenticated: true, tok: issueJwt(GLOBAL_UID) });
  }

  return res.json({ authenticated: false });
});


// API Retrieval Path (Page logging for validation)
app.use('/getBlackbaudData', async (req, res, next) => {
  let uid = uidFromReq(req);
  if (!uid && SINGLE_USER) uid = GLOBAL_UID; // single user mode
  if (!uid || !(await haveValidTokens(uid))) {
    return res.status(401).json({ error: 'Not authenticated' });
  } 
  console.log('[debug] query params:', req.query);
  const DEFAULT_LIMIT = 5000;
  const DEFAULT_OFFSET = 0;

  const { endpoint, page, offset } = req.query;
  // Start logging while Tableau is Paging
  if (page !== undefined || offset !== undefined) {
    console.log(`[${new Date().toISOString()}] ${endpoint} page=${page ?? 'n/a'} offset=${offset ?? 'n/a'}`);
  }
  next();
});

// Dynamic Query Path
app.get('/bulk/query/init', async (req, res) => {
  const uid = uidFromReq(req);
  if (!uid || !(await haveValidTokens(uid))) return res.status(401).json({ error: 'Not authenticated' });
  const queryId = parseInt(req.query.query_id || req.query.queryId, 10);
  if (!queryId) return res.status(400).send('Missing queryId');

  const access = await ensureValidToken(uid);
  const startBody = { id: queryId, ux_mode: 'Asynchronous', output_format: 'Csv', formatting_mode: 'UI', sql_generation_mode: 'Query', use_static_query_id_set: false };
  const start = await httpRequestWithRetry({
    method: 'POST',
    url: 'https://api.sky.blackbaud.com/query/queries/executebyid?product=RE&module=None',
    headers: { Authorization: `Bearer ${access}`, 'Bb-Api-Subscription-Key': subscriptionKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(startBody)
  });
  const jobId = JSON.parse(start.body).id;

  // poll
  let status;
  do {
    await sleep(15000);
    const poll = await httpRequestWithRetry({
      method: 'GET',
      url: `https://api.sky.blackbaud.com/query/jobs/${jobId}?product=RE&module=None&include_read_url=OnceCompleted&content_disposition=Attachment`,
      headers: { Authorization: `Bearer ${access}`, 'Bb-Api-Subscription-Key': subscriptionKey }
    });
    status = JSON.parse(poll.body);
    if (status.status === 'Failed') return res.status(500).send('Query job failed');
  } while (status.status !== 'Completed');

  // download once → save tmp
  const buf = (await httpRequestWithRetry({ method: 'GET', url: status.sas_uri, encoding: null })).body;
  const tmpId = uuidv4();
  const file = path.join(os.tmpdir(), `query_${tmpId}.csv`);
  fs.writeFileSync(file, buf);

  setTimeout(() => fs.unlink(file, () => {}), 30 * 60 * 1000); // delete after 30 minutes

  const header = csvHeader(buf.toString('utf8'));
  const totalRows = parseCsv(buf.toString('utf8'), { columns: true, skip_empty_lines: true }).length; // or scan/count lines

  res.json({ id: tmpId, rows: totalRows, columns: header });
});

// --- chunk ---
app.get('/bulk/query/chunk', (req, res) => {
  const { id, page = 0, chunkSize = 15000 } = req.query;
  const file = path.join(os.tmpdir(), `query_${id}.csv`);
  if (!fs.existsSync(file)) return res.status(404).send('file expired');

  const start = Number(page) * Number(chunkSize);
  const end   = start + Number(chunkSize);

  const rows = [];
  let i = -1;

  const parse = require('csv-parse');
  const parser = fs.createReadStream(file).pipe(parse({ columns: true }));
  parser.on('data', (row) => {
    i += 1;
    if (i < start) return;
    if (i >= end) { parser.destroy(); return; }   // ← stop reading the rest
    rows.push(row);
  }).on('end', () => res.json({ value: rows, page: Number(page), chunkSize: Number(chunkSize) }));
});


app.delete('/bulk/query/purge', (req, res) => {
  const { id } = req.query;
  const file = path.join(os.tmpdir(), `query_${id}.csv`);
  fs.unlink(file, (e) => res.status(e ? 404 : 204).end());
});

// API Retrieval Path for All Action Records
// streams all Action rows to a temp CSV on the server
app.get('/bulk/actions', async (req, res) => {
  const uid = uidFromReq(req);
  if (!uid || !(await haveValidTokens(uid))) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // ── fixed header so opportunity_id is never dropped ───────────────
  const ACTION_COLS = [
    'id', 'category', 'completed', 'completed_date', 'computed_status',
    'constituent_id', 'date', 'date_added', 'date_modified', 'description',
    'direction', 'end_time', 'location', 'outcome', 'opportunity_id',
    'priority', 'start_time', 'status', 'status_code', 'summary', 'type',
    'fundraisers'
  ];

  const LIMIT = 5000;
  let pageCount = 0;
  let total = 0;
  const startTs = Date.now();
  let next = `https://api.sky.blackbaud.com/constituent/v1/actions?limit=${LIMIT}`;
  const tmpId = uuidv4();
  const tmpFile = path.join(os.tmpdir(), `actions_${tmpId}.csv`);
  const TTL_MS = 30 * 60 * 1000; // 30 minutes

  // CSV stream with explicit columns ---------------------------------
  const out = stringify({ header: true, columns: ACTION_COLS });
  const dest = fs.createWriteStream(tmpFile);
  out.pipe(dest);

  try {
    while (next) {
      const access = await ensureValidToken(uid);

      pageCount += 1;

      // Log each page to be requested for testing
      console.log(`[/bulk/actions] fetching page #${pageCount} at ${new Date().toISOString()}`);

      const pageResp = await httpRequestWithRetry({
        method: 'GET',
        url: next,
        headers: {
          Authorization: `Bearer ${access}`,
          'Bb-Api-Subscription-Key': subscriptionKey
        }
      });
      const page = JSON.parse(pageResp.body);

      // After page is received, log number of rows received
      const received = page.value.length;
      const elapsed = ((Date.now() - startTs) / 1000 / 60).toFixed(1);
      console.log(`[/bulk/actions] page #${pageCount} -> ${received} rows (total so far ${total + received}), ${elapsed} mins elapsed`);

      page.value.forEach(row => out.write(row));

      total += received;
      next = page.next_link || null;
    }
    out.end();
    dest.on('close', () => {
      // schedule cleanup
      setTimeout(() => fs.unlink(tmpFile, () => {}), TTL_MS);
      res.json({ id: tmpId, rows: total });
    });
  } catch (err) {
    console.error('Bulk actions error', err);
    out.destroy();
    fs.unlink(tmpFile, () => { });
    res.status(500).send('Bulk Actions failed: ' + err.message);
  }
});

// Bulk actions chunk streaming
app.get('/bulk/actions/chunk', (req, res) => {
  const { id, page = 0, chunkSize = 15000 } = req.query;
  const file = path.join(os.tmpdir(), `actions_${id}.csv`);
  if (!fs.existsSync(file)) return res.status(404).send('file expired');

  const start = page * chunkSize;
  const end = start + Number(chunkSize);
  const rows = [];

  const parse = require('csv-parse');
  let i = -1;
  const parser = fs.createReadStream(file).pipe(parse({ columns: true}));
  parser.on('data', (row) => {
    i += 1;
    if (i < start) return;
    if (i >= end) { parser.destroy(); return; }
    rows.push(row);
  })
    .on('end', () => res.json({ value: rows, page: Number(page), chunkSize: Number(chunkSize) }));
});

app.delete('/bulk/actions/purge', (req, res) => {
  const { id } = req.query;
  const file = path.join(os.tmpdir(), `actions_${id}.csv`);
  fs.unlink(file, (e) => res.status(e ? 404 : 204).end());
});

// Main API Retrieval Path
app.get('/getBlackbaudData', async (req, res) => {
  const uid = uidFromReq(req);
  if (!(await haveValidTokens(uid))) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  // API URL parameters
  const DEFAULT_LIMIT = 5000;
  const DEFAULT_OFFSET = 0;
  const endpoint = req.query.endpoint || "constituents";
  const limit = req.query.limit !== undefined
    ? parseInt(req.query.limit, 10)
    : DEFAULT_LIMIT;
  const offset = req.query.offset !== undefined
    ? parseInt(req.query.offset, 10)
    : DEFAULT_OFFSET;
  const maxPages = (req.query.max_pages ?? req.query.maxPages) !== undefined
    ? parseInt(req.query.max_pages ?? req.query.maxPages, 10)
    : Infinity;
  const name = req.query.name || null;
  const lookupId = req.query.lookup_id || req.query.lookupId || null;
  const recordId = req.query.id; // Endpoint specific ID for single record retrieval
  const queryId = req.query.query_id || req.query.queryId;
  const dateAdded = req.query.date_added || req.query.dateAdded || null;
  const lastModified = req.query.last_modified || req.query.lastModified || null;
  const includeInactive = toBool(req.query.include_inactive ?? req.query.includeInactive, false);
  const searchText = req.query.search_text || req.query.searchText || null;
  const sortToken = req.query.sort_token || req.query.sortToken || null;
  const listId = req.query.list_id || req.query.listId || null;
  const fundId = req.query.fund_id || req.query.fundId || null;
  const eventId = req.query.event_id || req.query.eventId || null;
  const constituentId = req.query.constituent_id || req.query.constituentId || null;
  const category = req.query.category || null;
  const startDateFrom = req.query.start_date_from || req.query.startDateFrom || null;
  const startDateTo = req.query.start_date_to || req.query.startDateTo || null;
  const fields = req.query.fields || null;
  const sort = req.query.sort || null;
  const group = req.query.group || null;
  const statusCode = req.query.status_code || req.query.statusCode || null;
  const continuationToken = req.query.continuation_token || req.query.continuationToken || null;
  const postStatus = req.query.post_status || req.query.postStatus || null;
  const giftType = req.query.gift_type || req.query.giftType || null;
  const receiptStatus = req.query.receipt_status || req.query.receiptStatus || null;
  const acknowledgementStatus = req.query.acknowledgement_status || req.query.acknowledgementStatus || null;
  const campaignId = req.query.campaign_id || req.query.campaignId || null;
  const appealId = req.query.appeal_id || req.query.appealId || null;
  const startGiftDate = req.query.start_gift_date || req.query.startGiftDate || null;
  const endGiftDate = req.query.end_gift_date || req.query.endGiftDate || null;
  const startGiftAmount = req.query.start_gift_amount || req.query.startGiftAmount || null;
  const endGiftAmount = req.query.end_gift_amount || req.query.endGiftAmount || null;

  try {
    // Ensure access token is valid and refresh if not
    await ensureValidToken(uid);

    // Actions Endpoint
    if (endpoint === "actions") { // Action List (all consts) [computed_status, date_added, last_modified, sort_token, status_code, list_id, continuation_token, offset, limit]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/constituent/v1/actions/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        console.log("URL = ", safeLogUrl(singleUrl));
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/constituent/v1/actions?`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`; // nextlink includes a sort token
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        if (statusCode) url += `status_code=${encodeURIComponent(statusCode)}&`;
        if (listId) url += `list_id=${encodeURIComponent(listId)}&`;
        if (continuationToken) url += `continuation_token=${encodeURIComponent(continuationToken)}&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log(`[${req.id}] -> Initial Actions URL:`, safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Constituents Endpoint
    else if (endpoint === "constituents") { // Constituent Get [constituent_id]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/constituent/v1/constituents/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/constituent/v1/constituents?`;
        if (includeInactive) url += `include_inactive=true&`;
        url += `limit=${limit}&offset=${offset}`;
        console.log("→ Initial Constituents URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Event List Endpoint
    else if (endpoint === "events") { // Get Event List [name, lookup_id, category, event_id, start_date_from, start_date_to, date_added, last_modified, fields, sort, include_inactive, group, limit, offset]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/event/v1/events/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/event/v1/eventlist?`;
        if (name) url += `name=${encodeURIComponent(name)}&`;
        if (lookupId) url += `lookup_id=${encodeURIComponent(lookupId)}&`;
        if (category) url += `category=${encodeURIComponent(category)}&`;
        if (startDateFrom) url += `start_date_from=${encodeURIComponent(startDateFrom)}&`;
        if (startDateTo) url += `start_date_to=${encodeURIComponent(startDateTo)}&`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        if (fields) url += `fields=${encodeURIComponent(fields)}&`;
        if (sort) url += `sort=${encodeURIComponent(sort)}&`;
        url += `include_inactive=${includeInactive}&`;
        if (eventId) url += `event_id=${encodeURIComponent(eventId)}&`;
        if (group) url += `group=${encodeURIComponent(group)}&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log("→ Initial Events URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Gifts Endpoint
    else if (endpoint === "gifts") { // Gift List [date_added, last_modified, sort_token, constituent_id, post_status, gift_type, receipt_status, acknowledgement_status, campaign_id, fund_id, appeal_id, start_gift_date, end_gift_date, start_gift_amount, end_gift_amount, list_id, sort, limit, offset]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/gift/v1/gifts/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/gift/v1/gifts?product=RE&module=None&`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        if (constituentId) url += `constituent_id=${encodeURIComponent(constituentId)}&`;
        if (postStatus) url += `post_status=${encodeURIComponent(postStatus)}&`; // needs to be added as parameter
        if (giftType) url += `gift_type=${encodeURIComponent(giftType)}&`;     // 
        if (receiptStatus) url += `receipt_status=${encodeURIComponent(receiptStatus)}&`;
        if (acknowledgementStatus) url += `acknowledgement_status=${encodeURIComponent(acknowledgementStatus)}&`;
        if (campaignId) url += `campaign_id=${encodeURIComponent(campaignId)}&`;
        if (fundId) url += `fund_id=${encodeURIComponent(fundId)}&`;
        if (appealId) url += `appeal_id=${encodeURIComponent(appealId)}&`;
        if (startGiftDate) url += `start_gift_date=${encodeURIComponent(startGiftDate)}&`;
        if (endGiftDate) url += `end_gift_date=${encodeURIComponent(endGiftDate)}&`;
        if (startGiftAmount) url += `start_gift_amount=${encodeURIComponent(startGiftAmount)}&`;
        if (endGiftAmount) url += `end_gift_amount=${encodeURIComponent(endGiftAmount)}&`;
        if (listId) url += `list_id=${encodeURIComponent(listId)}&`;
        if (sort) url += `sort=${encodeURIComponent(sort)}&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else if (!dateAdded && !lastModified) {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log("→ Initial Gifts URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Funds Endpoint
    else if (endpoint === "funds") { // Fund List [date_added, last_modified, sort_token, include_inactive, fund_id, limit, offset]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/fundraising/v1/funds/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/fundraising/v1/funds?`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        url += `include_inactive=${includeInactive}&`;
        if (fundId) url += `fund_id=${encodeURIComponent(fundId)}&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log("→ Initial Funds URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Campaigns Endpoint
    else if (endpoint === "campaigns") { // Campaign List [date_added, last_modified, sort_token, include_inactive, limit, offset]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/fundraising/v1/campaigns/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/fundraising/v1/campaigns?`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        url += `include_inactive=${includeInactive}&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log("→ Initial Campaigns URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Appeals Endpoint
    else if (endpoint === "appeals") { // Appeal List [date_added, last_modified, sort_token, include_inactive, limit, offset]
      if (recordId) {
        const singleUrl = `https://api.sky.blackbaud.com/fundraising/v1/appeals/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        let url = `https://api.sky.blackbaud.com/fundraising/v1/appeals?`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        if (includeInactive) url += `include_inactive=true&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log("→ Initial Appeals URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Opportunities Endpoint
    else if (endpoint === "opportunities") { // Opportunity List [date_added, last_modified, include_inactive, search_text, sort_token, consituent_id, list_id, limit, offset]
      if (recordId) {
        // Single record by ID
        const singleUrl = `https://api.sky.blackbaud.com/opportunity/v1/opportunities/${recordId}`;
        const singleData = await fetchSingleRecord(uid, singleUrl);
        return res.json({ value: [singleData] });
      } else {
        // List endpoint
        let url = `https://api.sky.blackbaud.com/opportunity/v1/opportunities?`;
        if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
        if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
        url += `include_inactive=${includeInactive}&`;
        if (searchText) url += `search_text=${encodeURIComponent(searchText)}&`;
        if (constituentId) url += `constituent_id=${encodeURIComponent(constituentId)}&`;
        if (listId) url += `list_id=${encodeURIComponent(listId)}&`;
        if (sortToken) {
          // cursor mode: ignore offset, start from the supplied token
          url += `sort_token=${encodeURIComponent(sortToken)}&limit=${limit}`;
        } else {
          // offset mode: classic paging
          url += `limit=${limit}&offset=${offset}`;
        }
        console.log("→ Initial Opportunities URL:", safeLogUrl(url));
        const allRecords = await fetchMultipleRecords(uid, url, [], 0, maxPages);
        return res.json({ value: allRecords });
      }
    }
    // Query Endpoint
    else if (endpoint === "query") {
      if (!queryId) return res.status(400).send("Missing queryId");
      const access = await ensureValidToken(uid);

      const schemaOnly = req.query.schemaOnly === "1";

      try {
        // Kick off the job
        const startBody = {
          id: parseInt(queryId, 10),
          ux_mode: "Asynchronous",
          output_format: "Csv",
          formatting_mode: "UI",
          sql_generation_mode: "Query",
          use_static_query_id_set: false
        };

        const startJobResp = await httpRequestWithRetry({
          method: 'POST',
          url: 'https://api.sky.blackbaud.com/query/queries/executebyid?product=RE&module=None',
          headers: {
            Authorization: `Bearer ${access}`,
            'Bb-Api-Subscription-Key': subscriptionKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(startBody)
        });

        const jobId = JSON.parse(startJobResp.body).id;

        // Poll until the job is complete
        let jobStatus;
        do {
          await sleep(15000);
          const pollResp = await httpRequestWithRetry({
            method: 'GET',
            url: `https://api.sky.blackbaud.com/query/jobs/${jobId}?product=RE&module=None&include_read_url=OnceCompleted&content_disposition=Attachment`,
            headers: {
              Authorization: `Bearer ${access}`,
              'Bb-Api-Subscription-Key': subscriptionKey
            }
          });
          jobStatus = JSON.parse(pollResp.body);
          if (jobStatus.status === 'Failed')
            return res.status(500).send(`Query job failed: ${pollResp.body}`);
        } while (jobStatus.status !== 'Completed');

        // Download the CSV once
        const csvResp = await requestPromise({
          method: 'GET',
          url: jobStatus.sas_uri,
          encoding: null
        });
        const csvText = csvResp.body.toString('utf8');

        // If this is a schema only request, return header only and stop
        if (schemaOnly) {
          return res.json(csvHeader(csvText));
        }

        const rows = parseCsv(csvText, { columns: true, skip_empty_lines: true });
        const CHUNK = parseInt(req.query.chunkSize || '15000', 10);
        const page = parseInt(req.query.page || '0', 10);
        const start = page * CHUNK;
        const slice = rows.slice(start, start + CHUNK);

        return res.json({
          totalRows: rows.length,
          page,
          chunkSize: CHUNK,
          value: slice
        });

      } catch (err) {
        console.error("Query flow error:", err);
        return res.status(500).send("Query flow error: " + err.message);
      }
    }

    res.status(400).send("Unknown endpoint.");

  } catch (err) {
    if (err.message.includes('Authentication expired')) {
      return res.status(401).send(err.message);
    }
    console.error(err);
    return res.status(500).send(err.message);
  }
});

http.createServer(app).listen(config.PORT, function () {
  console.log('Express server listening on port ' + config.PORT);
});