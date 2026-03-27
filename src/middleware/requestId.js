'use strict';

const { v4: uuidv4 } = require('uuid');

function requestId(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-Id', req.id);
  next();
}

module.exports = requestId;
