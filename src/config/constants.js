'use strict';

const SKY_API_BASE = 'https://api.sky.blackbaud.com';
const OAUTH_BASE = 'https://oauth2.sky.blackbaud.com';

// Endpoint definitions: base URL + supported filters for each SKY API endpoint
const ENDPOINTS = {
  actions: {
    listUrl: `${SKY_API_BASE}/constituent/v1/actions`,
    singleUrl: id => `${SKY_API_BASE}/constituent/v1/actions/${id}`,
    filters: ['date_added', 'last_modified', 'status_code', 'list_id', 'continuation_token'],
    supportsCursor: true,
  },
  constituents: {
    listUrl: `${SKY_API_BASE}/constituent/v1/constituents`,
    singleUrl: id => `${SKY_API_BASE}/constituent/v1/constituents/${id}`,
    filters: ['include_inactive'],
    supportsCursor: false,
  },
  events: {
    listUrl: `${SKY_API_BASE}/event/v1/eventlist`,
    singleUrl: id => `${SKY_API_BASE}/event/v1/events/${id}`,
    filters: [
      'name', 'lookup_id', 'category', 'event_id', 'start_date_from', 'start_date_to',
      'date_added', 'last_modified', 'fields', 'sort', 'include_inactive', 'group',
    ],
    supportsCursor: true,
  },
  gifts: {
    listUrl: `${SKY_API_BASE}/gift/v1/gifts`,
    singleUrl: id => `${SKY_API_BASE}/gift/v1/gifts/${id}`,
    baseParams: { product: 'RE', module: 'None' },
    filters: [
      'date_added', 'last_modified', 'constituent_id', 'post_status', 'gift_type',
      'receipt_status', 'acknowledgement_status', 'campaign_id', 'fund_id', 'appeal_id',
      'start_gift_date', 'end_gift_date', 'start_gift_amount', 'end_gift_amount',
      'list_id', 'sort',
    ],
    supportsCursor: true,
    // gifts: if date_added or last_modified are set, omit offset paging
    skipOffsetWhenFiltered: ['date_added', 'last_modified'],
  },
  funds: {
    listUrl: `${SKY_API_BASE}/fundraising/v1/funds`,
    singleUrl: id => `${SKY_API_BASE}/fundraising/v1/funds/${id}`,
    filters: ['date_added', 'last_modified', 'include_inactive', 'fund_id'],
    supportsCursor: true,
  },
  campaigns: {
    listUrl: `${SKY_API_BASE}/fundraising/v1/campaigns`,
    singleUrl: id => `${SKY_API_BASE}/fundraising/v1/campaigns/${id}`,
    filters: ['date_added', 'last_modified', 'include_inactive'],
    supportsCursor: true,
  },
  appeals: {
    listUrl: `${SKY_API_BASE}/fundraising/v1/appeals`,
    singleUrl: id => `${SKY_API_BASE}/fundraising/v1/appeals/${id}`,
    filters: ['date_added', 'last_modified', 'include_inactive'],
    supportsCursor: true,
  },
  opportunities: {
    listUrl: `${SKY_API_BASE}/opportunity/v1/opportunities`,
    singleUrl: id => `${SKY_API_BASE}/opportunity/v1/opportunities/${id}`,
    filters: [
      'date_added', 'last_modified', 'include_inactive', 'search_text',
      'constituent_id', 'list_id',
    ],
    supportsCursor: true,
  },
};

const DEFAULT_LIMIT = 5000;
const DEFAULT_OFFSET = 0;
const MAX_LIMIT = 5000;
const MAX_POLL_ATTEMPTS = 40; // 40 * 15s = 10 min max poll time for query jobs

module.exports = {
  SKY_API_BASE,
  OAUTH_BASE,
  ENDPOINTS,
  DEFAULT_LIMIT,
  DEFAULT_OFFSET,
  MAX_LIMIT,
  MAX_POLL_ATTEMPTS,
};
