/**
 * Tableau WDC Client (wdc.js)
 * ------------------------------------------------
 * Runs in both:
 *  - Browser (interactive UI in wdc.html)
 *  - Tableau Desktop Web Data Connector sandbox
 *
 * Key concepts:
 *  - sid (session id): stable identifier pairing Desktop <-> external browser OAuth flow
 *  - tok (JWT): short-lived server-minted token for authenticated API calls
 *
 * Dependencies (loaded via <script> before this file):
 *  - tableauwdc-2.2.0.js (Tableau WDC SDK)
 *  - js/schemas/*.js (CONSTITUENTS_COLS, ACTIONS_COLS, etc.)
 *  - js/mappers.js (WDC_MAPPERS)
 */

/* global tableau, CONSTITUENTS_COLS, ACTIONS_COLS, GIFTS_COLS, OPPORTUNITIES_COLS,
          EVENTS_COLS, FUNDS_COLS, CAMPAIGNS_COLS, APPEALS_COLS, WDC_MAPPERS */

'use strict';

// ────────────────────────────────────────────
//  Global Bootstrap (sid + tok)
// ────────────────────────────────────────────

var API_BASE = '';
var SID_KEY = 'bb_sid';
var HAS_TABLEAU = typeof window !== 'undefined' && typeof window.tableau !== 'undefined';
var MAX_APPEND_ROWS = 10000;

var tok = new URLSearchParams(location.search).get('tok') || null;
var sid = sessionStorage.getItem(SID_KEY);

