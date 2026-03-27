'use strict';

const { Router } = require('express');
const fs = require('fs');
const { stringify } = require('csv-stringify');

const config = require('../../config/env');
const { requireAuth } = require('../../auth/middleware');
const { httpRequestWithRetry } = require('../skyClient');
const { ensureValidToken, skyHeaders } = require('../pagination');
const { tmpPath, createTmpId, schedulePurge, validateId } = require('../../storage/tempFiles');
const log = require('../../util/logger');

const router = Router();

const ACTION_COLS = [
  'id', 'category', 'completed', 'completed_date', 'computed_status',
  'constituent_id', 'date', 'date_added', 'date_modified', 'description',
  'direction', 'end_time', 'location', 'outcome', 'opportunity_id',
  'priority', 'start_time', 'status', 'status_code', 'summary', 'type',
  'fundraisers',
];

// All bulk action routes require auth
router.use(['/bulk/actions', '/bulk/actions/chunk', '/bulk/actions/purge'], requireAuth);

// Fetch all actions, stream to temp CSV
router.get('/bulk/actions', async (req, res, next) => {
  const uid = req.uid;
  const LIMIT = 5000;
  let pageCount = 0;
  let total = 0;
  const startTs = Date.now();
  let nextUrl = `https://api.sky.blackbaud.com/constituent/v1/actions?limit=${LIMIT}`;
  const tmpId = createTmpId();
  const tmpFile = tmpPath('actions', tmpId);

  const out = stringify({ header: true, columns: ACTION_COLS });
  const dest = fs.createWriteStream(tmpFile);
  out.pipe(dest);

  try {
    while (nextUrl) {
      const access = await ensureValidToken(uid);
      pageCount += 1;

      log.info(`Bulk actions page #${pageCount}`, { elapsed: ((Date.now() - startTs) / 1000).toFixed(1) + 's' });

      const pageResp = await httpRequestWithRetry({
        method: 'GET',
        url: nextUrl,
        headers: skyHeaders(access),
      });
      const page = JSON.parse(pageResp.body.toString('utf8'));
      const received = page.value.length;

      page.value.forEach((row) => out.write(row));
      total += received;

      log.info(`Bulk actions page #${pageCount} received`, { received, total });
      nextUrl = page.next_link || null;
    }

    out.end();
    dest.on('close', () => {
      schedulePurge(tmpFile);
      res.json({ id: tmpId, rows: total });
    });
  } catch (err) {
    out.destroy();
    fs.unlink(tmpFile, () => {});
    next(err);
  }
});

// Stream chunks from temp CSV
router.get('/bulk/actions/chunk', (req, res, next) => {
  try {
    const { id, page = 0, chunkSize = 15000 } = req.query;
    validateId(id);
    const file = tmpPath('actions', id);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'File expired' });

    const start = Number(page) * Number(chunkSize);
    const end = start + Number(chunkSize);
    const rows = [];
    let i = -1;

    const parse = require('csv-parse');
    const parser = fs.createReadStream(file).pipe(parse({ columns: true }));

    parser.on('data', (row) => {
      i += 1;
      if (i < start) return;
      if (i >= end) {
        parser.destroy();
        return;
      }
      rows.push(row);
    });
    parser.on('end', () => res.json({ value: rows, page: Number(page), chunkSize: Number(chunkSize) }));
    parser.on('close', () => {
      if (!res.headersSent) res.json({ value: rows, page: Number(page), chunkSize: Number(chunkSize) });
    });
    parser.on('error', (err) => next(err));
  } catch (err) {
    next(err);
  }
});

// Purge temp file
router.delete('/bulk/actions/purge', (req, res, next) => {
  try {
    const { id } = req.query;
    validateId(id);
    const file = tmpPath('actions', id);
    fs.unlink(file, (e) => res.status(e ? 404 : 204).end());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
