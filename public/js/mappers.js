/**
 * Mapper functions: transform SKY API JSON objects into flat rows for Tableau.
 * Each mapper corresponds to a Tableau table schema.
 */
/* exported WDC_MAPPERS */
var WDC_MAPPERS = (function () {
  'use strict';

  function safeDate(val) {
    if (!val) return null;
    var d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }

  function flattenArray(arr, max, fieldsFn) {
    var out = {};
    var list = arr || [];
    for (var i = 0; i < max; i++) {
      var item = list[i] || null;
      var fields = fieldsFn(i + 1, item);
      for (var k in fields) out[k] = fields[k];
    }
    return out;
  }

  function mapConstituents(item) {
    var addr = item.address || {};
    var email = item.email || {};
    var phone = item.phone || {};
    var op = item.online_presence || {};
    var spouse = item.spouse || {};
    return {
      id: item.id,
      address: JSON.stringify(item.address || {}),
      address_id: addr.id || null,
      address_lines: addr.address_lines || null,
      city: addr.city || null,
      addr_const_id: addr.constituent_id || null,
      country: addr.country || null,
      county: addr.county || null,
      do_not_mail: addr.do_not_mail || null,
      formatted_address: addr.formatted_address || null,
      postal_code: addr.postal_code || null,
      preferred: addr.preferred || null,
      state: addr.state || null,
      address_type: addr.type || null,
      age: item.age,
      birth_day: item.birthdate ? item.birthdate.d : null,
      birth_month: item.birthdate ? item.birthdate.m : null,
      birth_year: item.birthdate ? item.birthdate.y : null,
      date_added: safeDate(item.date_added),
      date_modified: safeDate(item.date_modified),
      deceased: item.deceased,
      deceased_date_day: item.deceased_date ? item.deceased_date.d : null,
      deceased_date_month: item.deceased_date ? item.deceased_date.m : null,
      deceased_date_year: item.deceased_date ? item.deceased_date.y : null,
      email: JSON.stringify(item.email || {}),
      email_id: email.id || null,
      email_address: email.address || null,
      do_not_email: email.do_not_email || null,
      email_inactive: email.inactive || null,
      email_primary: email.primary || null,
      email_type: email.type || null,
      first: item.first,
      former_name: item.former_name,
      fundraiser_status: item.fundraiser_status,
      gender: item.gender,
      gives_anonymously: item.gives_anonymously,
      inactive: item.inactive,
      last: item.last,
      lookup_id: item.lookup_id,
      marital_status: item.marital_status,
      middle: item.middle,
      name: item.name,
      online_presence: JSON.stringify(item.online_presence || {}),
      online_presence_id: op.id || null,
      online_presence_address: op.address || null,
      online_presence_inactive: op.inactive || null,
      online_presence_primary: op.primary || null,
      online_presence_type: op.type || null,
      phone: JSON.stringify(item.phone || {}),
      phone_id: phone.id || null,
      do_not_call: phone.do_not_call || null,
      phone_inactive: phone.inactive || null,
      phone_number: phone.number || null,
      phone_primary: phone.primary || null,
      phone_type: phone.type || null,
      preferred_name: item.preferred_name,
      spouse: JSON.stringify(item.spouse || {}),
      spouse_id: spouse.id || null,
      spouse_first: spouse.first || null,
      spouse_last: spouse.last || null,
      spouse_hoh: spouse.is_head_of_household || null,
      suffix: item.suffix,
      suffix_2: item.suffix_2,
      title: item.title,
      title_2: item.title_2,
      type: item.type,
      birthplace: item.birthplace,
      ethnicity: item.ethnicity,
      income: item.income,
      religion: item.religion,
      industry: item.industry,
      matches_gifts: item.matches_gifts,
      matching_gift_per_gift_min: (item.matching_gift_per_gift_min || {}).value || null,
      matching_gift_per_gift_max: (item.matching_gift_per_gift_max || {}).value || null,
      matching_gift_total_min: (item.matching_gift_total_min || {}).value || null,
      matching_gift_total_max: (item.matching_gift_total_max || {}).value || null,
      matching_gift_factor: item.matching_gift_factor,
      matching_gift_notes: item.matching_gift_notes,
      num_employees: item.num_employees,
      is_memorial: item.is_memorial,
      is_solicitor: item.is_solicitor,
      no_valid_address: item.no_valid_address,
      receipt_type: item.receipt_type,
      target: item.target,
      requests_no_email: item.requests_no_email,
      import_id: item.import_id,
      is_constituent: item.is_constituent,
      num_subsidiaries: item.num_subsidiaries,
      parent_corporation_name: item.parent_corporation_name,
      parent_corporation_id: item.parent_corporation_id,
    };
  }

  function mapActions(item) {
    return {
      id: item.id,
      category: item.category,
      completed: item.completed,
      completed_date: safeDate(item.completed_date),
      computed_status: item.computed_status,
      constituent_id: item.constituent_id,
      date: safeDate(item.date),
      date_added: safeDate(item.date_added),
      date_modified: safeDate(item.date_modified),
      description: item.description,
      direction: item.direction,
      end_time: item.end_time,
      location: item.location,
      outcome: item.outcome,
      opportunity_id: item.opportunity_id,
      priority: item.priority,
      start_time: item.start_time,
      status: item.status,
      status_code: item.status_code,
      summary: item.summary,
      type: item.type,
      fundraisers: JSON.stringify(item.fundraisers || []),
    };
  }

  function mapGifts(item) {
    var out = {
      id: item.id,
      amount_value: (item.amount || {}).value || 0,
      balance_value: (item.balance || {}).value || 0,
      batch_number: item.batch_number,
      constituent_id: item.constituent_id,
      date: safeDate(item.date),
      date_added: safeDate(item.date_added),
      date_modified: safeDate(item.date_modified),
      gift_code: item.gift_code,
      gift_status: item.gift_status,
      is_anonymous: item.is_anonymous,
      gift_aid_qualification_status: item.gift_aid_qualification_status,
      constituency: item.constituency,
      lookup_id: item.lookup_id,
      post_date: safeDate(item.post_date),
      post_status: item.post_status,
      subtype: item.subtype,
      type: item.type,
      reference: item.reference,
      recurring_gift_status_day: item.recurring_gift_status_date ? item.recurring_gift_status_date.d : null,
      recurring_gift_status_month: item.recurring_gift_status_date ? item.recurring_gift_status_date.m : null,
      recurring_gift_status_year: item.recurring_gift_status_date ? item.recurring_gift_status_date.y : null,
      acknowledgements: JSON.stringify(item.acknowledgements || []),
      fundraisers: JSON.stringify(item.fundraisers || []),
      gift_splits: JSON.stringify(item.gift_splits || []),
      linked_gifts: JSON.stringify(item.linked_gifts || []),
      payments: JSON.stringify(item.payments || []),
      receipts: JSON.stringify(item.receipts || []),
      soft_credits: JSON.stringify(item.soft_credits || []),
    };

    Object.assign(out, flattenArray(item.acknowledgements, 5, function (n, a) {
      var o = {}; o['acknowledgement_' + n + '_date'] = a ? safeDate(a.date) : null;
      o['acknowledgement_' + n + '_status'] = a ? (a.status || null) : null; return o;
    }));
    Object.assign(out, flattenArray(item.fundraisers, 5, function (n, f) {
      var o = {}; o['fundraiser_' + n + '_constituent_id'] = f ? (f.constituent_id || null) : null;
      o['fundraiser_' + n + '_credit_amount'] = f ? ((f.amount || {}).value || null) : null; return o;
    }));
    Object.assign(out, flattenArray(item.gift_splits, 5, function (n, s) {
      var o = {}; o['gift_split_' + n + '_id'] = s ? (s.id || null) : null;
      o['gift_split_' + n + '_amount'] = s ? ((s.amount || {}).value || null) : null;
      o['gift_split_' + n + '_appeal_id'] = s ? (s.appeal_id || null) : null;
      o['gift_split_' + n + '_campaign_id'] = s ? (s.campaign_id || null) : null;
      o['gift_split_' + n + '_fund_id'] = s ? (s.fund_id || null) : null; return o;
    }));
    Object.assign(out, flattenArray(item.linked_gifts, 10, function (n, g) {
      var o = {}; o['linked_gift_' + n + '_id'] = g || null; return o;
    }));
    Object.assign(out, flattenArray(item.payments, 5, function (n, p) {
      var o = {}; o['payment_' + n + '_method'] = p ? (p.payment_method || null) : null; return o;
    }));
    Object.assign(out, flattenArray(item.receipts, 5, function (n, r) {
      var o = {}; o['receipt_' + n + '_amount'] = r ? ((r.amount || {}).value || null) : null;
      o['receipt_' + n + '_date'] = r ? safeDate(r.date) : null;
      o['receipt_' + n + '_number'] = r ? (r.number || null) : null;
      o['receipt_' + n + '_status'] = r ? (r.status || null) : null; return o;
    }));
    Object.assign(out, flattenArray(item.soft_credits, 5, function (n, sc) {
      var o = {}; o['soft_credit_' + n + '_id'] = sc ? (sc.id || null) : null;
      o['soft_credit_' + n + '_amount'] = sc ? ((sc.amount || {}).value || null) : null;
      o['soft_credit_' + n + '_const_id'] = sc ? (sc.constituent_id || null) : null;
      o['soft_credit_' + n + '_gift_id'] = sc ? (sc.gift_id || null) : null; return o;
    }));

    return out;
  }

  function mapOpportunities(item) {
    var out = {
      id: item.id,
      ask_amount: item.ask_amount ? item.ask_amount.value : 0,
      ask_date: safeDate(item.ask_date),
      campaign_id: item.campaign_id,
      constituent_id: item.constituent_id,
      date_added: safeDate(item.date_added),
      date_modified: safeDate(item.date_modified),
      deadline: item.deadline,
      expected_amount: item.expected_amount ? item.expected_amount.value : 0,
      expected_date: safeDate(item.expected_date),
      funded_amount: item.funded_amount ? item.funded_amount.value : 0,
      funded_date: safeDate(item.funded_date),
      fund_id: item.fund_id,
      inactive: item.inactive,
      name: item.name,
      purpose: item.purpose,
      status: item.status,
      opportunity_likelihood_name: item.opportunity_likelihood_name,
      opportunity_likelihood_id: item.opportunity_likelihood_id,
      fundraisers: JSON.stringify(item.fundraisers || []),
      linked_gifts: JSON.stringify(item.linked_gifts || []),
    };

    Object.assign(out, flattenArray(item.fundraisers, 5, function (n, f) {
      var o = {}; o['fundraiser_' + n + '_constituent_id'] = f ? f.constituent_id : null;
      o['fundraiser_' + n + '_credit_amount'] = f ? ((f.credit_amount || {}).value || null) : null; return o;
    }));
    Object.assign(out, flattenArray(item.linked_gifts, 10, function (n, g) {
      var o = {}; o['linked_gift_' + n] = g || null; return o;
    }));

    return out;
  }

  function mapEvents(item) {
    return {
      id: item.id, lookup_id: item.lookup_id, name: item.name,
      start_date: safeDate(item.start_date), start_time: item.start_time,
      end_date: safeDate(item.end_date), end_time: item.end_time,
      attending_count: item.attending_count, invited_count: item.invited_count,
      revenue: item.revenue, goal: item.goal, percent_of_goal: item.percent_of_goal,
      date_added: safeDate(item.date_added), date_modified: safeDate(item.date_modified),
      capacity: item.capacity, inactive: item.inactive, attended_count: item.attended_count,
      category_id: item.category ? item.category.id : null,
      category_name: item.category ? item.category.name : null,
      category_inactive: item.category ? item.category.inactive : false,
      group_id: item.group ? item.group.id : null,
      group_name: item.group ? item.group.name : null,
      group_inactive: item.group ? item.group.is_inactive : false,
      expenses: item.expenses, net: item.net,
      location_name: item.location_name, payments_balance: item.payments_balance,
    };
  }

  function mapSimple(item) {
    return {
      id: item.id, category: item.category,
      date_added: safeDate(item.date_added), date_modified: safeDate(item.date_modified),
      description: item.description, end_date: safeDate(item.end_date),
      goal: item.goal ? item.goal.value : null, inactive: item.inactive,
      lookup_id: item.lookup_id, start_date: safeDate(item.start_date),
      type: item.type,
    };
  }

  return {
    constituents: mapConstituents,
    actions: mapActions,
    gifts: mapGifts,
    opportunities: mapOpportunities,
    events: mapEvents,
    funds: mapSimple,
    campaigns: mapSimple,
    appeals: mapSimple,
  };
})();