// If sid is in the URL, override everything
(function () {
  var urlSid = new URLSearchParams(location.search).get('sid');
  if (urlSid) {
    sid = urlSid;
    sessionStorage.setItem(SID_KEY, sid);
    var clean = new URLSearchParams(location.search);
    clean.delete('sid');
    history.replaceState(null, '', location.pathname + (clean.toString() ? '?' + clean : ''));
  }
  if (!sid) {
    sid = (crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
    sessionStorage.setItem(SID_KEY, sid);
  }
})();

// Bootstrap token from URL, sessionStorage, or Tableau
(function () {
  if (!tok) tok = sessionStorage.getItem('bb_jwt') || null;
  if (!tok && HAS_TABLEAU && tableau.password) tok = tableau.password;
  if (tok) {
    sessionStorage.setItem('bb_jwt', tok);
    if (location.search.includes('tok=')) {
      history.replaceState(null, '', location.pathname);
    }
  }
})();

// ────────────────────────────────────────────
//  Auth + HTTP helpers
// ────────────────────────────────────────────

function ensureCredentialsFromTableau() {
  if (!HAS_TABLEAU) return;
  try {
    if (!sid && tableau.username) { sid = tableau.username; sessionStorage.setItem(SID_KEY, sid); }
    if (!tok && tableau.password) { tok = tableau.password; sessionStorage.setItem('bb_jwt', tok); }
  } catch (e) { /* ignore */ }
}

function authedFetch(url, opts) {
  opts = opts || {};
  var headers = Object.assign({}, opts.headers || {});
  if (tok) headers.Authorization = 'Bearer ' + tok;
  var fullUrl = /^https?:\/\//.test(url) ? url : API_BASE + url;
  return fetch(fullUrl, Object.assign({ credentials: 'same-origin' }, opts, { headers: headers }));
}

function authedJson(url, opts) {
  return authedFetch(url, opts).then(function (r) {
    if (r.status === 401) {
      return refreshTok().then(function (ok) {
        if (ok) return authedFetch(url, opts);
        throw new Error('Authentication expired');
      }).then(function (r2) {
        if (!r2.ok) throw new Error(r2.status + ' ' + r2.statusText + ' @ ' + url);
        return r2.json();
      });
    }
    if (!r.ok) throw new Error(r.status + ' ' + r.statusText + ' @ ' + url);
    return r.json();
  });
}

function refreshTok() {
  if (!tok) return Promise.resolve(false);
  return authedFetch('/status?sid=' + encodeURIComponent(sid)).then(function (r) {
    return r.json();
  }).then(function (stat) {
    if (stat && stat.tok) {
      tok = stat.tok;
      sessionStorage.setItem('bb_jwt', tok);
      return true;
    }
    return false;
  }).catch(function () { return false; });
}

function checkAuth() {
  authedJson('/status?sid=' + encodeURIComponent(sid))
    .then(function (stat) {
      if (stat.tok) { tok = stat.tok; sessionStorage.setItem('bb_jwt', tok); }
      updateUI(!!stat.authenticated);
    })
    .catch(function () { updateUI(false); });
}

// ────────────────────────────────────────────
//  UI helpers (vanilla JS, no jQuery)
// ────────────────────────────────────────────

function $(sel) { return document.querySelector(sel); }
function $$(sel) { return document.querySelectorAll(sel); }

function updateUI(hasAuth) {
  $$('.notsignedin').forEach(function (el) { el.style.display = hasAuth ? 'none' : 'block'; });
  $$('.signedin').forEach(function (el) { el.style.display = hasAuth ? 'block' : 'none'; });
  $('#mainSection').style.display = hasAuth ? 'block' : 'none';

  var pill = $('#statusPill');
  if (pill) {
    pill.textContent = hasAuth ? 'Connected' : 'Disconnected';
    pill.classList.toggle('connected', hasAuth);
    pill.classList.toggle('disconnected', !hasAuth);
  }
}

function updateFilters() {
  var ep = $('#endpointSelect').value;
  $$('.filter-group').forEach(function (el) { el.style.display = 'none'; });
  var target = document.querySelector('.filter-group[data-endpoint="' + ep + '"]');
  if (target) target.style.display = 'block';
}

function val(id) {
  var el = document.getElementById(id);
  return el ? (el.type === 'checkbox' ? el.checked : el.value.trim()) : '';
}

// ────────────────────────────────────────────
//  URL builder (with encodeURIComponent)
// ────────────────────────────────────────────

function buildDataUrl(cfg) {
  var url = '/getBlackbaudData?endpoint=' + encodeURIComponent(cfg.endpoint);
  var params = [
    'recordId:id', 'queryId:query_id', 'limit:limit', 'offset:offset', 'maxPages:max_pages',
    'name:name', 'lookupId:lookup_id', 'dateAdded:date_added', 'lastModified:last_modified',
    'searchText:search_text', 'sortToken:sort_token', 'listId:list_id', 'fundId:fund_id',
    'eventId:event_id', 'constituentId:constituent_id', 'category:category',
    'startDateFrom:start_date_from', 'startDateTo:start_date_to', 'fields:fields',
    'sort:sort', 'group:group', 'statusCode:status_code', 'continuationToken:continuation_token',
    'postStatus:post_status', 'giftType:gift_type', 'receiptStatus:receipt_status',
    'acknowledgementStatus:acknowledgement_status', 'campaignId:campaign_id', 'appealId:appeal_id',
    'startGiftDate:start_gift_date', 'endGiftDate:end_gift_date',
    'startGiftAmount:start_gift_amount', 'endGiftAmount:end_gift_amount',
  ];
  params.forEach(function (p) {
    var parts = p.split(':');
    var cfgKey = parts[0], paramName = parts[1];
    if (cfg[cfgKey]) url += '&' + paramName + '=' + encodeURIComponent(cfg[cfgKey]);
  });
  if (cfg.includeInactive) url += '&include_inactive=true';
  return url;
}

// ────────────────────────────────────────────
//  buildCfgAndSubmit
// ────────────────────────────────────────────

function buildCfgAndSubmit() {
  var endpoint = val('endpointSelect');
  var cfg = {
    endpoint: endpoint,
    recordId: val('recordIdInput'),
    queryId: val('queryIdInput'),
    limit: val('limitInput'),
    offset: val('offsetInput'),
    maxPages: val('maxPagesInput'),
    chunkSize: val('chunkSizeInput'),
    fetchAll: val('fetchAllRecords'),
    name: val('nameInput'),
    lookupId: val('lookupIdInput'),
    dateAdded: val('dateAddedInput'),
    lastModified: val('lastModifiedInput'),
    includeInactive: val('includeInactive_' + endpoint),
    searchText: val('searchTextInput'),
    listId: val('listId_' + endpoint),
    fundId: val('fundIdInput'),
    eventId: val('eventIdInput'),
    constituentId: val('constituentIdInput'),
    category: val('categoryInput'),
    startDateFrom: val('startDateFromInput'),
    startDateTo: val('startDateToInput'),
    sort: val('sortInput'),
    group: val('groupInput'),
    statusCode: val('statusCodeInput'),
    postStatus: val('postStatusInput'),
    giftType: val('giftTypeInput'),
    receiptStatus: val('receiptStatusInput'),
    acknowledgementStatus: val('acknowledgementStatusInput'),
    campaignId: val('campaignIdInput'),
    appealId: val('appealIdInput'),
    startGiftDate: val('startGiftDateInput'),
    endGiftDate: val('endGiftDateInput'),
    startGiftAmount: val('startGiftAmountInput'),
    endGiftAmount: val('endGiftAmountInput'),
    sid: sid,
  };

  tableau.connectionData = JSON.stringify(cfg);
  tableau.username = sid;
  if (tok) tableau.password = tok;
  tableau.connectionName = 'Blackbaud RE NXT - ' + endpoint;
  tableau.submit();
}

// ────────────────────────────────────────────
//  Generic data fetcher (eliminates 7x copy-paste)
// ────────────────────────────────────────────

function fetchAndAppend(url, mapFn, table, doneCallback) {
  authedJson(url)
    .then(function (data) {
      var rows = data.value.map(mapFn);
      for (var i = 0; i < rows.length; i += MAX_APPEND_ROWS) {
        table.appendRows(rows.slice(i, i + MAX_APPEND_ROWS));
      }
      doneCallback();
    })
    .catch(function (e) { tableau.abortWithError(String(e)); });
}

function fetchBulkChunked(initUrl, chunkUrl, purgeUrl, mapFn, chunkSize, table, doneCallback) {
  var page = 0;
  var bulkId;

  authedFetch(initUrl)
    .then(function (r) {
      if (!r.ok) throw new Error('Bulk init failed: ' + r.statusText);
      return r.json();
    })
    .then(function (init) {
      bulkId = init.id;
      fetchChunk();
    })
    .catch(function (e) { tableau.abortWithError('Bulk init failed: ' + e); });

  function fetchChunk() {
    authedFetch(chunkUrl + '?id=' + bulkId + '&page=' + page + '&chunkSize=' + chunkSize)
      .then(function (r) { return r.json(); })
      .then(function (obj) {
        if (!obj.value.length) return doneCallback();
        table.appendRows(obj.value.map(mapFn));
        if (obj.value.length === chunkSize) { page += 1; fetchChunk(); }
        else { authedFetch(purgeUrl + '?id=' + bulkId, { method: 'DELETE' }).finally(doneCallback); }
      })
      .catch(function (e) { tableau.abortWithError('Chunk fetch failed: ' + e); });
  }
}

// ────────────────────────────────────────────
//  DOM-Ready (browser only)
// ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  ensureCredentialsFromTableau();

  if (HAS_TABLEAU && typeof tableau.init === 'function') {
    try { tableau.init(); } catch (e) { console.warn('tableau.init failed', e); }
  }

  checkAuth();

  $('#endpointSelect').addEventListener('change', updateFilters);

  document.getElementById('queryIdInput').addEventListener('blur', function () {
    if (this.value.trim()) document.getElementById('endpointSelect').value = 'query';
  });

  updateFilters();

  $('#connectLink').addEventListener('click', function (e) {
    e.preventDefault();
    var abs = new URL('/auth?sid=' + encodeURIComponent(sid), location.origin).toString();
    window.location.assign(abs);
  });

  $('#getDataButton').addEventListener('click', buildCfgAndSubmit);
});

