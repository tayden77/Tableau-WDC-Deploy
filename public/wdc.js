  // UI update
  function updateUIWithAuthState(hasAuth) {
    if (hasAuth) {
      $(".notsignedin").hide();
      $(".signedin").show();

      // Hide the connect button
      $("#connectButton").hide();

      // Authenticated... Show the Main Section
      $("#mainSection").show();
    } else {
      $(".notsignedin").show();
      $(".signedin").hide();

      // Show the connect button
      $("#connectButton").show();

      // Not Authenticated... Hide the Main Section
      $("#mainSection").hide();
    }
  }

// Unused now - Replaced
// (function () {
//   const fragmentParams = new URLSearchParams(window.location.hash.slice(1));
//   const accessToken = fragmentParams.get('access_token');

//   if (accessToken) {
//     sessionStorage.setItem('access_token', accessToken);
//   }

//   window.history.replaceState(null, '', window.location.pathname);

//   // Use the stored token if available
//   const token = sessionStorage.getItem('access_token');
//   updateUIWithAuthState(!!token);

//   // Replace the stored token if available
//   if (token) {
//     tableau.connectionData = JSON.stringify({ accessToken: token });
//   }

//   tableau.connectionName = "RE NXT Data"; // Give the data source a name
// })();

function mapConstituents(item) {
  return {
    id: item.id,
    address: JSON.stringify(item.address || {}),
    address_id: item.address ? item.address.id : null,
    address_lines: item.address ? item.address.address_lines : null,
    city: item.address ? item.address.city : null,
    addr_const_id: item.address ? item.address.constituent_id : null, // likely unnecessary
    country: item.address ? item.address.country : null,
    county: item.address ? item.address.county : null,
    do_not_mail: item.address ? item.address.do_not_mail : null,
    formatted_address: item.address ? item.address.formatted_address : null,
    postal_code: item.address ? item.address.postal_code : null,
    preferred: item.address ? item.address.preferred : null,
    state: item.address ? item.address.state : null,
    address_type: item.address ? item.address.type : null,
    age: item.age,
    birth_day: item.birthdate ? item.birthdate.d : null,
    birth_month: item.birthdate ? item.birthdate.m : null,
    birth_year: item.birthdate ? item.birthdate.y : null,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    deceased: item.deceased,
    deceased_date_day: item.deceased_date ? item.deceased_date.d : null,
    deceased_date_month: item.deceased_date ? item.deceased_date.m : null,
    deceased_date_year: item.deceased_date ? item.deceased_date.y : null,
    email: JSON.stringify(item.email || {}),
    email_id: item.email ? item.email.id : null,
    email_address: item.email ? item.email.address : null,
    do_not_email: item.email ? item.email.do_not_email : null,
    email_inactive: item.email ? item.email.inactive : null,
    email_primary: item.email ? item.email.primary : null,
    email_type: item.email ? item.email.type : null,
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
    online_presence_id: item.online_presence ? item.online_presence.id : null,
    online_presence_address: item.online_presence ? item.online_presence.address : null,
    online_presence_inactive: item.online_presence ? item.online_presence.inactive : null,
    online_presence_primary: item.online_presence ? item.online_presence.primary : null,
    online_presence_type: item.online_presence ? item.online_presence.type : null,
    phone: JSON.stringify(item.phone || {}),
    phone_id: item.phone ? item.phone.id : null,
    do_not_call: item.phone ? item.phone.do_not_call : null,
    phone_inactive: item.phone ? item.phone.inactive : null,
    phone_number: item.phone ? item.phone.number : null,
    phone_primary: item.phone ? item.phone.primary : null,
    phone_type: item.phone ? item.phone.type : null,
    preferred_name: item.preferred_name,
    spouse: JSON.stringify(item.spouse || {}),
    spouse_id: item.spouse ? item.spouse.id : null,
    spouse_first: item.spouse ? item.spouse.first : null,
    spouse_last: item.spouse ? item.spouse.last : null,
    spouse_hoh: item.spouse ? item.spouse.is_head_of_household : null,
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
    matching_gift_per_gift_min: JSON.stringify(item.matching_gift_per_gift_min || {}),
    matching_gift_per_gift_max: JSON.stringify(item.matching_gift_per_gift_max || {}),
    matching_gift_total_min: JSON.stringify(item.matching_gift_total_min || {}),
    matching_gift_total_max: JSON.stringify(item.matching_gift_total_max || {}),
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
    parent_corporation_id: item.parent_corporation_id
  };
}

function mapActions(item) {
  return {
    id: item.id,
    category: item.category,
    completed: item.completed,
    completed_date: item.completed_date ? new Date(item.completed_date) : null,
    computed_status: item.computed_status,
    constituent_id: item.constituent_id,
    date: item.date ? new Date(item.date) : null,
    date_added: item.date_added ? new Date(item.date_added).toISOString() : null,
    date_modified: item.date_modified ? new Date(item.date_modified).toISOString() : null,
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
    // Flatten arrays to JSON strings
    fundraisers: JSON.stringify(item.fundraisers || [])
  };
}

