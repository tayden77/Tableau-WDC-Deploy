// -------------------------------------------------- //
// Module Dependencies
// -------------------------------------------------- //
var express = require('express');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var http = require('http');
var request = require('request');
var path = require('path');
var config = require('./config.js');
var sys = require('util');

var app = express();

const { promisify } = require('util');
const requestPromise = promisify(request);
const { parse: parseCsv } = require('csv-parse/sync');

// Helper function to truncate console logging
function logTruncated(msg, maxLength = 1000) {
  if (msg.length > maxLength) {
    console.log(msg.substring(0, maxLength) + "… [truncated]");
  } else {
    console.log(msg);
  }
}

// Helper function to sleep (ms)
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper: start a saved query job
function startQueryJobById(queryId, accessToken, subKey, callback) {
  const options = {
    method: 'POST',
    url: 'https://api.sky.blackbaud.com/query/queries/executebyid',
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Bb-Api-Subscription-Key': subKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query_id: queryId })
  };
  request(options, function (err, resp, body) {
    if (err) return callback(err);
    if (resp.statusCode !== 200) {
      return callback(new Error(`Status: ${resp.statusCode} => ${body}`));
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return callback(e);
    }
    callback(null, data);
  });
}

// Helper: poll job status
function getQueryJobStatus(jobId, accessToken, subKey, callback) {
  const options = {
    method: 'GET',
    url: `https://api.sky.blackbaud.com/query/jobs/${jobId}?product=RE&module=None&include_read_url=true`,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Bb-Api-Subscription-Key': subKey
    }
  };
  request(options, function (err, resp, body) {
    if (err) return callback(err);
    if (resp.statusCode !== 200) {
      return callback(new Error(`Status: ${resp.statusCode} => ${body}`));
    }
    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return callback(e);
    }
    callback(null, data);
  });
}

// Helper: download final query file
function downloadQueryFile(sasUri, callback) {
  request({ url: sasUri, method: 'GET' }, function (err, resp, body) {
    if (err) return callback(err);
    if (resp.statusCode !== 200) {
      return callback(new Error(`Status: ${resp.statusCode} => ${body}`));
    }
    callback(null, body);
  });
}

// Helper: extract the header row from the query results
function csvHeader(csvText) {
  return csvText.split('\n')[0].trim().split(',');
}

// Helper to fetch single record
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

// Helper to fetch constituents multi-page
function fetchSomeConstituents(url, accessToken, subscriptionKey, allItems, pageCount, maxPages, callback) {
  if (pageCount >= maxPages) {
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
      fetchSomeConstituents(data.next_link, accessToken, subscriptionKey, allItems, pageCount + 1, maxPages, callback);
    } else {
      callback(null, allItems);
    }
  });
}

app.set('port', (process.env.PORT || config.PORT));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));

var clientID = process.env.BLACKBAUD_CLIENT_ID || config.CLIENT_ID;
var clientSecret = process.env.BLACKBAUD_CLIENT_SECRET || config.CLIENT_SECRET;
var subscriptionKey = process.env.BLACKBAUD_SUBSCRIPTION_KEY || config.SUBSCRIPTION_KEY;
var redirectURI = config.HOSTPATH + ":" + config.PORT + config.REDIRECT_PATH;

console.log("Client ID: " + clientID);
console.log("Client Secret: " + clientSecret);
console.log("Redirect URI: " + redirectURI);
console.log("Subscription Key: " + subscriptionKey);

let storedAccessToken = null;

app.get('/', function (req, res) {
  console.log("Received GET /, redirecting to wdc.html...");
  res.redirect('/wdc.html');
});

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

app.get('/status', function (req, res) {
  if (storedAccessToken) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

app.use('/getBlackbaudData', (req, res, next) => {
  const { endpoint, page, offset } = req.query;
  // only log when Tableau is paging, not for the first big query build
  if (page !== undefined || offset !== undefined) {
    console.log(`[${new Date().toISOString()}] ${endpoint} page=${page ?? 'n/a'} offset=${offset ?? 'n/a'}`);
  }
  next();
});

app.get('/getBlackbaudData', async (req, res) => {
  if (!storedAccessToken) {
    return res.status(401).json({ error: "Not authenticated." });
  }

  const endpoint = req.query.endpoint || "constituents";
  const limit = req.query.limit || 500;
  const offset = req.query.offset || 0;
  const maxPages = req.query.maxPages || 1;
  const recordId = req.query.id;
  const queryId = req.query.queryId;

  if (endpoint === "actions") {
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/constituent/v1/actions/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      const startUrl = `https://api.sky.blackbaud.com/constituent/v1/actions?limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchSomeConstituents(startUrl, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  else if (endpoint === "constituents") {
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/constituent/v1/constituents/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      const startUrl = `https://api.sky.blackbaud.com/constituent/v1/constituents?limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchSomeConstituents(startUrl, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
  else if (endpoint === "gifts") {
    if (recordId) {
      const singleUrl = `https://api.sky.blackbaud.com/gift/v1/gifts/${recordId}`;
      fetchSingleRecord(singleUrl, storedAccessToken, subscriptionKey, (err, singleData) => {
        if (err) return res.status(500).send("Error: " + err.message);
        res.json({ value: [singleData] });
      });
    } else {
      const startUrl = `https://api.sky.blackbaud.com/gift/v1/gifts?limit=${limit}&offset=${offset}`;
      let allRecords = [];
      fetchSomeConstituents(startUrl, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function (err, results) {
        if (err) return res.status(500).send("Error fetching partial data: " + err.message);
        res.json({ value: results });
      });
    }
  }
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