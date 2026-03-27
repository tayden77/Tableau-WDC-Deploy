/* exported OPPORTUNITIES_COLS */
var OPPORTUNITIES_COLS = (function () {
  var cols = [
    { id: 'id', dataType: 'string' },
    { id: 'ask_amount', dataType: 'float' },
    { id: 'ask_date', dataType: 'datetime' },
    { id: 'campaign_id', dataType: 'string' },
    { id: 'constituent_id', dataType: 'string' },
    { id: 'date_added', dataType: 'datetime' },
    { id: 'date_modified', dataType: 'datetime' },
    { id: 'deadline', dataType: 'datetime' },
    { id: 'expected_amount', dataType: 'float' },
    { id: 'expected_date', dataType: 'datetime' },
    { id: 'funded_amount', dataType: 'float' },
    { id: 'funded_date', dataType: 'datetime' },
    { id: 'fundraisers', dataType: 'string' },
  ];
  var i;
  for (i = 1; i <= 5; i++) {
    cols.push({ id: 'fundraiser_' + i + '_constituent_id', dataType: 'string' });
    cols.push({ id: 'fundraiser_' + i + '_credit_amount', dataType: 'float' });
  }
  cols.push(
    { id: 'fund_id', dataType: 'string' },
    { id: 'inactive', dataType: 'bool' },
    { id: 'linked_gifts', dataType: 'string' }
  );
  for (i = 1; i <= 10; i++) {
    cols.push({ id: 'linked_gift_' + i, dataType: 'string' });
  }
  cols.push(
    { id: 'name', dataType: 'string' },
    { id: 'purpose', dataType: 'string' },
    { id: 'status', dataType: 'string' },
    { id: 'opportunity_likelihood_name', dataType: 'string' },
    { id: 'opportunity_likelihood_id', dataType: 'string' }
  );
  return cols;
})();