function mapGifts(item) {
  const out = {
    // Scalar fields
    id: item.id,
    amount_value: item.amount?.value ?? 0,
    balance_value: item.balance?.value ?? 0,
    batch_number: item.batch_number,
    constituent_id: item.constituent_id,
    date: item.date ? new Date(item.date) : null,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    gift_code: item.gift_code,
    gift_status: item.gift_status,
    is_anonymous: item.is_anonymous,
    gift_aid_qualification_status: item.gift_aid_qualification_status,
    constituency: item.constituency,
    lookup_id: item.lookup_id,
    post_date: item.post_date ? new Date(item.post_date) : null,
    post_status: item.post_status,
    subtype: item.subtype,
    type: item.type,
    reference: item.reference,
    recurring_gift_status_day: item.recurring_gift_status_date ? item.recurring_gift_status_date.d : null,
    recurring_gift_status_month: item.recurring_gift_status_date ? item.recurring_gift_status_date.m : null,
    recurring_gift_status_year: item.recurring_gift_status_date ? item.recurring_gift_status_date.y : null,
  };

  // JSON arrays
  out.acknowledgements = JSON.stringify(item.acknowledgements ?? []);
  out.fundraisers = JSON.stringify(item.fundraisers ?? []);
  out.gift_splits = JSON.stringify(item.gift_splits ?? []);
  out.linked_gifts = JSON.stringify(item.linked_gifts ?? []);
  out.payments = JSON.stringify(item.payments ?? []);
  out.receipts = JSON.stringify(item.receipts ?? []);
  out.soft_credits = JSON.stringify(item.soft_credits ?? []);

  // Acknowledgements flattening
  const MAX_ACKS = 5;
  (item.acknowledgements ?? []).forEach((ack, i) => {
    if (i < MAX_ACKS) {
      out[`acknowledgement_${i + 1}_date`] = ack.date ? new Date(ack.date) : null;
      out[`acknowledgement_${i + 1}_status`] = ack.status ?? null;
    }
  });
  for (let i = (item.acknowledgements?.length || 0); i < MAX_ACKS; i++) {
    out[`acknowledgement_${i + 1}_date`] = null;
    out[`acknowledgement_${i + 1}_status`] = null;
  }

  // Fundraisers flattening
  const MAX_FUNDRAISERS = 5;
  (item.fundraisers ?? []).forEach((f, i) => {
    if (i < MAX_FUNDRAISERS) {
      out[`fundraiser_${i + 1}_constituent_id`] = f.constituent_id ?? null;
      out[`fundraiser_${i + 1}_credit_amount`] = f.amount?.value ?? null;
    }
  });
  for (let i = (item.fundraisers?.length || 0); i < MAX_FUNDRAISERS; i++) {
    out[`fundraiser_${i + 1}_constituent_id`] = null;
    out[`fundraiser_${i + 1}_credit_amount`] = null;
  }

  // Gift splits flattening
  const MAX_SPLITS = 5;
  (item.gift_splits ?? []).forEach((split, i) => {
    if (i < MAX_SPLITS) {
      out[`gift_split_${i + 1}_id`] = split.id ?? null;
      out[`gift_split_${i + 1}_amount`] = split.amount?.value ?? null;
      out[`gift_split_${i + 1}_appeal_id`] = split.appeal_id ?? null;
      out[`gift_split_${i + 1}_campaign_id`] = split.campaign_id ?? null;
      out[`gift_split_${i + 1}_fund_id`] = split.fund_id ?? null;
    }
  });
  for (let i = (item.gift_splits?.length || 0); i < MAX_SPLITS; i++) {
    out[`gift_split_${i + 1}_id`] = null;
    out[`gift_split_${i + 1}_amount`] = null;
    out[`gift_split_${i + 1}_appeal_id`] = null;
    out[`gift_split_${i + 1}_campaign_id`] = null;
    out[`gift_split_${i + 1}_fund_id`] = null;
  }

  // Linked gifts flattening
  const MAX_LINKED = 10;
  (item.linked_gifts ?? []).forEach((lg, i) => {
    if (i < MAX_LINKED) {
      out[`linked_gift_${i + 1}_id`] = lg;
    }
  });
  for (let i = (item.linked_gifts?.length || 0); i < MAX_LINKED; i++) {
    out[`linked_gift_${i + 1}_id`] = null;
  }

  // Payments flattening
  const MAX_PAYMENTS = 5;
  (item.payments ?? []).forEach((p, i) => {
    if (i < MAX_PAYMENTS) {
      out[`payment_${i + 1}_method`] = p.payment_method ?? null;
    }
  });
  for (let i = (item.payments?.length || 0); i < MAX_PAYMENTS; i++) {
    out[`payment_${i + 1}_method`] = null;
  }

  // Receipts flattening
  const MAX_RECEIPTS = 5;
  (item.receipts ?? []).forEach((r, i) => {
    if (i < MAX_RECEIPTS) {
      out[`receipt_${i + 1}_amount`] = r.amount?.value ?? null;
      out[`receipt_${i + 1}_date`] = r.date ? new Date(r.date) : null;
      out[`receipt_${i + 1}_number`] = r.number ?? null;
      out[`receipt_${i + 1}_status`] = r.status ?? null;
    }
  });
  for (let i = (item.receipts?.length || 0); i < MAX_RECEIPTS; i++) {
    out[`receipt_${i + 1}_amount`] = null;
    out[`receipt_${i + 1}_date`] = null;
    out[`receipt_${i + 1}_number`] = null;
    out[`receipt_${i + 1}_status`] = null;
  }

  // Soft credits flattening
  const MAX_SOFT = 5;
  (item.soft_credits ?? []).forEach((sc, i) => {
    if (i < MAX_SOFT) {
      out[`soft_credit_${i + 1}_id`] = sc.id ?? null;
      out[`soft_credit_${i + 1}_amount`] = sc.amount?.value ?? null;
      out[`soft_credit_${i + 1}_const_id`] = sc.constituent_id ?? null;
      out[`soft_credit_${i + 1}_gift_id`] = sc.gift_id ?? null;
    }
  });
  for (let i = (item.soft_credits?.length || 0); i < MAX_SOFT; i++) {
    out[`soft_credit_${i + 1}_id`] = null;
    out[`soft_credit_${i + 1}_amount`] = null;
    out[`soft_credit_${i + 1}_const_id`] = null;
    out[`soft_credit_${i + 1}_gift_id`] = null;
  }

  return out;
}

