'use strict';

const config = require('../config/env');
const { httpRequestWithRetry } = require('./skyClient');
const { getTokens, setTokens, withRefreshLock } = require('../storage/tokens');
const log = require('../util/logger');

async function ensureValidToken(uid) {
  const tok = await getTokens(uid);
  if (!tok) throw Object.assign(new Error('Not authenticated'), { status: 401 });

  if (Date.now() >= tok.exp - 60_000) {
    return await withRefreshLock(uid, async () => {
      const curr = await getTokens(uid);
      if (curr && curr.exp > Date.now() + 60_000) return curr.access;

      const resp = await httpRequestWithRetry({
        method: 'POST',
        url: 'https://oauth2.sky.blackbaud.com/token',
        form: {
          grant_type: 'refresh_token',
          refresh_token: tok.refresh,
          client_id: config.CLIENT_ID,
          client_secret: config.CLIENT_SECRET,
        },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (resp.statusCode !== 200) {
        throw new Error(`Failed to refresh token: ${resp.statusCode}`);
      }
      const body = JSON.parse(resp.body.toString('utf8'));
      await setTokens(uid, {
        access: body.access_token,
        refresh: body.refresh_token || tok.refresh,
        exp: Date.now() + body.expires_in * 1000,
      });
      return body.access_token;
    });
  }

  return tok.access;
}

function skyHeaders(access) {
  return {
    Authorization: `Bearer ${access}`,
    'Bb-Api-Subscription-Key': config.SUBSCRIPTION_KEY,
  };
}

async function fetchSingleRecord(uid, url) {
  const access = await ensureValidToken(uid);
  const resp = await httpRequestWithRetry({
    method: 'GET',
    url,
    headers: skyHeaders(access),
  });

  if (resp.statusCode !== 200) {
    throw new Error(`SKY API ${resp.statusCode}: ${resp.body.toString('utf8').slice(0, 200)}`);
  }

  return JSON.parse(resp.body.toString('utf8'));
}

async function fetchMultipleRecords(uid, startUrl, maxPages = Infinity) {
  const allItems = [];
  let url = startUrl;
  let pages = 0;

  while (url && pages < maxPages) {
    const access = await ensureValidToken(uid);
    const resp = await httpRequestWithRetry({
      method: 'GET',
      url,
      headers: skyHeaders(access),
    });

    if (resp.statusCode !== 200) {
      throw new Error(`SKY API ${resp.statusCode}: ${resp.body.toString('utf8').slice(0, 200)}`);
    }

    const data = JSON.parse(resp.body.toString('utf8'));
    if (pages === 0) log.debug('First page rows', { count: data.value?.length || 0 });

    if (Array.isArray(data.value) && data.value.length) {
      allItems.push(...data.value);
    }

    if (data.next_link && data.next_link !== url && (data.value?.length || 0) > 0) {
      log.debug(`Fetched page ${pages + 1}`);
      url = data.next_link;
      pages += 1;
      continue;
    }
    log.debug(`Fetched page ${pages + 1} (final)`);
    break;
  }
  return allItems;
}

module.exports = { ensureValidToken, fetchSingleRecord, fetchMultipleRecords, skyHeaders };
