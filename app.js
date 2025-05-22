// -------------------------------------------------- //
// Module Dependencies & Variables
// -------------------------------------------------- //
var cookieParser = require('cookie-parser');
var http = require('http');
var request = require('request');
var config = require('./config.js');

const rp = require('request-promise-native');
const cors = require('cors');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const app = express();
const { promisify } = require('util');
const requestPromise = promisify(request);
const { parse: parseCsv } = require('csv-parse/sync'); // Requires: npm i csv-parse
const { v4: uuidv4 } = require('uuid'); // Requires: npm i uuid
const { stringify } = require('csv-stringify'); // Requires: npm i csv-stringify

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

// Fetch a single API record 
function fetchSingleRecord(url, accessToken, subKey, callback) {
  const options = {
    method: 'GET',
    url: url,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Bb-Api-Subscription-Key': subKey
    }
  };
  request(options, function (error, response, body) {
    if (error) return callback(error);
    if (response.statusCode !== 200) {
      return callback(new Error(`Status: ${response.statusCode} => ${body}`));
    }
    let data;
    try { data = JSON.parse(body); }
    catch (e) { return callback(e); }
    callback(null, data);
  });
}

// Fetch multiple API records
function fetchMultipleRecords(url, accessToken, subscriptionKey, allItems, pageCount, maxPages, callback) {
  if (Number.isFinite(maxPages) && pageCount >= maxPages) {
    return callback(null, allItems);
  }
  const options = {
    method: 'GET',
    url: url,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Bb-Api-Subscription-Key': subscriptionKey
    }
  };
  request(options, function (error, response, body) {
    if (error) return callback(error);
    if (response.statusCode !== 200) {
      return callback(new Error(`Status: ${response.statusCode} => ${body}`));
    }
    logTruncated(body, 200);
    let data;
    try { data = JSON.parse(body); }
    catch (e) { return callback(e); }
    if (data.value && Array.isArray(data.value)) {
      allItems.push(...data.value);
    }
    if (data.next_link) {
      fetchMultipleRecords(data.next_link, accessToken, subscriptionKey, allItems, pageCount + 1, maxPages, callback);
    } else {
      callback(null, allItems);
    }
  });
}

// Express app variables and dependencies
app.set('port', (process.env.PORT || config.PORT));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));
app.use(cors());

// API Environment variables and OAuth secrets
var clientID = process.env.BLACKBAUD_CLIENT_ID || config.CLIENT_ID;
var clientSecret = process.env.BLACKBAUD_CLIENT_SECRET || config.CLIENT_SECRET;
var subscriptionKey = process.env.BLACKBAUD_SUBSCRIPTION_KEY || config.SUBSCRIPTION_KEY;
var redirectURI = config.HOSTPATH + ":" + config.PORT + config.REDIRECT_PATH;

// -------------------TEST LOGGING-------------------- //
// console.log("Client ID: " + clientID);
// console.log("Client Secret: " + clientSecret);
// console.log("Redirect URI: " + redirectURI);
// console.log("Subscription Key: " + subscriptionKey);

let storedAccessToken = null;

// Base Path
app.get('/', function (req, res) {
  console.log("Received GET /, redirecting to wdc.html...");
  res.redirect('/wdc.html');
});

// BlackBaud Authentication Path
app.get('/auth', function (req, res) {
  var oauthUrl = "https://oauth2.sky.blackbaud.com/authorization" +
    "?response_type=code" +
    "&client_id=" + encodeURIComponent(clientID) +
    "&redirect_uri=" + encodeURIComponent(redirectURI) +
    "&scope=" + encodeURIComponent("rnxt.w rnxt.r");
  console.log("Redirecting to OAuth URL: " + oauthUrl);
  res.redirect(oauthUrl);
});