function mapOpportunities(item) {
  const out = {
    id: item.id,
    ask_amount: item.ask_amount ? item.ask_amount.value : 0,
    ask_date: item.ask_date ? new Date(item.ask_date) : null,
    campaign_id: item.campaign_id,
    constituent_id: item.constituent_id,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    deadline: item.deadline,
    expected_amount: item.expected_amount ? item.expected_amount.value : 0,
    expected_date: item.expected_date ? new Date(item.expected_date) : null,
    funded_amount: item.funded_amount ? item.funded_amount.value : 0,
    funded_date: item.funded_date ? new Date(item.funded_date) : null,

    // // Flatten just the first fundraiser if present
    // fundraiser_constituent_id: firstFundraiser?.constituent_id ?? null,
    // fundraiser_credit_amount: firstFundraiser?.credit_amount?.value ?? null,

    fund_id: item.fund_id,
    inactive: item.inactive,

    // // Flatten just the first linked gift in the array if present
    // first_linked_gift: firstGift,

    name: item.name,
    purpose: item.purpose,
    status: item.status,
    opportunity_likelihood_name: item.opportunity_likelihood_name,
    opportunity_likelihood_id: item.opportunity_likelihood_id
  };

  // Fill the JSON arrays that were stringified
  out.fundraisers = JSON.stringify(item.fundraisers ?? []);
  out.linked_gifts = JSON.stringify(item.linked_gifts ?? []);

  //** Sequential flattening for arrays Fundraisers[] and Linked Gifts[] with many values **//
  // Fundraisers
  const MAX_FUNDRAISERS = 5;
  (item.fundraisers ?? []).forEach((j, i) => {
    if (i < MAX_FUNDRAISERS) {
      out[`fundraiser_${i + 1}_constituent_id`] = j.constituent_id;
      out[`fundraiser_${i + 1}_credit_amount`] = j.credit_amount?.value ?? null;
    }
  });
  // fill unused fields with null
  for (let i = (item.fundraisers ?? []).length; i < MAX_FUNDRAISERS; i++) {
    out[`fundraiser_${i + 1}_constituent_id`] = null;
    out[`fundraiser_${i + 1}_credit_amount`] = null;
  }

  // Linked Gifts
  const MAX_GIFTS = 10;
  (item.linked_gifts ?? []).forEach((j, i) => {
    if (i < MAX_GIFTS) {
      out[`linked_gift_${i + 1}`] = j;
    }
  });
  // fill unused fields with null
  for (let i = (item.linked_gifts ?? []).length; i < MAX_GIFTS; i++) {
    out[`linked_gift_${i + 1}`] = null;
  }

  // Return the final fields 
  return out;
}

function mapEvents(item) {
  return {
    id: item.id,
    lookup_id: item.lookup_id,
    name: item.name,
    start_date: item.start_date ? new Date(item.start_date) : null,
    start_time: item.start_time,
    end_date: item.end_date ? new Date(item.end_date) : null,
    end_time: item.end_time,
    attending_count: item.attending_count,
    invited_count: item.invited_count,
    revenue: item.revenue,
    goal: item.goal,
    percent_of_goal: item.percent_of_goal,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    capacity: item.capacity,
    inactive: item.inactive,
    attended_count: item.attended_count,
    category_id: item.category ? item.category.id : null,
    category_name: item.category ? item.category.name : null,
    category_inactive: item.category ? item.category.inactive : false,
    group_id: item.group ? item.group.id : null,
    group_name: item.group ? item.group.name : null,
    group_inactive: item.group ? item.group.is_inactive : false,
    expenses: item.expenses,
    net: item.net,
    location_name: item.location_name,
    payments_balance: item.payments_balance
  };
}

function mapFunds(item) {
  return {
    id: item.id,
    category: item.category,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    description: item.description,
    end_date: item.end_date ? new Date(item.end_date) : null,
    goal: item.goal ? item.goal.value : null,
    inactive: item.inactive,
    lookup_id: item.lookup_id,
    start_date: item.start_date ? new Date(item.start_date) : null,
    type: item.type
  };
}

function mapCampaigns(item) {
  return {
    id: item.id,
    category: item.category,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    description: item.description,
    end_date: item.end_date ? new Date(item.end_date) : null,
    goal: item.goal ? item.goal.value : null,
    inactive: item.inactive,
    lookup_id: item.lookup_id,
    start_date: item.start_date ? new Date(item.start_date) : null
  };
}

function mapAppeals(item) {
  return {
    id: item.id,
    category: item.category,
    date_added: item.date_added ? new Date(item.date_added) : null,
    date_modified: item.date_modified ? new Date(item.date_modified) : null,
    description: item.description,
    end_date: item.end_date ? new Date(item.end_date) : null,
    goal: item.goal ? item.goal.value : null,
    inactive: item.inactive,
    lookup_id: item.lookup_id,
    start_date: item.start_date ? new Date(item.start_date) : null
  };
}

