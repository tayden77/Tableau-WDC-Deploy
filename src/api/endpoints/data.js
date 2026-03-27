'use strict';

const { Router } = require('express');
const { ENDPOINTS } = require('../../config/constants');
const { requireAuth } = require('../../auth/middleware');
const { fetchSingleRecord, fetchMultipleRecords } = require('../pagination');
const { buildListUrl } = require('../urlBuilder');
const log = require('../../util/logger');

const router = Router();

// All /getBlackbaudData requests require authentication
router.use('/getBlackbaudData', requireAuth);

router.get('/getBlackbaudData', async (req, res, next) => {
  try {
    const uid = req.uid;
    const endpoint = req.query.endpoint || 'constituents';
    const recordId = req.query.id;
    const maxPages = req.query.max_pages ?? req.query.maxPages;
    const parsedMaxPages = maxPages !== undefined ? parseInt(maxPages, 10) : Infinity;

    const epDef = ENDPOINTS[endpoint];
    if (!epDef) {
      return res.status(400).json({ error: `Unknown endpoint: ${endpoint}` });
    }

    log.info(`Data request: ${endpoint}`, { requestId: req.id, recordId, endpoint });

    // Single record by ID
    if (recordId) {
      const singleUrl = epDef.singleUrl(recordId);
      const data = await fetchSingleRecord(uid, singleUrl);
      return res.json({ value: [data] });
    }

    // List with pagination
    const url = buildListUrl(endpoint, req.query);
    log.debug(`Built URL for ${endpoint}`, { url: safeLogUrl(url) });
    const allRecords = await fetchMultipleRecords(uid, url, parsedMaxPages);
    return res.json({ value: allRecords });
  } catch (err) {
    next(err);
  }
});

function safeLogUrl(u) {
  try {
    const url = new URL(u);
    if (url.searchParams.has('continuation_token')) {
      url.searchParams.set('continuation_token', 'REDACTED');
    }
    return url.toString();
  } catch {
    return u;
  }
}

module.exports = router;
