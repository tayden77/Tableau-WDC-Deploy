// -------------------------------------------------- //
// Module Dependencies
// -------------------------------------------------- //
var express = require('express');
var cookieParser = require('cookie-parser');
var querystring = require('querystring');
var http = require('http');
var request = require('request');
var path = require('path');
var config = require('./config.js');              // Get our config info (app id, secret, etc.)
var sys = require('util');

var app = express();

// Helper function to truncate console logging to set num characters during testing
function logTruncated(msg, maxLength = 1000) {
  if (msg.length > maxLength) {
    console.log(msg.substring(0, maxLength) + "… [truncated]");
  } else {
    console.log(msg);
  }
}

// Helper function to get multiple pages of data from the API at once
function fetchAllConstituents(url, accessToken, subKey, allItems, callback) {
  const options = {
    method: 'GET',
    url: url,
    headers: {
      'Authorization': 'Bearer ' + accessToken,
      'Bb-Api-Subscription-Key': subKey
    }
  };

  request(options, function (error, response, body) {
    if (error) {
      return callback(error);
    }
    if (response.statusCode !== 200) {
      return callback(
        new Error(`Non-200 status: ${response.statusCode} => ${body}`)
      );
    }

    console.log("Received a page of data from RE NXT...");
    logTruncated(body, 2000);

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return callback(e);
    }

    // Append this page's records
    if (data.value && Array.isArray(data.value)) {
      allItems.push(...data.value);
    }

    // Check if there's a next_link
    // if (data.next_link) {
    //   console.log(`Found next link: ${data.next_link}`);
    //   // Recursively fetch next page
    //   fetchAllConstituents(data.next_link, accessToken, subKey, allItems, callback);
    // } else {
    //   // No more pages
    //   callback(null, allItems);
    // }
    callback(null, allItems);
  });
}

// Helper function to fetch a specific number of pages (API Calls - 500 records each)
function fetchSomeConstituents(url, accessToken, subscriptionKey, allItems, pageCount, maxPages, callback) {
  if (pageCount >= maxPages) {
    // We've hit our limit
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

  request(options, function(error, response, body) {
    if (error) {
      return callback(error);
    }
    if (response.statusCode !== 200) {
      return callback(new Error(`Status: ${response.statusCode} => ${body}`));
    }

    let data;
    try {
      data = JSON.parse(body);
    } catch (e) {
      return callback(e);
    }

    // Append this page's value array
    if (data.value && Array.isArray(data.value)) {
      allItems.push(...data.value);
    }

    // If next_link exists AND we haven't reached maxPages, follow it
    if (data.next_link) {
      fetchSomeConstituents(data.next_link, accessToken, subscriptionKey, allItems, pageCount + 1, maxPages, callback);
    } else {
      // No more pages
      callback(null, allItems);
    }
  });
}

// -------------------------------------------------- //
// Express set-up and middleware
// -------------------------------------------------- //
app.set('port', (process.env.PORT || config.PORT));
app.use(cookieParser());
app.use(express.static(__dirname + '/public'));

// -------------------------------------------------- //
// Variables
// -------------------------------------------------- //
var clientID = process.env.BLACKBAUD_CLIENT_ID || config.CLIENT_ID;
var clientSecret = process.env.BLACKBAUD_CLIENT_SECRET || config.CLIENT_SECRET;
var subscriptionKey = process.env.BLACKBAUD_SUBSCRIPTION_KEY || config.SUBSCRIPTION_KEY;
var redirectURI = config.HOSTPATH + ":" + config.PORT + config.REDIRECT_PATH;

console.log("Client ID: " + clientID);
console.log("Client Secret: " + clientSecret);
console.log("Redirect URI: " + redirectURI);
console.log("Subscription Key: " + subscriptionKey);

// Global variable to store the Blackbaud access token in memory
let storedAccessToken = null;

// -------------------------------------------------- //
// Routes
// -------------------------------------------------- //

// 1) Base route: Redirect to wdc.html
app.get('/', function(req, res) {
  console.log("Received GET /, redirecting to wdc.html...");
  res.redirect('/wdc.html');
});

// (Optional) Provide an /auth route so users can initiate authentication manually
app.get('/auth', function(req, res) {
  // Build the OAuth URL for Blackbaud
  var oauthUrl = "https://oauth2.sky.blackbaud.com/authorization" +
    "?response_type=code" +
    "&client_id=" + encodeURIComponent(clientID) +
    "&redirect_uri=" + encodeURIComponent(redirectURI) +
    "&scope=" + encodeURIComponent("rnxt.w rnxt.r")  // Adjust scopes as needed

  // Automatically redirect the user to the OAuth URL
  console.log("Redirecting to OAuth URL: " + oauthUrl);
  res.redirect(oauthUrl);
});

// 2) OAuth Redirect Path: Blackbaud calls back here with ?code=...
app.get(config.REDIRECT_PATH, function(req, res) {
  var authCode = req.query.code;
  console.log("Auth Code is: " + authCode);

  var requestObject = {
      'client_id': clientID,
      'redirect_uri': redirectURI,
      'client_secret': clientSecret,
      'code': authCode,
      'grant_type': 'authorization_code'
  };

  var token_request_header = {
      'Content-Type': 'application/x-www-form-urlencoded'
  };

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

      // Store the token in memory instead of using cookies.
      storedAccessToken = accessToken;

      // Redirect back to the main WDC page.
      res.redirect('/wdc.html');
    } else {
      console.log("Token exchange error:", error);
      res.send("Error exchanging code for token.");
    }
  });
});

// 3) New Status Route: Report whether authentication has occurred.
app.get('/status', function(req, res) {
  if (storedAccessToken) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// 4) Data Proxy Route: Fetch data from RE NXT using the stored token.
app.get('/getConstituents', function(req, res) {
  if (!storedAccessToken) {
    return res.status(401).json({ error: "Not authenticated. Please authenticate first." });
  }

  // METHOD USING FETCH SOME CONSTITUENTS FUNCTION
  const startUrl = "https://api.sky.blackbaud.com/constituent/v1/constituents";
  const maxPages = 3;
  let allRecords = [];

  fetchSomeConstituents(startUrl, storedAccessToken, subscriptionKey, allRecords, 0, maxPages, function(err, results) {
    if (err) {
      console.error("Partial paging error:", err);
      return res.status(500).send("Error fetching partial data: " + err.message);
    }
    // Return partial data
    res.json({ value: results });
  });

  // METHOD USING FETCH ALL CONSTITUENTS FUNCTION
  // Start with offset=0 (or if not needed, just the base URL)
  // let startUrl = "https://api.sky.blackbaud.com/constituent/v1/constituents";

  // let allRecords = [];

  // fetchAllConstituents(startUrl, storedAccessToken, subscriptionKey, allRecords, function(err, results) {
  //   if (err) {
  //     console.error("Error paging constituents:", err);
  //     return res.status(500).send("Error paging constituents: " + err.message);
  //   }

  //   // Return the combined results in one JSON with "value" array
  //   console.log("Returning total records: ", results.length);
  //   res.json({
  //     value: results
  //   });
  // });
});

// 5) Paramaterized Data Route: Get parameterized API call data from frontend user input
app.get('/getBlackbaudData', (req, res) => {
  const endpoint = req.query.endpoint;
  const pageLimit = req.query.pageLimit;
});

// -------------------------------------------------- //
// Create and start our server
// -------------------------------------------------- //
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
