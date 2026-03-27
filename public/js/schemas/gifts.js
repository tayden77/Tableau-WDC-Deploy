/* exported GIFTS_COLS */
var GIFTS_COLS = (function () {
  var cols = [
    { id: 'id', dataType: 'string' },
    { id: 'amount_value', dataType: 'float' },
    { id: 'balance_value', dataType: 'float' },
    { id: 'batch_number', dataType: 'string' },
    { id: 'constituent_id', dataType: 'string' },
    { id: 'date', dataType: 'datetime' },
    { id: 'date_added', dataType: 'datetime' },
    { id: 'date_modified', dataType: 'datetime' },
    { id: 'gift_code', dataType: 'string' },
    { id: 'gift_status', dataType: 'string' },
    { id: 'is_anonymous', dataType: 'bool' },
    { id: 'gift_aid_qualification_status', dataType: 'string' },
    { id: 'constituency', dataType: 'string' },
    { id: 'lookup_id', dataType: 'string' },
    { id: 'post_date', dataType: 'datetime' },
    { id: 'post_status', dataType: 'string' },
    { id: 'reference', dataType: 'string' },
    { id: 'subtype', dataType: 'string' },
    { id: 'type', dataType: 'string' },
    { id: 'recurring_gift_status_day', dataType: 'int' },
    { id: 'recurring_gift_status_month', dataType: 'int' },
    { id: 'recurring_gift_status_year', dataType: 'int' },
    { id: 'acknowledgements', dataType: 'string' },
    { id: 'fundraisers', dataType: 'string' },
    { id: 'gift_splits', dataType: 'string' },
    { id: 'linked_gifts', dataType: 'string' },
    { id: 'payments', dataType: 'string' },
    { id: 'receipts', dataType: 'string' },
    { id: 'soft_credits', dataType: 'string' },
  ];
  var i;
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'acknowledgement_' + i + '_date', dataType: 'datetime' });
    cols.push({ id: 'acknowledgement_' + i + '_status', dataType: 'string' });
  }
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'fundraiser_' + i + '_constituent_id', dataType: 'string' });
    cols.push({ id: 'fundraiser_' + i + '_credit_amount', dataType: 'float' });
  }
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'gift_split_' + i + '_id', dataType: 'string' });
    cols.push({ id: 'gift_split_' + i + '_amount', dataType: 'float' });
    cols.push({ id: 'gift_split_' + i + '_appeal_id', dataType: 'string' });
    cols.push({ id: 'gift_split_' + i + '_campaign_id', dataType: 'string' });
    cols.push({ id: 'gift_split_' + i + '_fund_id', dataType: 'string' });
  }
  for (i = 1; i <= 10; i++) {
    cols.push({ id: 'linked_gift_' + i + '_id', dataType: 'string' });
  }
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'payment_' + i + '_method', dataType: 'string' });
  }
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'receipt_' + i + '_amount', dataType: 'float' });
    cols.push({ id: 'receipt_' + i + '_date', dataType: 'datetime' });
    cols.push({ id: 'receipt_' + i + '_number', dataType: 'float' });
    cols.push({ id: 'receipt_' + i + '_status', dataType: 'string' });
  }
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'soft_credit_' + i + '_id', dataType: 'string' });
    cols.push({ id: 'soft_credit_' + i + '_amount', dataType: 'float' });
    cols.push({ id: 'soft_credit_' + i + '_const_id', dataType: 'string' });
    cols.push({ id: 'soft_credit_' + i + '_gift_id', dataType: 'string' });
  }
  return cols;
})();
