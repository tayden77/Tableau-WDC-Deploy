// -------------------------------------------------- //
// Module Dependencies & Variables
// -------------------------------------------------- //
// require('dotenv').config();

const cookieParser = require('cookie-parser');
const http = require('http');
const request = require('request');
const rp = require('request-promise-native');
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
const redirectURI = `${config.HOSTPATH}:${config.PORT}${config.REDIRECT_PATH}`;

// -------------------------
// Express App
// -------------------------
app.set('port', config.PORT);
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use(cors());
const tokenCache = new Map();   // key => { access, refresh, exp }
function setTokens(key, tokObj) { tokenCache.set(key, tokObj); }
function getTokens(key) { return tokenCache.get(key); }
function haveValidTokens(key) {
  const t = tokenCache.get(key);
  return t && t.exp > Date.now();
}

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

// Extract the header row from the CSV results
function csvHeader(csvText) {
  return csvText.split('\n')[0].trim().split(',');
}

function toBool(v, fallback = false) {
  if (v === undefined) return fallback;
  return String(v).toLowerCase() === 'true';
}

// Ensure the tokens remain valid on long calls after they expire
async function ensureValidToken(uid) {
  const tok = getTokens(uid);
  if (!tok) throw new Error('Not authenticated');

  // refresh 60 s early
  if (Date.now() >= tok.exp - 60_000) {
    const resp = await requestPromise({
      method: 'POST',
      url: 'https://oauth2.sky.blackbaud.com/token',
      form: {
        grant_type:    'refresh_token',
        refresh_token: tok.refresh,
        client_id:     clientID,
        client_secret: clientSecret
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const body = JSON.parse(resp.body);
    setTokens(uid, {
      access:  body.access_token,
      refresh: body.refresh_token,
      exp:     Date.now() + body.expires_in * 1000
    });
    return body.access_token;
  }

  return tok.access;
}


// Fetch a single API record 
async function fetchSingleRecord(uid, url) {
  // 3️⃣ Ensure we have a fresh access token
  const access = await ensureValidToken(uid);

  const resp = await requestPromise({
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

  const resp = await requestPromise({
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
  if (pageCount === 0) console.log('[gift] first page rows', data.value.length);
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
app.get('/auth', (_, res) => {
  const scopes = [
    'rnxt.w',     // read/write RE-NXT APIs
    'rnxt.r',
    'identity_basic',    // calls the identity service
    'offline_access'     // for the refresh-token
  ].join(' ');

  const oauthUrl = [
    'https://oauth2.sky.blackbaud.com/authorization',
    `?response_type=code`,
    `&client_id=${encodeURIComponent(clientID)}`,
    `&redirect_uri=${encodeURIComponent(redirectURI)}`,
    `&scope=${encodeURIComponent(scopes)}`
  ].join('');

  console.log("Redirecting to OAuth URL: " + oauthUrl);
  res.redirect(oauthUrl)
})

app.get(config.REDIRECT_PATH, async (req, res) => {
  const authCode = req.query.code;

  try {
    const resp = await requestPromise({
      method: 'POST',
      url: 'https://oauth2.sky.blackbaud.com/token',
      form: {
        client_id:     clientID,
        client_secret: clientSecret,
        redirect_uri:  redirectURI,
        code:          authCode,
        grant_type:    'authorization_code'
      },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tok = JSON.parse(resp.body);

    //const userId = await fetchUserId(tok.access_token); //404 error (07/31/25)
    const uid = uuidv4();

    setTokens(uid, {
      access:  tok.access_token,
      refresh: tok.refresh_token,
      exp:     Date.now() + tok.expires_in * 1000
    });

    // send the uid back to the browser
    res.redirect(`/wdc.html?uid=${encodeURIComponent(uid)}`);
  } catch (err) {
    console.error('OAuth exchange failed', err);
    res.status(500).send('OAuth exchange failed');
  }
});


// Authentication Status
app.get('/status', (req, res) => {
  const uid = req.query.uid;

  // client passed a uid -> normal path
  if (uid) {
    res.json({ authenticated: haveValidTokens(uid) });
  }

  // client did NOT pass a uid -> see if exactly one valid session exists
  const validUids = [...tokenCache.keys()].filter(haveValidTokens);

  if (validUids.lenth === 1) {
    return res.json({ authenticated: true, uid: validUids[0] });
  }

  // zero / multiple valid sessions - force explicit sign-in / selection
  res.json({ authenticated: false });
});


// API Retrieval Path (Page logging for validation)
app.use('/getBlackbaudData', (req, res, next) => {
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

// API Retrieval Path for All Action Records
// streams all Action rows to a temp CSV on the server
app.get('/bulk/actions', async (req, res) => {
  const uid = req.query.uid;
  if (!haveValidTokens(uid)) {
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

      const page = await rp({
        uri: next,
        json: true,
        headers: {
          Authorization: `Bearer ${access}`,
          'Bb-Api-Subscription-Key': subscriptionKey
        }
      });

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

  fs.createReadStream(file)
    .pipe(require('csv-parse')({ columns: true }))
    .on('data', (row) => {
      if (rows.length >= chunkSize) return;
      const idx = rows.length + page * chunkSize;
      if (idx >= start && idx < end) rows.push(row);
    })
    .on('end', () => res.json({ value: rows, page: Number(page), chunkSize: Number(chunkSize) }));
});

// Main API Retrieval Path
app.get('/getBlackbaudData', async (req, res) => {
  const uid = req.query.uid;
  if (!haveValidTokens(uid)) {
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
        console.log("URL = ", singleUrl);
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
        console.log("→ Initial Actions URL:", url);
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
        console.log("→ Initial Constituents URL:", url);
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
        console.log("→ Initial Events URL:", url);
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
        if (startGiftDate) url += `start_gift_date=${encodeURI(startGiftDate)}&`;
        if (endGiftDate) url += `end_gift_date=${encodeURI(endGiftDate)}&`;
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
        console.log("→ Initial Gifts URL:", url);
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
        console.log("→ Initial Funds URL:", url);
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
        console.log("→ Initial Campaigns URL:", url);
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
        console.log("→ Initial Appeals URL:", url);
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
        console.log("→ Initial Opportunities URL:", url);
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

        const startJobResp = await requestPromise({
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
          const pollResp = await requestPromise({
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