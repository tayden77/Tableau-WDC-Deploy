'use strict';

const { ENDPOINTS, DEFAULT_LIMIT, DEFAULT_OFFSET } = require('../config/constants');

// Filter name mapping: query param names that differ from the canonical SKY API param names
const PARAM_ALIASES = {
  lookupId: 'lookup_id',
  dateAdded: 'date_added',
  lastModified: 'last_modified',
  includeInactive: 'include_inactive',
  searchText: 'search_text',
  sortToken: 'sort_token',
  listId: 'list_id',
  fundId: 'fund_id',
  eventId: 'event_id',
  constituentId: 'constituent_id',
  startDateFrom: 'start_date_from',
  startDateTo: 'start_date_to',
  statusCode: 'status_code',
  continuationToken: 'continuation_token',
  postStatus: 'post_status',
  giftType: 'gift_type',
  receiptStatus: 'receipt_status',
  acknowledgementStatus: 'acknowledgement_status',
  campaignId: 'campaign_id',
  appealId: 'appeal_id',
  startGiftDate: 'start_gift_date',
  endGiftDate: 'end_gift_date',
  startGiftAmount: 'start_gift_amount',
  endGiftAmount: 'end_gift_amount',
};

function normalizeParam(key) {
  return PARAM_ALIASES[key] || key;
}

function buildListUrl(endpointName, queryParams) {
  const epDef = ENDPOINTS[endpointName];
  if (!epDef) throw new Error(`Unknown endpoint: ${endpointName}`);

  const url = new URL(epDef.listUrl);

  // Base params (e.g., gifts always needs product=RE&module=None)
  if (epDef.baseParams) {
    for (const [k, v] of Object.entries(epDef.baseParams)) {
      url.searchParams.set(k, v);
    }
  }

  // Apply filters
  const allowedFilters = new Set(epDef.filters);
  for (const [key, value] of Object.entries(queryParams)) {
    if (value === null || value === undefined || value === '') continue;
    const normalized = normalizeParam(key);
    if (allowedFilters.has(normalized)) {
      url.searchParams.set(normalized, value);
    }
  }

  // Pagination: cursor (sort_token) vs offset
  const sortToken = queryParams.sort_token || queryParams.sortToken;
  const limit = Math.min(parseInt(queryParams.limit || DEFAULT_LIMIT, 10), 5000) || DEFAULT_LIMIT;

  if (sortToken && epDef.supportsCursor) {
    url.searchParams.set('sort_token', sortToken);
    url.searchParams.set('limit', limit);
  } else {
    // Check if offset paging should be skipped when certain filters are present
    const skipOffset = (epDef.skipOffsetWhenFiltered || []).some((f) => queryParams[f]);
    if (!skipOffset) {
      const offset = parseInt(queryParams.offset || DEFAULT_OFFSET, 10) || DEFAULT_OFFSET;
      url.searchParams.set('limit', limit);
      url.searchParams.set('offset', offset);
    }
  }

  return url.toString();
}

module.exports = { buildListUrl, normalizeParam };