app.get(config.REDIRECT_PATH, function (req, res) {
  var authCode = req.query.code;
  console.log("Auth Code is: " + authCode);

  var requestObject = {
    'client_id': clientID,
    'redirect_uri': redirectURI,
    'client_secret': clientSecret,
    'code': authCode,
    'grant_type': 'authorization_code'
  };
  var token_request_header = { 'Content-Type': 'application/x-www-form-urlencoded' };
  var options = {
    method: 'POST',
    url: 'https://oauth2.sky.blackbaud.com/token',
    form: requestObject,
    headers: token_request_header
  };
  request(options, function (error, response, body) {
    if (!error) {
      body = JSON.parse(body);
      console.log("Received JSON from RE NXT: ", body);
      var accessToken = body.access_token;
      console.log('Received accessToken: ' + accessToken);
      storedAccessToken = accessToken;
      res.redirect('/wdc.html');
    } else {
      console.log("Token exchange error:", error);
      res.send("Error exchanging code for token.");
    }
  });
});

// Authentication Status
app.get('/status', function (req, res) {
  if (storedAccessToken) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// API Retrieval Path (Page logging for validation)
app.use('/getBlackbaudData', (req, res, next) => {
  const DEFAULT_LIMIT = 500;
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
  if (!storedAccessToken) return res.status(401).json({ error: 'Not authenticated' });

  const LIMIT = 5000;
  let next = `https://api.sky.blackbaud.com/constituent/v1/actions?limit=${LIMIT}`;
  const tmpId = uuidv4();
  const tmpFile = path.join(os.tmpdir(), `actions_${tmpId}.csv`);

  // Timestamp for testing and record keeping
  const startTs = Date.now();
  let pageCount = 0;
  let total = 0;

  const out = stringify({ header: true });
  const dest = fs.createWriteStream(tmpFile);
  out.pipe(dest);

  try {
    while (next) {
      pageCount += 1;

      // Log each page to be requested for testing
      console.log(`[/bulk/actions] fetching page #${pageCount} at ${new Date().toISOString()}`);

      const page = await rp({
        uri: next,
        json: true,
        headers: {
          Authorization: `Bearer ${storedAccessToken}`,
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

// API Retrieval Path
app.get('/getBlackbaudData', async (req, res) => {
  if (!storedAccessToken) {
    return res.status(401).json({ error: "Not authenticated." });
  }
  // API URL parameters
  const DEFAULT_LIMIT = 500;
  const DEFAULT_OFFSET = 0;
  const endpoint = req.query.endpoint || "constituents";
  const limit = req.query.limit !== undefined
    ? parseInt(req.query.limit, 10)
    : DEFAULT_LIMIT;
  const offset = req.query.offset !== undefined
    ? parseInt(req.query.offset, 10)
    : DEFAULT_OFFSET;
  const maxPages = req.query.maxPages !== undefined
    ? parseInt(req.query.maxPages, 10)
    : undefined;
  const name = req.query.name || null;
  const lookupId = req.query.lookup_id || req.query.lookupId || null;
  const recordId = req.query.id; // Endpoint specific ID for single record retrieval
  const queryId = req.query.query_id || req.query.queryId;
  const dateAdded = req.query.date_added || req.query.dateAdded || null;
  const lastModified = req.query.last_modified || req.query.lastModified || null;
  const includeInactive = req.query.include_inactive || req.query.includeInactive === 'true';
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

  // Actions Endpoint
  if (endpoint === "actions") { // Action List (all consts) [computed_status, date_added, last_modified, sort_token, status_code, list_id, continuation_token, offset, limit]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/constituent/v1/actions/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      const url = `https://api.sky.blackbaud.com/constituent/v1/actions?`;
      if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`; // nextlink includes a sort token
      if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
      if (sortToken) url += `sort_token=${encodeURIComponent(sortToken)}&`;
      if (statusCode) url += `status_code=${encodeURIComponent(statusCode)}&`;
      if (listId) url += `list_id=${encodeURIComponent(listId)}&`;
      if (continuationToken) url += `continuation_token=${encodeURIComponent(continuationToken)}&`;
      url += `limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Constituents Endpoint
  else if (endpoint === "constituents") { // Constituent Get [constituent_id]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/constituent/v1/constituents/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      const url = `https://api.sky.blackbaud.com/constituent/v1/constituents?limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Event List Endpoint
  else if (endpoint === "events") { // Get Event List [name, lookup_id, category, event_id, start_date_from, start_date_to, date_added, last_modified, fields, sort, include_inactive, group, limit, offset]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/event/v1/events/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
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
      url += `limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Gifts Endpoint
  else if (endpoint === "gifts") { // Gift List [date_added, last_modified, sort_token, constituent_id, post_status, gift_type, receipt_status, acknowledgement_status, campaign_id, fund_id, appeal_id, start_gift_date, end_gift_date, start_gift_amount, end_gift_amount, list_id, sort, limit, offset]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/gift/v1/gifts/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      let url = `https://api.sky.blackbaud.com/gift/v1/gifts?`;
      if (dateAdded) url += `date_added=${encodeURI(dateAdded)}&`;
      if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
      if (sortToken) url += `sort_token=${encodeURIComponent(sortToken)}&`;
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
      url += `limit=${limit}&offset=${offset}`;
      console.log("→ Initial Gifts URL:", url);
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Funds Endpoint
  else if (endpoint === "funds") { // Fund List [date_added, last_modified, sort_token, include_inactive, fund_id, limit, offset]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/fundraising/v1/funds/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      let url = `https://api.sky.blackbaud.com/fundraising/v1/funds?`;
      if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
      if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
      if (sortToken) url += `sort_token=${encodeURIComponent(sortToken)}&`;
      url += `include_inactive=${includeInactive}&`;
      if (fundId) url += `fund_id=${encodeURIComponent(fundId)}&`;
      url += `limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Campaigns Endpoint
  else if (endpoint === "campaigns") { // Campaign List [date_added, last_modified, sort_token, include_inactive, limit, offset]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/fundraising/v1/campaigns/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      let url = `https://api.sky.blackbaud.com/fundraising/v1/campaigns?`;
      if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
      if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
      if (sortToken) url += `sort_token=${encodeURIComponent(sortToken)}&`;
      url += `include_inactive=${includeInactive}&`;
      url += `limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Appeals Endpoint
  else if (endpoint === "appeals") { // Appeal List [date_added, last_modified, sort_token, include_inactive, limit, offset]
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/fundraising/v1/appeals/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      let url = `https://api.sky.blackbaud.com/fundraising/v1/appeals?`;
      if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
      if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
      if (sortToken) url += `sort_token=${encodeURIComponent(sortToken)}&`;
      url += `include_inactive=${includeInactive}&`;
      url += `limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Opportunities Endpoint
  else if (endpoint === "opportunities") { // Opportunity List [date_added, last_modified, include_inactive, search_text, sort_token, consituent_id, list_id, limit, offset]
    if (recordId) {
      // Single record by ID
      const singleUrl = `https://api.sky.blackbaud.com/opportunity/v1/opportunities/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      // List endpoint
      let url = `https://api.sky.blackbaud.com/opportunity/v1/opportunities?`;
      if (dateAdded) url += `date_added=${encodeURIComponent(dateAdded)}&`;
      if (lastModified) url += `last_modified=${encodeURIComponent(lastModified)}&`;
      url += `include_inactive=${includeInactive}&`;
      if (searchText) url += `search_text=${encodeURIComponent(searchText)}&`;
      if (sortToken) url += `sort_token=${encodeURIComponent(sortToken)}&`;
      if (constituentId) url += `constituent_id=${encodeURIComponent(constituentId)}&`;
      if (listId) url += `list_id=${encodeURIComponent(listId)}&`;
      url += `limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchMultipleRecords(url, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  // Query Endpoint
  else if (endpoint === "query") {
    if (!queryId) return res.status(400).send("Missing queryId");

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
          Authorization: `Bearer ${storedAccessToken}`,
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
            Authorization: `Bearer ${storedAccessToken}`,
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
  else {
    res.status(400).send("Unknown endpoint.");
  }
});

http.createServer(app).listen(app.get('port'), function () {
  console.log('Express server listening on port ' + app.get('port'));
});