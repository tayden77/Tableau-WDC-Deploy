'use strict';

const { Router } = require('express');
const fs = require('fs');
const os = require('os');
const { parse: parseCsv } = require('csv-parse/sync');

const config = require('../../config/env');
const { MAX_POLL_ATTEMPTS } = require('../../config/constants');
const { requireAuth } = require('../../auth/middleware');
const { httpRequestWithRetry } = require('../skyClient');
const { ensureValidToken, skyHeaders } = require('../pagination');
const { tmpPath, createTmpId, schedulePurge, validateId } = require('../../storage/tempFiles');
const sleep = require('../../util/sleep');
const log = require('../../util/logger');

const router = Router();

// All query routes require auth
router.use(['/bulk/query/init', '/bulk/query/chunk', '/bulk/query/purge'], requireAuth);

// Init: kick off async query, poll, download to temp CSV
router.get('/bulk/query/init', async (req, res, next) => {
  try {
    const uid = req.uid;
    const queryId = parseInt(req.query.query_id || req.query.queryId, 10);
    if (!queryId) return res.status(400).json({ error: 'Missing queryId' });

    const access = await ensureValidToken(uid);
    const startBody = {
      id: queryId,
      ux_mode: 'Asynchronous',
      output_format: 'Csv',
      formatting_mode: 'UI',
      sql_generation_mode: 'Query',
      use_static_query_id_set: false,
    };

    const start = await httpRequestWithRetry({
      method: 'POST',
      url: 'https://api.sky.blackbaud.com/query/queries/executebyid?product=RE&module=None',
      headers: { ...skyHeaders(access), 'Content-Type': 'application/json' },
      body: JSON.stringify(startBody),
    });

    const jobId = JSON.parse(start.body.toString('utf8')).id;
    log.info('Query job started', { jobId, queryId });

    // Poll with timeout
    let status;
    let attempts = 0;
    do {
      if (attempts >= MAX_POLL_ATTEMPTS) {
        return res.status(504).json({ error: 'Query job timed out' });
      }
      await sleep(15000);
      attempts += 1;

      const poll = await httpRequestWithRetry({
        method: 'GET',
        url: `https://api.sky.blackbaud.com/query/jobs/${jobId}?product=RE&module=None&include_read_url=OnceCompleted&content_disposition=Attachment`,
        headers: skyHeaders(access),
      });
      status = JSON.parse(poll.body.toString('utf8'));
      if (status.status === 'Failed') {
        return res.status(500).json({ error: 'Query job failed' });
      }
    } while (status.status !== 'Completed');

    // Download CSV to temp file
    const buf = (await httpRequestWithRetry({ method: 'GET', url: status.sas_uri })).body;
    const tmpId = createTmpId();
    const file = tmpPath('query', tmpId);
    fs.writeFileSync(file, buf);
    schedulePurge(file);

    // Count rows by scanning newlines (avoid full parse into memory)
    const csvText = buf.toString('utf8');
    const totalRows = csvText.split('\n').filter((line) => line.trim()).length - 1; // subtract header
    const header = parseCsv(csvText, { to_line: 1 })[0];

    res.json({ id: tmpId, rows: totalRows, columns: header });
  } catch (err) {
    next(err);
  }
});

// Chunk: stream a page from temp CSV
router.get('/bulk/query/chunk', (req, res, next) => {
  try {
    const { id, page = 0, chunkSize = 15000 } = req.query;
    validateId(id);
    const file = tmpPath('query', id);
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
router.delete('/bulk/query/purge', (req, res, next) => {
  try {
    const { id } = req.query;
    validateId(id);
    const file = tmpPath('query', id);
    fs.unlink(file, (e) => res.status(e ? 404 : 204).end());
  } catch (err) {
    next(err);
  }
});

module.exports = router;