(function () {
  // Config for the client WDC (server-based OAuth flow)
  var config = {
    // This cfg isn't used for direct OAuth in the WDC,
    // since the server handles authentication.
    authUrl: "https://oauth2.sky.blackbaud.com/authorization"
  };

  const uid = new URLSearchParams(window.location.search).get('uid') || null;

  $(document).ready(function () {
    // Query the server for authentication status.
    $.getJSON("http://localhost:3333/status?uid=" + uid, status => {
      updateUIWithAuthState(status.authenticated);
    });

    function checkAuth() {
      const url = uid
        ? `http://localhost:3333/status?uid=${uid}`
        : `http://localhost:3333/status`;

      $.getJSON(url, (stat) => {
        // the server volunteers a uid if exactly one valid session exists
        if (!uid && stat.uid) {
          uid = stat.uid;

          const p = new URL(window.location.href);
          p.searchParams.set('uid', uid);
          window.history.replaceState(null, '', p.toString());
        }
        
        updateUIWithAuthState(stat.authenticated);
      });
    }
    checkAuth();

    function updateFilters() {
      const ep = $('#endpointSelect').val();
      // hide all
      $('.filter-group').hide();
      // show only selected group
      $(`.filter-group[data-endpoint="${ep}"]`).show();
    }

    // Dynamically Update displayed filters based on selected endpoint
    $('#endpointSelect').on('change', updateFilters);
    // initial
    updateFilters();

    // Connect button: instruct the user to authenticate if not done.
    $("#connectButton").click(function () {
      $.getJSON(`http://localhost:3333/status?uid=${uid}`, function (status) {
        if (!status.authenticated) {
          // Instead of alerting, automatically redirect to /auth
          window.location.href = "http://localhost:3333/auth";
        } else {
          alert("Already authenticated.");
        }
      });
    });

    // When the "Query Selection" input box is used, automatically switch endpoints
    $('#queryIdInput').on('blur', function () {
      const val = $(this).val().trim();
      if (val.length > 0) {
        $('#endpointSelect').val('query');
      }
    });

    // Get Data button triggers the WDC flow
    $("#getDataButton").click(function () {
      // read and store user input choices
      const endpoint = $("#endpointSelect").val();
      const recordId = $("#recordIdInput").val();
      const queryId = $("#queryIdInput").val();
      const limit = $("#limitInput").val();
      const offset = $("#offsetInput").val();
      const maxPages = $("#maxPagesInput").val();
      const chunkSize = $("#chunkSizeInput").val();
      const fetchAll = $("#fetchAllRecords").is(":checked");
      const name = $("#nameInput").val();
      const lookupId = $("#lookupIdInput").val();
      const dateAddedRaw = $("#dateAddedInput").val().trim();
      const dateAdded    = dateAddedRaw || null;   
      const lastModified = $("#lastModifiedInput").val();
      const includeInactive = $(`#includeInactive${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}`).is(":checked");
      const searchText = $("#searchTextInput").val();
      const sortToken = $("#sortTokenInput").val();
      const listId = $("#listIdInput").val();
      const fundId = $("#fundIdInput").val();
      const eventId = $("#eventIdInput").val();
      const constituentId = $("#constituentIdInput").val();
      const category = $("#categoryInput").val();
      const startDateFrom = $("#startDateFromInput").val();
      const startDateTo = $("#startDateToInput").val();
      const fields = $("#fieldsInput").val();
      const sort = $("#sortInput").val();
      const group = $("#groupInput").val();
      const statusCode = $("#statusCodeInput").val();
      const continuationToken = $("#continuationTokenInput").val();
      const postStatus = $("#postStatusInput").val();
      const giftType = $("#giftTypeInput").val();
      const receiptStatus = $("#receiptStatusInput").val();
      const acknowledgementStatus = $("#acknowledgementStatusInput").val();
      const campaignId = $("#campaignIdInput").val();
      const appealId = $("#appealIdInput").val();
      const startGiftDate = $("#startGiftDateInput").val();
      const endGiftDate = $("#endGiftDateInput").val();
      const startGiftAmount = $("#startGiftAmountInput").val();
      const endGiftAmount = $("#endGiftAmountInput").val();

      // store in connectionData
      const cfg = {
        endpoint, recordId, queryId, limit, offset, maxPages, fetchAll, name, lookupId, dateAdded,
        lastModified, includeInactive, searchText, sortToken, listId, fundId, eventId, constituentId,
        category, startDateFrom, startDateTo, fields, sort, group, statusCode, continuationToken,
        postStatus, giftType, receiptStatus, acknowledgementStatus, campaignId, appealId, startGiftDate,
        endGiftDate, startGiftAmount, endGiftAmount, chunkSize
      };
      tableau.connectionData = JSON.stringify(cfg);

      tableau.connectionName = "Blackbaud RE NXT Connector (Server-Side OAuth) - " + endpoint;
      tableau.submit();
    });
  });

  // Define the WDC
  var myConnector = tableau.makeConnector();

  // Define Table Schemas
  myConnector.getSchema = function (schemaCallback) {

    const cfg = JSON.parse(tableau.connectionData); // contains user input parameters

    // Constituents Table Schema
    const constituentsCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "address", dataType: tableau.dataTypeEnum.string },
      { id: "address_id", dataType: tableau.dataTypeEnum.string },
      { id: "address_lines", dataType: tableau.dataTypeEnum.string },
      { id: "city", dataType: tableau.dataTypeEnum.string },
      { id: "addr_const_id", dataType: tableau.dataTypeEnum.string },
      { id: "country", dataType: tableau.dataTypeEnum.string },
      { id: "county", dataType: tableau.dataTypeEnum.string },
      { id: "do_not_mail", dataType: tableau.dataTypeEnum.bool },
      { id: "formatted_address", dataType: tableau.dataTypeEnum.string },
      { id: "postal_code", dataType: tableau.dataTypeEnum.string },
      { id: "preferred", dataType: tableau.dataTypeEnum.bool },
      { id: "state", dataType: tableau.dataTypeEnum.string },
      { id: "address_type", dataType: tableau.dataTypeEnum.string },
      { id: "age", dataType: tableau.dataTypeEnum.int },
      { id: "birth_day", dataType: tableau.dataTypeEnum.int },
      { id: "birth_month", dataType: tableau.dataTypeEnum.int },
      { id: "birth_year", dataType: tableau.dataTypeEnum.int },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "deceased", dataType: tableau.dataTypeEnum.bool },
      { id: "deceased_date_day", dataType: tableau.dataTypeEnum.int },
      { id: "deceased_date_month", dataType: tableau.dataTypeEnum.int },
      { id: "deceased_date_year", dataType: tableau.dataTypeEnum.int },
      { id: "email", dataType: tableau.dataTypeEnum.string },
      { id: "email_id", dataType: tableau.dataTypeEnum.string },
      { id: "email_address", dataType: tableau.dataTypeEnum.string },
      { id: "do_not_email", dataType: tableau.dataTypeEnum.bool },
      { id: "email_inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "email_primary", dataType: tableau.dataTypeEnum.bool },
      { id: "email_type", dataType: tableau.dataTypeEnum.string },
      { id: "first", dataType: tableau.dataTypeEnum.string },
      { id: "former_name", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_status", dataType: tableau.dataTypeEnum.string },
      { id: "gender", dataType: tableau.dataTypeEnum.string },
      { id: "gives_anonymously", dataType: tableau.dataTypeEnum.bool },
      { id: "inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "last", dataType: tableau.dataTypeEnum.string },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "marital_status", dataType: tableau.dataTypeEnum.string },
      { id: "middle", dataType: tableau.dataTypeEnum.string },
      { id: "name", dataType: tableau.dataTypeEnum.string },
      { id: "online_presence", dataType: tableau.dataTypeEnum.string },
      { id: "online_presence_id", dataType: tableau.dataTypeEnum.string },
      { id: "online_presence_address", dataType: tableau.dataTypeEnum.string },
      { id: "online_presence_inactive", dataType: tableau.dataTypeEnum.string },
      { id: "online_presence_primary", dataType: tableau.dataTypeEnum.string },
      { id: "online_presence_type", dataType: tableau.dataTypeEnum.string },
      { id: "phone", dataType: tableau.dataTypeEnum.string },
      { id: "phone_id", dataType: tableau.dataTypeEnum.string },
      { id: "do_not_call", dataType: tableau.dataTypeEnum.bool },
      { id: "phone_inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "phone_number", dataType: tableau.dataTypeEnum.string },
      { id: "phone_primary", dataType: tableau.dataTypeEnum.bool },
      { id: "phone_type", dataType: tableau.dataTypeEnum.string },
      { id: "preferred_name", dataType: tableau.dataTypeEnum.string },
      { id: "spouse", dataType: tableau.dataTypeEnum.string },
      { id: "spouse_id", dataType: tableau.dataTypeEnum.string },
      { id: "spouse_first", dataType: tableau.dataTypeEnum.string },
      { id: "spouse_last", dataType: tableau.dataTypeEnum.string },
      { id: "spouse_hoh", dataType: tableau.dataTypeEnum.bool },
      { id: "suffix", dataType: tableau.dataTypeEnum.string },
      { id: "suffix_2", dataType: tableau.dataTypeEnum.string },
      { id: "title", dataType: tableau.dataTypeEnum.string },
      { id: "title_2", dataType: tableau.dataTypeEnum.string },
      { id: "type", dataType: tableau.dataTypeEnum.string },
      { id: "birthplace", dataType: tableau.dataTypeEnum.string },
      { id: "ethnicity", dataType: tableau.dataTypeEnum.string },
      { id: "income", dataType: tableau.dataTypeEnum.string },
      { id: "religion", dataType: tableau.dataTypeEnum.string },
      { id: "industry", dataType: tableau.dataTypeEnum.string },
      { id: "matches_gifts", dataType: tableau.dataTypeEnum.bool },
      { id: "matching_gift_per_gift_min", dataType: tableau.dataTypeEnum.float },
      { id: "matching_gift_per_gift_max", dataType: tableau.dataTypeEnum.float },
      { id: "matching_gift_total_min", dataType: tableau.dataTypeEnum.float },
      { id: "matching_gift_total_max", dataType: tableau.dataTypeEnum.float },
      { id: "matching_gift_factor", dataType: tableau.dataTypeEnum.float },
      { id: "matching_gift_notes", dataType: tableau.dataTypeEnum.string },
      { id: "num_employees", dataType: tableau.dataTypeEnum.int },
      { id: "is_memorial", dataType: tableau.dataTypeEnum.bool },
      { id: "is_solicitor", dataType: tableau.dataTypeEnum.bool },
      { id: "no_valid_address", dataType: tableau.dataTypeEnum.bool },
      { id: "receipt_type", dataType: tableau.dataTypeEnum.string },
      { id: "target", dataType: tableau.dataTypeEnum.string },
      { id: "requests_no_email", dataType: tableau.dataTypeEnum.bool },
      { id: "import_id", dataType: tableau.dataTypeEnum.string },
      { id: "is_constituent", dataType: tableau.dataTypeEnum.bool },
      { id: "num_subsidiaries", dataType: tableau.dataTypeEnum.int },
      { id: "parent_corporation_name", dataType: tableau.dataTypeEnum.string },
      { id: "parent_corporation_id", dataType: tableau.dataTypeEnum.int }
    ];
    const constituentsTable = {
      id: "constituents",
      alias: "Raiser's Edge NXT Constituents (via server)",
      columns: constituentsCols
    };

    // Actions Table Schema
    const actionsCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "category", dataType: tableau.dataTypeEnum.string },
      { id: "completed", dataType: tableau.dataTypeEnum.bool },
      { id: "completed_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "computed_status", dataType: tableau.dataTypeEnum.string },
      { id: "constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "date", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "description", dataType: tableau.dataTypeEnum.string },
      { id: "direction", dataType: tableau.dataTypeEnum.string },
      { id: "end_time", dataType: tableau.dataTypeEnum.string },
      { id: "fundraisers", dataType: tableau.dataTypeEnum.string },
      { id: "location", dataType: tableau.dataTypeEnum.string },
      { id: "outcome", dataType: tableau.dataTypeEnum.string },
      { id: "opportunity_id", dataType: tableau.dataTypeEnum.string },
      { id: "priority", dataType: tableau.dataTypeEnum.string },
      { id: "start_time", dataType: tableau.dataTypeEnum.string },
      { id: "status", dataType: tableau.dataTypeEnum.string },
      { id: "status_code", dataType: tableau.dataTypeEnum.string },
      { id: "summary", dataType: tableau.dataTypeEnum.string },
      { id: "type", dataType: tableau.dataTypeEnum.string }
    ];
    const actionsTable = {
      id: "actions",
      alias: "Raiser's Edge NXT Actions",
      columns: actionsCols
    };

    // Gifts Table Schema
    const giftsCols = [
      // Scalar/top‐level fields
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "amount_value", dataType: tableau.dataTypeEnum.float },
      { id: "balance_value", dataType: tableau.dataTypeEnum.float },
      { id: "batch_number", dataType: tableau.dataTypeEnum.string },
      { id: "constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "date", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "gift_code", dataType: tableau.dataTypeEnum.string },
      { id: "gift_status", dataType: tableau.dataTypeEnum.string },
      { id: "is_anonymous", dataType: tableau.dataTypeEnum.bool },
      { id: "gift_aid_qualification_status", dataType: tableau.dataTypeEnum.string },
      { id: "constituency", dataType: tableau.dataTypeEnum.string },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "post_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "post_status", dataType: tableau.dataTypeEnum.string },
      { id: "reference", dataType: tableau.dataTypeEnum.string },
      { id: "subtype", dataType: tableau.dataTypeEnum.string },
      { id: "type", dataType: tableau.dataTypeEnum.string },
      { id: "recurring_gift_status_day", dataType: tableau.dataTypeEnum.int },
      { id: "recurring_gift_status_month", dataType: tableau.dataTypeEnum.int },
      { id: "recurring_gift_status_year", dataType: tableau.dataTypeEnum.int },

      // Raw JSON arrays
      { id: "acknowledgements", dataType: tableau.dataTypeEnum.string },
      { id: "fundraisers", dataType: tableau.dataTypeEnum.string },
      { id: "gift_splits", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gifts", dataType: tableau.dataTypeEnum.string },
      { id: "payments", dataType: tableau.dataTypeEnum.string },
      { id: "receipts", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credits", dataType: tableau.dataTypeEnum.string },

      // Acknowledgements (first 5)
      { id: "acknowledgement_1_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "acknowledgement_1_status", dataType: tableau.dataTypeEnum.string },
      { id: "acknowledgement_2_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "acknowledgement_2_status", dataType: tableau.dataTypeEnum.string },
      { id: "acknowledgement_3_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "acknowledgement_3_status", dataType: tableau.dataTypeEnum.string },
      { id: "acknowledgement_4_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "acknowledgement_4_status", dataType: tableau.dataTypeEnum.string },
      { id: "acknowledgement_5_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "acknowledgement_5_status", dataType: tableau.dataTypeEnum.string },

      // Fundraisers (first 5)
      { id: "fundraiser_1_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_1_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_2_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_2_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_3_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_3_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_4_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_4_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_5_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_5_credit_amount", dataType: tableau.dataTypeEnum.float },

      // Gift Splits (first 5)
      { id: "gift_split_1_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_1_amount", dataType: tableau.dataTypeEnum.float },
      { id: "gift_split_1_appeal_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_1_campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_1_fund_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_2_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_2_amount", dataType: tableau.dataTypeEnum.float },
      { id: "gift_split_2_appeal_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_2_campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_2_fund_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_3_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_3_amount", dataType: tableau.dataTypeEnum.float },
      { id: "gift_split_3_appeal_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_3_campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_3_fund_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_4_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_4_amount", dataType: tableau.dataTypeEnum.float },
      { id: "gift_split_4_appeal_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_4_campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_4_fund_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_5_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_5_amount", dataType: tableau.dataTypeEnum.float },
      { id: "gift_split_5_appeal_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_5_campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_5_fund_id", dataType: tableau.dataTypeEnum.string },

      // Linked Gifts (first 10)
      { id: "linked_gift_1_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_2_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_3_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_4_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_5_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_6_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_7_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_8_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_9_id", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_10_id", dataType: tableau.dataTypeEnum.string },

      // Payments (first 5)
      { id: "payment_1_method", dataType: tableau.dataTypeEnum.string },
      { id: "payment_2_method", dataType: tableau.dataTypeEnum.string },
      { id: "payment_3_method", dataType: tableau.dataTypeEnum.string },
      { id: "payment_4_method", dataType: tableau.dataTypeEnum.string },
      { id: "payment_5_method", dataType: tableau.dataTypeEnum.string },

      // Receipts (first 5)
      { id: "receipt_1_amount", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_1_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "receipt_1_number", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_1_status", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_2_amount", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_2_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "receipt_2_number", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_2_status", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_3_amount", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_3_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "receipt_3_number", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_3_status", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_4_amount", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_4_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "receipt_4_number", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_4_status", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_5_amount", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_5_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "receipt_5_number", dataType: tableau.dataTypeEnum.float },
      { id: "receipt_5_status", dataType: tableau.dataTypeEnum.string },

      // Soft Credits (first 5)
      { id: "soft_credit_1_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_1_amount", dataType: tableau.dataTypeEnum.float },
      { id: "soft_credit_1_const_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_1_gift_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_2_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_2_amount", dataType: tableau.dataTypeEnum.float },
      { id: "soft_credit_2_const_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_2_gift_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_3_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_3_amount", dataType: tableau.dataTypeEnum.float },
      { id: "soft_credit_3_const_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_3_gift_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_4_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_4_amount", dataType: tableau.dataTypeEnum.float },
      { id: "soft_credit_4_const_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_4_gift_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_5_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_5_amount", dataType: tableau.dataTypeEnum.float },
      { id: "soft_credit_5_const_id", dataType: tableau.dataTypeEnum.string },
      { id: "soft_credit_5_gift_id", dataType: tableau.dataTypeEnum.string }
    ];

    const giftsTable = {
      id: "gifts",
      alias: "Raiser's Edge NXT Gifts V1",
      columns: giftsCols
    };

    // Opportunities Table Schema
    const opportunitiesCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "ask_amount", dataType: tableau.dataTypeEnum.float },
      { id: "ask_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "deadline", dataType: tableau.dataTypeEnum.datetime },
      { id: "expected_amount", dataType: tableau.dataTypeEnum.float },
      { id: "expected_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "funded_amount", dataType: tableau.dataTypeEnum.float },
      { id: "funded_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "fundraisers", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_1_constituent_id", dataType: tableau.dataTypeEnum.string }, // First flattened fundraiser ID
      { id: "fundraiser_1_credit_amount", dataType: tableau.dataTypeEnum.float },   // First flattended fundraiser credit amount
      { id: "fundraiser_2_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_2_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_3_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_3_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_4_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_4_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fundraiser_5_constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_5_credit_amount", dataType: tableau.dataTypeEnum.float },
      { id: "fund_id", dataType: tableau.dataTypeEnum.string },
      { id: "inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "linked_gifts", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_1", dataType: tableau.dataTypeEnum.string }, // First flattened linked gift ID
      { id: "linked_gift_2", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_3", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_4", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_5", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_6", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_7", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_8", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_9", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gift_10", dataType: tableau.dataTypeEnum.string },
      { id: "name", dataType: tableau.dataTypeEnum.string },
      { id: "purpose", dataType: tableau.dataTypeEnum.string },
      { id: "status", dataType: tableau.dataTypeEnum.string },
      { id: "opportunity_likelihood_name", dataType: tableau.dataTypeEnum.string },
      { id: "opportunity_likelihood_id", dataType: tableau.dataTypeEnum.string }
    ];
    const opportunitiesTable = {
      id: "opportunities",
      alias: "Raiser's Edge NXT Opportunities v1",
      columns: opportunitiesCols
    };

    // Events Table Schema
    const eventsCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "name", dataType: tableau.dataTypeEnum.string },
      { id: "start_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "start_time", dataType: tableau.dataTypeEnum.string },
      { id: "end_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "end_time", dataType: tableau.dataTypeEnum.string },
      { id: "attending_count", dataType: tableau.dataTypeEnum.float },
      { id: "invited_count", dataType: tableau.dataTypeEnum.float },
      { id: "revenue", dataType: tableau.dataTypeEnum.float },
      { id: "goal", dataType: tableau.dataTypeEnum.float },
      { id: "percent_of_goal", dataType: tableau.dataTypeEnum.float },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "capacity", dataType: tableau.dataTypeEnum.float },
      { id: "inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "attended_count", dataType: tableau.dataTypeEnum.float },
      { id: "category_id", dataType: tableau.dataTypeEnum.string },
      { id: "category_name", dataType: tableau.dataTypeEnum.string },
      { id: "category_inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "group_id", dataType: tableau.dataTypeEnum.string },
      { id: "group_name", dataType: tableau.dataTypeEnum.string },
      { id: "group_inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "expenses", dataType: tableau.dataTypeEnum.float },
      { id: "net", dataType: tableau.dataTypeEnum.float },
      { id: "location_name", dataType: tableau.dataTypeEnum.string },
      { id: "payments_balance", dataType: tableau.dataTypeEnum.float },
    ];
    const eventsTable = {
      id: "events",
      alias: "Raiser's Edge NXT Events v1",
      columns: eventsCols
    };

    // Funds Table Schema
    const fundsCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "category", dataType: tableau.dataTypeEnum.string },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "description", dataType: tableau.dataTypeEnum.string },
      { id: "end_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "goal", dataType: tableau.dataTypeEnum.float },
      { id: "inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "start_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "type", dataType: tableau.dataTypeEnum.string }
    ];
    const fundsTable = {
      id: "funds",
      alias: "Raiser's Edge NXT Funds v1",
      columns: fundsCols
    };

    // Campaigns Table Schema
    const campaignsCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "category", dataType: tableau.dataTypeEnum.string },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "description", dataType: tableau.dataTypeEnum.string },
      { id: "end_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "goal", dataType: tableau.dataTypeEnum.float },
      { id: "inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "start_date", dataType: tableau.dataTypeEnum.datetime }
    ];
    const campaignsTable = {
      id: "campaigns",
      alias: "Raiser's Edge NXT Campaigns v1",
      columns: campaignsCols
    };

    // Appeals Table Schema
    const appealsCols = [
      { id: "id", dataType: tableau.dataTypeEnum.string },
      { id: "category", dataType: tableau.dataTypeEnum.string },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "description", dataType: tableau.dataTypeEnum.string },
      { id: "end_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "goal", dataType: tableau.dataTypeEnum.float },
      { id: "inactive", dataType: tableau.dataTypeEnum.bool },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "start_date", dataType: tableau.dataTypeEnum.datetime }
    ];
    const appealsTable = {
      id: "appeals",
      alias: "Raiser's Edge NXT Appeals v1",
      columns: appealsCols
    };

    // Dynamic Query Table
    if (cfg.endpoint === "query") {
      fetch(`/getBlackbaudData?uid=${uid}&endpoint=query&queryId=${cfg.queryId}&schemaOnly=1`)
        .then(r => r.json())
        .then(headerArr => {
          const queryCols = headerArr.map(h => ({
            id: h.replace(/\W+/g, "_"),
            alias: h,
            dataType: tableau.dataTypeEnum.string
          }));
          schemaCallback([{
            id: "query", alias: "Dynamic Query", columns: queryCols
          }]);
        })
        .catch(e => tableau.abortWithError("Schema discovery failed: " + e));
      return;       // prevent fall‑through
    }

    // Static Table Callbacks
    switch (cfg.endpoint) {
      case 'constituents':
        schemaCallback([constituentsTable]);
        break;

      case 'actions':
        schemaCallback([actionsTable]);
        break;

      case 'gifts':
        schemaCallback([giftsTable]);
        break;

      case 'opportunities':
        schemaCallback([opportunitiesTable]);
        break;

      case 'events':
        schemaCallback([eventsTable]);
        break;

      case 'funds':
        schemaCallback([fundsTable]);
        break;

      case 'campaigns':
        schemaCallback([campaignsTable]);
        break;

      case 'appeals':
        schemaCallback([appealsTable]);
        break;

      default:
        tableau.abortWithError(
          `Unsupported endpoint: ${cfg.endpoint}`
        );
    }
  };

  // Retrieve Table Data
  myConnector.getData = function (table, doneCallback) {
    // Extract the Tableau run phase
    const isGather = tableau.phase === tableau.phaseEnum.gatherDataPhase;

    if (tableau.phase === tableau.phaseEnum.interactivePhase) {
      doneCallback();
      return;
    }

    // Parse the user's chosen cfg from tableau.connectionData
    const cfg = JSON.parse(tableau.connectionData);
    // e.g., { endpoint: "constituents", recordId: "123", limit: "500", offset: "0", maxPages: "2", etc... }

    // Determine which table the WDC is currently asking for
    const tableId = table.tableInfo.id;
    // Call the server route /getBlackbaudData with parameters
    let url = `http://localhost:3333/getBlackbaudData?uid=${uid}&endpoint=${tableId}`;
    // add user typed parameters
    if (cfg.recordId) url += `&id=${cfg.recordId}`;
    if (cfg.queryId) url += `&query_id=${cfg.queryId}`;
    if (cfg.limit) url += `&limit=${cfg.limit}`;
    if (cfg.offset) url += `&offset=${cfg.offset}`;
    if (cfg.maxPages) url += `&max_pages=${cfg.maxPages}`;
    if (cfg.name) url += `&name=${cfg.name}`;
    if (cfg.lookupId) url += `&lookup_id=${cfg.lookupId}`;
    if (cfg.dateAdded) url += `&date_added=${cfg.dateAdded}`;
    if (cfg.lastModified) url += `&last_modified=${cfg.lastModified}`;
    if (cfg.includeInactive) url += `&include_inactive=true`;
    if (cfg.searchText) url += `&search_text=${cfg.searchText}`;
    if (cfg.sortToken) url += `&sort_token=${cfg.sortToken}`;
    if (cfg.listId) url += `&list_id=${cfg.listId}`;
    if (cfg.fundId) url += `&fund_id=${cfg.fundId}`;
    if (cfg.eventId) url += `&event_id=${cfg.eventId}`;
    if (cfg.constituentId) url += `&constituent_id=${cfg.constituentId}`;
    if (cfg.category) url += `&category=${cfg.category}`;
    if (cfg.startDateFrom) url += `&start_date_from=${cfg.startDateFrom}`;
    if (cfg.startDateTo) url += `&start_date_to=${cfg.startDateTo}`;
    if (cfg.fields) url += `&fields=${cfg.fields}`;
    if (cfg.sort) url += `&sort=${cfg.sort}`;
    if (cfg.group) url += `&group=${cfg.group}`;
    if (cfg.statusCode) url += `&status_code=${cfg.statusCode}`;
    if (cfg.continuationToken) url += `&continuation_token=${cfg.continuationToken}`;
    if (cfg.postStatus) url += `&post_status=${cfg.postStatus}`;
    if (cfg.giftType) url += `&gift_type=${cfg.giftType}`;
    if (cfg.receiptStatus) url += `&receipt_status=${cfg.receiptStatus}`;
    if (cfg.acknowledgementStatus) url += `&acknowledgement_status=${cfg.acknowledgementStatus}`;
    if (cfg.campaignId) url += `&campaign_id=${cfg.campaignId}`;
    if (cfg.appealId) url += `&appeal_id=${cfg.appealId}`;
    if (cfg.startGiftDate) url += `&start_gift_date=${cfg.startGiftDate}`;
    if (cfg.endGiftDate) url += `&end_gift_date=${cfg.endGiftDate}`;
    if (cfg.startGiftAmount) url += `&start_gift_amount=${cfg.startGiftAmount}`;
    if (cfg.endGiftAmount) url += `&end_gift_amount=${cfg.endGiftAmount}`;

    // If "Query" table
    if (tableId === 'query') {
      const CHUNK = 15000;
      let page = 0;

      function fetchChunk() {
        const chunkUrl = url + `&chunkSize=${CHUNK}&page=${page}`;
        fetch(chunkUrl)
          .then(r => r.json())
          .then(obj => {
            const rows = obj.value.map(rowObj => {
              const out = {};
              table.tableInfo.columns.forEach(col =>
                (out[col.id] = rowObj[col.alias] ?? null)
              );
              return out;
            });

            if (rows.length) table.appendRows(rows);

            // Keep going while we have a full slice
            if (rows.length === CHUNK) {
              page += 1;
              fetchChunk();
            } else {
              doneCallback();
            }
          })
          .catch(e => tableau.abortWithError('Chunk fetch failed: ' + e));
      }
      fetchChunk();
      return;
    }

    // Fetch all constituent records
    if (tableId === 'constituents') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapConstituents);   
          const MAX_ROWS = 10000;                             

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));   
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // Fetch all actions records (may not finish due to over 4 million records)
    if (tableId === 'actions') {

      /*------------------------------------------------------------------
        0)  Don’t pull data during schema-gather / preview in Tableau UI
      ------------------------------------------------------------------*/
      if (tableau.phase === tableau.phaseEnum.interactivePhase) {
        doneCallback();
        return;
      }
    
      /*------------------------------------------------------------------
        1)  SINGLE RECORD
      ------------------------------------------------------------------*/
      if (cfg.recordId && cfg.recordId.trim() !== '') {
        /*  url already includes &id=… because it was added in the
            generic builder a few lines above.                         */
        fetch(url)
          .then(r => r.json())
          .then(data => {
            table.appendRows([ mapActions(data.value[0]) ] );   // value is a 1-element array
            doneCallback();
          })
          .catch(e => tableau.abortWithError(e));
        return;
      }
    
      /*------------------------------------------------------------------
        2)  BULK DOWNLOAD  (cfg.fetchAll === true)
      ------------------------------------------------------------------*/
      if (cfg.fetchAll) {
        const CHUNK = parseInt(cfg.chunkSize || "15000", 10)
        let page = 0;
        let bulkId;
    
        // --- init ---
        fetch(`http://localhost:3333/bulk/actions?uid=${uid}&chunkSize=${CHUNK}`)
          .then(r => {
            if (!r.ok) throw new Error(`Bulk init failed: ${r.statusText}`);
            return r.json();
          })
          .then(init => {
            bulkId = init.id;
            console.log(`Bulk init OK, id=${bulkId}, totalRows=${init.rows}`);
            fetchChunk();
          })
          .catch(err => tableau.abortWithError('Bulk init failed: ' + err));
    
        // --- loop ---
        function fetchChunk() {
          fetch(`http://localhost:3333/bulk/actions/chunk?uid=${uid}&id=${bulkId}&page=${page}&chunkSize=${CHUNK}`)
            .then(r => r.json())
            .then(obj => {
              if (!obj.value.length) return doneCallback();
    
              table.appendRows( obj.value.map(mapActions) );
    
              // keep paging until slice < CHUNK
              if (obj.value.length === CHUNK) {
                page += 1;
                fetchChunk();
              } else {
                doneCallback();
              }
            })
            .catch(err => tableau.abortWithError('Chunk fetch failed: ' + err));
        }
        return;
      }
    
      /*------------------------------------------------------------------
        3)  PAGED LIST  (default)
      ------------------------------------------------------------------*/
      fetch(url)                              // url already has limit/offset/filters
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapActions);
          const MAX_ROWS = 10000;             // avoid 64 k row burst limits
    
          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
    
      return;
    }

    // Fetch all gift records
    if (tableId === 'gifts') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapGifts);   
          const MAX_ROWS = 10000;                             

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));     
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // Fetch all opportunities records
    if (tableId === 'opportunities') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapOpportunities);   
          const MAX_ROWS = 10000;                             

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));     
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // Fetch all events records
    if (tableId === 'events') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapEvents);   
          const MAX_ROWS = 10000;                            

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));   
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // Fetch all funds records
    if (tableId === 'funds') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapFunds);  
          const MAX_ROWS = 10000;                           

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));     
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // Fetch all campaigns records
    if (tableId === 'campaigns') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapCampaigns);   
          const MAX_ROWS = 10000;                            

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));    
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // Fetch all appeals records
    if (tableId === 'appeals') {
      fetch(url)
        .then(r => r.json())
        .then(data => {
          const rows = data.value.map(mapAppeals);   
          const MAX_ROWS = 10000;                             

          for (let i = 0; i < rows.length; i += MAX_ROWS) {
            table.appendRows(rows.slice(i, i + MAX_ROWS));    
          }
          doneCallback();
        })
        .catch(e => tableau.abortWithError(e));
      return;
    }

    // // Single-page fetch for static tables [Now unused and duplicate]
    // else if (tableId === 'constituents') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapConstituents);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'actions') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapActions);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'gifts') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapGifts);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'opportunities') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapOpportunities);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'events') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapEvents);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'funds') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapFunds);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'campaigns') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapCampaigns);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
    // else if (tableId === 'appeals') {
    //   fetch(url)
    //     .then(r => r.json())
    //     .then(data => {
    //       const rows = data.value.map(mapAppeals);
    //       table.appendRows(rows);
    //       doneCallback();
    //     })
    //     .catch(e => tableau.abortWithError(e));
    //   return;
    // }
  };

  tableau.registerConnector(myConnector);
})();