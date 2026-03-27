// Funds, Campaigns, and Appeals share the same schema shape
/* exported FUNDS_COLS, CAMPAIGNS_COLS, APPEALS_COLS */
var FUNDS_COLS = [
  { id: 'id', dataType: 'string' },
  { id: 'category', dataType: 'string' },
  { id: 'date_added', dataType: 'datetime' },
  { id: 'date_modified', dataType: 'datetime' },
  { id: 'description', dataType: 'string' },
  { id: 'end_date', dataType: 'datetime' },
  { id: 'goal', dataType: 'float' },
  { id: 'inactive', dataType: 'bool' },
  { id: 'lookup_id', dataType: 'string' },
  { id: 'start_date', dataType: 'datetime' },
  { id: 'type', dataType: 'string' },
];

var CAMPAIGNS_COLS = [
  { id: 'id', dataType: 'string' },
  { id: 'category', dataType: 'string' },
  { id: 'date_added', dataType: 'datetime' },
  { id: 'date_modified', dataType: 'datetime' },
  { id: 'description', dataType: 'string' },
  { id: 'end_date', dataType: 'datetime' },
  { id: 'goal', dataType: 'float' },
  { id: 'inactive', dataType: 'bool' },
  { id: 'lookup_id', dataType: 'string' },
  { id: 'start_date', dataType: 'datetime' },
];

var APPEALS_COLS = [
  { id: 'id', dataType: 'string' },
  { id: 'category', dataType: 'string' },
  { id: 'date_added', dataType: 'datetime' },
  { id: 'date_modified', dataType: 'datetime' },
  { id: 'description', dataType: 'string' },
  { id: 'end_date', dataType: 'datetime' },
  { id: 'goal', dataType: 'float' },
  { id: 'inactive', dataType: 'bool' },
  { id: 'lookup_id', dataType: 'string' },
  { id: 'start_date', dataType: 'datetime' },
];
