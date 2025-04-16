(function () {
  // Config for the client WDC (server-based OAuth flow)
  var config = {
    // This config isn't used for direct OAuth in the WDC,
    // since the server handles authentication.
    authUrl: "https://oauth2.sky.blackbaud.com/authorization"
  };

  $(document).ready(function () {
    // Query the server for authentication status.
    $.getJSON("http://localhost:3333/status", function (status) {
      updateUIWithAuthState(status.authenticated);
    });

    // Connect button: instruct the user to authenticate if not done.
    $("#connectButton").click(function () {
      $.getJSON("http://localhost:3333/status", function (status) {
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
      // read user choices
      const endpoint = $("#endpointSelect").val();
      const recordId = $("#recordIdInput").val();
      const queryId = $("#queryIdInput").val();
      const limit = $("#limitInput").val();
      const offset = $("#offsetInput").val();
      const maxPages = $("#maxPagesInput").val();

      // store in connectionData
      const config = { endpoint, recordId, queryId, limit, offset, maxPages };
      tableau.connectionData = JSON.stringify(config);

      tableau.connectionName = "Blackbaud RE NXT Connector (Server-Side OAuth) - " + endpoint;
      tableau.submit();
    });
  });

  // UI update helper
  function updateUIWithAuthState(hasAuth) {
    if (hasAuth) {
      $(".notsignedin").hide();
      $(".signedin").show();

      // Hide the connect button
      $("#connectButton").hide();
    } else {
      $(".notsignedin").show();
      $(".signedin").hide();

      // Show the connect button again if needed
      $("#connectButton").show();
    }
  }

  // Define our WDC
  var myConnector = tableau.makeConnector();

  myConnector.getSchema = function (schemaCallback) {

    const cfg = JSON.parse(tableau.connectionData); // contains queryId etc.

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
      { id: "birthdate", dataType: tableau.dataTypeEnum.date },
      { id: "birth_day", dataType: tableau.dataTypeEnum.date },
      { id: "birth_month", dataType: tableau.dataTypeEnum.date },
      { id: "birth_year", dataType: tableau.dataTypeEnum.date },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "deceased", dataType: tableau.dataTypeEnum.bool },
      { id: "deceased_date", dataType: tableau.dataTypeEnum.date },
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
      { id: "completed_status", dataType: tableau.dataTypeEnum.string },
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
      { id: "id", dataType: tableau.dataTypeEnum.string },

      // Flatten numeric fields (amount.value, balance.value)
      { id: "amount_value", dataType: tableau.dataTypeEnum.float },
      { id: "balance_value", dataType: tableau.dataTypeEnum.float },

      // Simple string or boolean fields
      { id: "batch_number", dataType: tableau.dataTypeEnum.string },
      { id: "constituent_id", dataType: tableau.dataTypeEnum.string },
      { id: "date", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
      { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
      { id: "gift_code", dataType: tableau.dataTypeEnum.string },
      { id: "gift_status", dataType: tableau.dataTypeEnum.string },
      { id: "is_anonymous", dataType: tableau.dataTypeEnum.bool },
      { id: "constituency", dataType: tableau.dataTypeEnum.string },
      { id: "lookup_id", dataType: tableau.dataTypeEnum.string },
      { id: "post_date", dataType: tableau.dataTypeEnum.datetime },
      { id: "post_status", dataType: tableau.dataTypeEnum.string },
      { id: "subtype", dataType: tableau.dataTypeEnum.string },
      { id: "type", dataType: tableau.dataTypeEnum.string },

      // Now for the arrays that might contain multiple objects:
      // We'll store them as strings (JSON)
      { id: "acknowledgements", dataType: tableau.dataTypeEnum.string },
      { id: "acknowledgement_status", dataType: tableau.dataTypeEnum.string },
      { id: "fundraisers", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_amount", dataType: tableau.dataTypeEnum.string },
      { id: "fundraiser_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_splits", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_amount", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_appeal_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_campaign_id", dataType: tableau.dataTypeEnum.string },
      { id: "gift_split_fund_id", dataType: tableau.dataTypeEnum.string },
      { id: "payments", dataType: tableau.dataTypeEnum.string },
      { id: "payment_method", dataType: tableau.dataTypeEnum.string },
      { id: "receipts", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_amount", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_date", dataType: tableau.dataTypeEnum.string },
      { id: "receipt_status", dataType: tableau.dataTypeEnum.string },
      { id: "linked_gifts", dataType: tableau.dataTypeEnum.string }
    ];
    const giftsTable = {
      id: "gifts",
      alias: "Raiser's Edge NXT Gifts V1",
      columns: giftsCols
    };

    // Dynamic Query Table
    if (cfg.endpoint === "query") {
      fetch(`/getBlackbaudData?endpoint=query&queryId=${cfg.queryId}&schemaOnly=1`)
        .then(r => r.json())
        .then(headerArr => {
          const queryCols = headerArr.map(h => ({
            id: h.replace(/\W+/g, "_"),
            alias: h,
            dataType: tableau.dataTypeEnum.string
          }));
          schemaCallback([constituentsTable, actionsTable, giftsTable, {
            id: "query", alias: "Dynamic Query", columns: queryCols
          }]);
        })
        .catch(e => tableau.abortWithError("Schema discovery failed: " + e));
      return;       // prevent fall‑through
    }

    schemaCallback([constituentsTable, actionsTable, giftsTable]);
  };

  myConnector.getData = function (table, doneCallback) {
    // Parse the user's chosen config from tableau.connectionData
    const config = JSON.parse(tableau.connectionData);
    // e.g., { endpoint: "constituents", recordId: "123", limit: "500", offset: "0", maxPages: "2" }

    // Determine which table the WDC is currently asking for
    const tableId = table.tableInfo.id;
    // Call the server route /getBlackbaudData with parameters
    let url = `http://localhost:3333/getBlackbaudData?endpoint=${tableId}`;
    // add user typed parameters
    if (config.recordId) url += `&id=${config.recordId}`;
    if (config.queryId) url += `&queryId=${config.queryId}`;
    if (config.limit) url += `&limit=${config.limit}`;
    if (config.offset) url += `&offset=${config.offset}`;
    if (config.maxPages) url += `&maxPages=${config.maxPages}`;

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

    fetch(url)
      .then(function (resp) {
        if (!resp.ok) {
          throw new Error("Server returned an error: " + resp.status);
        }
        return resp.json();
      })
      .then(function (data) {
        if (!data.value || !Array.isArray(data.value)) {
          tableau.abortWithError("No 'value' array returned. Possibly not authenticated or token issue.");
          return;
        }

        var tableData = [];
        // If "Constituents" table
        if (tableId === "constituents") {
          data.value.forEach(item => {
            //console.log("Constituent Item:", JSON.stringify(item, null, 2));
            tableData.push({
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
              birthdate: JSON.stringify(item.birthdate || {}),
              birth_day: item.birthdate ? item.birthdate.d : null,
              birth_month: item.birthdate ? item.birthdate.m : null,
              birth_year: item.birthdate ? item.birthdate.y : null,
              date_added: item.date_added,
              date_modified: item.date_modified,
              deceased: item.deceased,
              deceased_date: JSON.stringify(item.deceased_date || {}),
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
            });
          });
        }
        // If "actions" table
        else if (tableId === "actions") {
          data.value.forEach(item => {
            tableData.push({
              id: item.id,
              category: item.category,
              completed: item.completed,
              completed_date: item.completed_date,
              completed_status: item.completed_status,
              constituent_id: item.constituent_id,
              date: item.date,
              date_added: item.date_added,
              date_modified: item.date_modified,
              description: item.description,
              direction: item.direction,
              end_time: item.end_time,
              location: item.location,
              outcome: item.outcome,
              priority: item.priority,
              start_time: item.start_time,
              status: item.status,
              status_code: item.status_code,
              summary: item.summary,
              type: item.type,
              // Flatten arrays to JSON strings
              fundraisers: JSON.stringify(item.fundraisers || [])
            });
          });
        }
        // If "gifts" table
        else if (tableId === "gifts") {
          data.value.forEach(gift => {
            tableData.push({
              id: gift.id,
              amount_value: gift.amount ? gift.amount.value : 0,
              balance_value: gift.balance ? gift.balance.value : 0,
              batch_number: gift.batch_number,
              constituent_id: gift.constituent_id,
              date: gift.date,
              date_added: gift.date_added,
              date_modified: gift.date_modified,
              gift_code: gift.gift_code,
              gift_status: gift.gift_status,
              is_anonymous: gift.is_anonymous,
              constituency: gift.constituency,
              lookup_id: gift.lookup_id,
              post_date: gift.post_date,
              post_status: gift.post_status,
              subtype: gift.subtype,
              type: gift.type,

              // Flatten arrays to JSON strings
              acknowledgements: JSON.stringify(gift.acknowledgements || []),
              fundraisers: JSON.stringify(gift.fundraisers || []),
              gift_splits: JSON.stringify(gift.gift_splits || []),
              payments: JSON.stringify(gift.payments || []),
              receipts: JSON.stringify(gift.receipts || []),
              linked_gifts: JSON.stringify(gift.linked_gifts || [])
            });
          });
        }

        /* ---------- push rows & finish ---------- */
        table.appendRows(tableData);
        doneCallback();
      })
      .catch(function (err) {
        console.error("Error fetching data:", err);
        tableau.abortWithError(err.toString());
      });
  };

  tableau.registerConnector(myConnector);
})();
