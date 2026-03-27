'use strict';

const log = require('../util/logger');

function errorHandler(err, req, res, _next) {
  const status = err.status || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  log.error(err.message, {
    status,
    requestId: req.id,
    stack: status >= 500 ? err.stack : undefined,
  });

  if (!res.headersSent) {
    res.status(status).json({ error: message });
  }
}

module.exports = errorHandler;