// ────────────────────────────────────────────
//  Tableau Connector (Schema + Data)
// ────────────────────────────────────────────

if (HAS_TABLEAU) {
  var myConnector = tableau.makeConnector();

  // Schema registry: maps endpoint name -> { cols, alias }
  var SCHEMA_REGISTRY = {
    constituents: { cols: CONSTITUENTS_COLS, alias: "Raiser's Edge NXT Constituents" },
    actions:      { cols: ACTIONS_COLS,      alias: "Raiser's Edge NXT Actions" },
    gifts:        { cols: GIFTS_COLS,        alias: "Raiser's Edge NXT Gifts" },
    opportunities:{ cols: OPPORTUNITIES_COLS,alias: "Raiser's Edge NXT Opportunities" },
    events:       { cols: EVENTS_COLS,       alias: "Raiser's Edge NXT Events" },
    funds:        { cols: FUNDS_COLS,        alias: "Raiser's Edge NXT Funds" },
    campaigns:    { cols: CAMPAIGNS_COLS,    alias: "Raiser's Edge NXT Campaigns" },
    appeals:      { cols: APPEALS_COLS,      alias: "Raiser's Edge NXT Appeals" },
  };

  myConnector.getSchema = function (schemaCallback) {
    ensureCredentialsFromTableau();
    var cfg = JSON.parse(tableau.connectionData);

    // Dynamic query: fetch schema from server
    if (cfg.endpoint === 'query') {
      authedJson('/getBlackbaudData?endpoint=query&query_id=' + cfg.queryId + '&schemaOnly=1')
        .then(function (headerArr) {
          var queryCols = headerArr.map(function (h) {
            return { id: h.replace(/\W+/g, '_'), alias: h, dataType: 'string' };
          });
          schemaCallback([{ id: 'query', alias: 'Dynamic Query', columns: queryCols }]);
        })
        .catch(function (e) { tableau.abortWithError('Schema discovery failed: ' + e); });
      return;
    }

    // Static endpoints
    var entry = SCHEMA_REGISTRY[cfg.endpoint];
    if (!entry) { tableau.abortWithError('Unsupported endpoint: ' + cfg.endpoint); return; }

    // Resolve dataType strings to tableau enums
    var columns = entry.cols.map(function (c) {
      return { id: c.id, alias: c.alias, dataType: tableau.dataTypeEnum[c.dataType] };
    });
    schemaCallback([{ id: cfg.endpoint, alias: entry.alias, columns: columns }]);
  };

  myConnector.getData = function (table, doneCallback) {
    ensureCredentialsFromTableau();

    // Skip heavy work during interactive phase
    if (tableau.phase === tableau.phaseEnum.interactivePhase) { doneCallback(); return; }

    var cfg = JSON.parse(tableau.connectionData);
    var tableId = table.tableInfo.id;
    var url = buildDataUrl(cfg);
    var mapFn = WDC_MAPPERS[tableId];
    var CHUNK = parseInt(cfg.chunkSize || '15000', 10);

    // Dynamic query: bulk chunked
    if (tableId === 'query') {
      var initUrl = '/bulk/query/init?query_id=' + encodeURIComponent(cfg.queryId);
      fetchBulkChunked(initUrl, '/bulk/query/chunk', '/bulk/query/purge',
        function (rowObj) {
          var out = {};
          table.tableInfo.columns.forEach(function (col) {
            out[col.id] = rowObj[col.alias || col.id] || rowObj[col.id] || null;
          });
          return out;
        }, CHUNK, table, doneCallback);
      return;
    }

    // Actions: supports bulk fetch-all mode
    if (tableId === 'actions' && cfg.fetchAll) {
      fetchBulkChunked('/bulk/actions?chunkSize=' + CHUNK, '/bulk/actions/chunk', '/bulk/actions/purge',
        mapFn, CHUNK, table, doneCallback);
      return;
    }

    // All other endpoints: single fetch + map
    if (mapFn) {
      fetchAndAppend(url, mapFn, table, doneCallback);
      return;
    }

    tableau.abortWithError('No mapper for table: ' + tableId);
  };

  tableau.registerConnector(myConnector);
}
