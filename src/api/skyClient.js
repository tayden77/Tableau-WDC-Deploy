'use strict';

const { request: undiciRequest } = require('undici');
const config = require('../config/env');
const sleep = require('../util/sleep');

async function undiciRequestPromise(opts) {
  const { method = 'GET', url, headers = {}, body, form, timeout } = opts;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout ?? config.HTTP_TIMEOUT_MS);

  try {
    const res = await undiciRequest(url, {
      method,
      headers,
      body: form ? new URLSearchParams(form).toString() : body,
      signal: controller.signal,
    });
    const ab = await res.body.arrayBuffer();
    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: Buffer.from(ab),
    };
  } finally {
    clearTimeout(t);
  }
}

async function httpRequestWithRetry(
  opts,
  { maxRetries = 5, baseDelayMs = 500, requestTimeoutMs = config.HTTP_TIMEOUT_MS, maxTotalWaitMs = config.HTTP_MAX_WAIT_MS } = {}
) {
  const start = Date.now();
  let attempt = 0;

  while (true) {
    let resp;
    try {
      resp = await undiciRequestPromise({ timeout: opts.timeout ?? requestTimeoutMs, ...opts });
    } catch (err) {
      const retryableNet = ['ETIMEDOUT', 'ESOCKETTIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EAI_AGAIN', 'ENOTFOUND', 'EHOSTUNREACH', 'EPIPE'].includes(err.code);
      if (!retryableNet || attempt >= maxRetries) throw err;
      const backoff = baseDelayMs * Math.pow(2, attempt);
      if (Date.now() - start + backoff > maxTotalWaitMs) throw err;
      await sleep(backoff);
      attempt += 1;
      continue;
    }

    if (resp.statusCode < 400) return resp;

    const retryable = resp.statusCode === 429 || resp.statusCode >= 500;
    if (!retryable || attempt >= maxRetries) return resp;

    const retryAfter = Number(resp.headers?.['retry-after'] || 0);
    const backoff = retryAfter > 0 ? retryAfter * 1000 : baseDelayMs * Math.pow(2, attempt);
    if (Date.now() - start + backoff > maxTotalWaitMs) return resp;
    await sleep(backoff);
    attempt += 1;
  }
}

module.exports = { undiciRequestPromise, httpRequestWithRetry };
