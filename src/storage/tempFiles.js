'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');
const log = require('../util/logger');

const UUID_RE = /^[a-f0-9-]{36}$/i;

function validateId(id) {
  if (!id || !UUID_RE.test(id)) {
    const err = new Error('Invalid temp file id');
    err.status = 400;
    throw err;
  }
  return id;
}

function tmpPath(prefix, id) {
  return path.join(os.tmpdir(), `${prefix}_${validateId(id)}.csv`);
}

function createTmpId() {
  return uuidv4();
}

function schedulePurge(filePath) {
  setTimeout(() => fs.unlink(filePath, () => {}), config.TMP_FILE_TTL_MS);
}

async function cleanupOrphans() {
  const dir = os.tmpdir();
  const patterns = [/^query_[a-f0-9-]+\.csv$/i, /^actions_[a-f0-9-]+\.csv$/i];
  try {
    const now = Date.now();
    const files = await fs.promises.readdir(dir);
    await Promise.all(
      files
        .filter((fn) => patterns.some((re) => re.test(fn)))
        .map(async (fn) => {
          const full = path.join(dir, fn);
          try {
            const st = await fs.promises.stat(full);
            if (now - st.mtimeMs > config.TMP_FILE_TTL_MS) {
              await fs.promises.unlink(full);
              log.info(`Purged orphan tmp: ${fn}`);
            }
          } catch (e) {
            log.warn(`Tmp cleanup error (${fn})`, { error: e.message });
          }
        })
    );
  } catch (e) {
    log.warn('Tmp cleanup skipped', { error: e.message });
  }
}

module.exports = { tmpPath, createTmpId, schedulePurge, cleanupOrphans, validateId };
