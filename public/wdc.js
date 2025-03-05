(function() {
    // Config for the client WDC (server-based OAuth flow)
    var config = {
      // This config isn't used for direct OAuth in the WDC,
      // since the server handles authentication.
      authUrl: "https://oauth2.sky.blackbaud.com/authorization"
    };

    $(document).ready(function() {
      // Query the server for authentication status.
      $.getJSON("http://localhost:3333/status", function(status) {
          updateUIWithAuthState(status.authenticated);
      });

      // Connect button: instruct the user to authenticate if not done.
      $("#connectButton").click(function() {
        $.getJSON("http://localhost:3333/status", function(status) {
            if (!status.authenticated) {
                // Instead of alerting, automatically redirect to /auth
                window.location.href = "http://localhost:3333/auth";
            } else {
                alert("Already authenticated.");
            }
        });
    });

      // Get Data button triggers the WDC flow
      $("#getDataButton").click(function() {
          tableau.connectionName = "Blackbaud RE NXT Connector (Server-Side OAuth)";
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

    // Define our WDC connector
    var myConnector = tableau.makeConnector();

    myConnector.getSchema = function(schemaCallback) {
      var cols = [
        { id: "id", dataType: tableau.dataTypeEnum.string },
        { id: "address", dataType: tableau.dataTypeEnum.string },
        { id: "age", dataType: tableau.dataTypeEnum.int },
        { id: "birthdate", dataType: tableau.dataTypeEnum.date },
        { id: "date_added", dataType: tableau.dataTypeEnum.datetime },
        { id: "date_modified", dataType: tableau.dataTypeEnum.datetime },
        { id: "deceased", dataType: tableau.dataTypeEnum.bool },
        { id: "deceased_date", dataType: tableau.dataTypeEnum.date },
        { id: "email", dataType: tableau.dataTypeEnum.string },
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
        { id: "phone", dataType: tableau.dataTypeEnum.string },
        { id: "preferred_name", dataType: tableau.dataTypeEnum.string },
        { id: "spouse", dataType: tableau.dataTypeEnum.string },
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
      var tableInfo = {
        id: "constituents",
        alias: "Raiser's Edge NXT Constituents (via server)",
        columns: cols
      };
      schemaCallback([tableInfo]);
    };

    myConnector.getData = function(table, doneCallback) {
      // Instead of checking client cookies, call the server endpoint
      var url = "http://localhost:3333/getConstituents";

      fetch(url)
        .then(function(resp) {
          if (!resp.ok) {
            throw new Error("Server returned an error: " + resp.status);
          }
          return resp.json();
        })
        .then(function(data) {
          if (!data.value || !Array.isArray(data.value)) {
            tableau.abortWithError("No 'value' array returned. Possibly not authenticated or token issue.");
            return;
          }
          var tableData = [];
          data.value.forEach(function(item) {
            tableData.push({
              id: item.id,
              address: item.address,
              age: item.age,
              birthdate: item.birthdate,
              date_added: item.date_added,
              date_modified: item.date_modified,
              deceased: item.deceased,
              deceased_date: item.deceased_date,
              email: item.email,
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
              online_presence: item.online_presence,
              phone: item.phone,
              preferred_name: item.preferred_name,
              spouse: item.spouse,
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
              matching_gift_per_gift_min: item.matching_gift_per_gift_min,
              matching_gift_per_gift_max: item.matching_gift_per_gift_max,
              matching_gift_total_min: item.matching_gift_total_min,
              matching_gift_total_max: item.matching_gift_total_max,
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

          // Log how many rows we’re about to append
          console.log("About to appendRows:", tableData.length);
          
          table.appendRows(tableData);
          doneCallback();
        })
        .catch(function(err) {
          console.error("Error fetching data from /getConstituents:", err);
          tableau.abortWithError("Error from server: " + err);
        });
    };

    tableau.registerConnector(myConnector);
})();
