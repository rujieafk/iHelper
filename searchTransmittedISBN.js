// Log a message when the script starts running.
console.log("searchTransmittedISBN is running...");

// Replace these values with your actual Supabase project details.
const supabaseUrl = "https://nqugmxzvtqunngdcvpml.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdWdteHp2dHF1bm5nZGN2cG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjI0NjksImV4cCI6MjA5NDY5ODQ2OX0.-OVawnXolHygi0ewfdXEdqE5eyZg4LDxtFqzDBUwGK8";
let supabase = null;

// Initialize the Supabase client.
async function initSupabase() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");

  const fetchWrapper = async (input, init) => {
    return fetch(input, {
      ...init,
      mode: "cors",
      credentials: "omit",
    });
  };

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    fetch: fetchWrapper,
  });
  console.log("Supabase client initialized.");
}

// Convert user input into a list of ISBN strings.
function parseIsbnList(inputValue) {
  return inputValue
    .split(/[,\n]+/) // split on comma or new line
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

// Display search results in the page as a table.
function showSearchResults(isbnList, foundRows) {
  const results = document.getElementById("search-results");
  if (!results) {
    console.warn("Search results container not found.");
    return;
  }

  const foundMap = foundRows.reduce((map, row) => {
    map[row.ISBN] = row.Transmitted_Date;
    return map;
  }, {});

  const rows = isbnList
    .map((isbn) => {
      const transmittedDate = foundMap[isbn] || "NOT TRANSMITTED";
      return `
        <tr>
          <td>${isbn}</td>
          <td>${transmittedDate}</td>
        </tr>
      `;
    })
    .join("");

  const countText = foundRows.length === 1 ? "1 ISBN found" : `${foundRows.length} ISBNs found`;

  results.innerHTML = `
    <p>${countText}</p>
    <table style="width:100%; max-width:640px; margin:0.75rem auto; border-collapse:collapse; text-align:left;">
      <thead>
        <tr>
          <th style="border-bottom:2px solid #333; padding:0.5rem;">ISBN</th>
          <th style="border-bottom:2px solid #333; padding:0.5rem;">Transmitted Date</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

// Helper to build a Supabase REST in() query string.
function buildIsbnInQuery(isbnList) {
  return isbnList
    .map((isbn) => `"${isbn.replace(/"/g, '\\"')}"`)
    .join(",");
}

async function fetchIsbnsDirect(isbnList) {
  const queryValue = buildIsbnInQuery(isbnList);
  const url = `${supabaseUrl}/rest/v1/Transmitted_ISBN?select=ISBN,Transmitted_Date&ISBN=in.(${queryValue})`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${supabaseAnonKey}`,
      Accept: "application/json",
    },
    mode: "cors",
    credentials: "omit",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Direct Supabase fetch failed: ${response.status} ${response.statusText} - ${text}`);
  }

  return response.json();
}

// Query the database for matching ISBNs.
async function findIsbnsInDatabase(isbnList) {
  if (!supabase) {
    console.error("Supabase is not initialized yet.");
    return [];
  }

  try {
    const { data, error } = await supabase
      .from("Transmitted_ISBN")
      .select("ISBN, Transmitted_Date")
      .in("ISBN", isbnList);

    if (error) {
      console.error("Supabase query error:", error);
      if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
        throw new Error(
          "Network request to Supabase failed. Check your internet connection, the Supabase project origin settings, and whether the browser can reach the URL."
        );
      }
      throw error;
    }

    return data || [];
  } catch (error) {
    if (error.message && error.message.toLowerCase().includes("failed to fetch")) {
      console.warn("Supabase client failed, attempting direct REST fetch.");
      return await fetchIsbnsDirect(isbnList);
    }
    throw error;
  }
}

// Set up page event listeners after DOM is ready.
document.addEventListener("DOMContentLoaded", async function() {
  await initSupabase();

  const searchBtn = document.getElementById("searchBtn");
  if (!searchBtn) {
    console.warn("Search button not found on this page.");
    return;
  }

  searchBtn.addEventListener("click", async function() {
    const isbnInput = document.getElementById("isbn-input");
    const rawValue = isbnInput ? isbnInput.value.trim() : "";
    const isbnList = parseIsbnList(rawValue);

    if (isbnList.length === 0) {
      showSearchResults([]);
      return;
    }

    const resultsContainer = document.getElementById("search-results");
    resultsContainer.innerHTML = "<p>Searching... please wait.</p>";

    try {
      const foundIsbns = await findIsbnsInDatabase(isbnList);
      showSearchResults(isbnList, foundIsbns);
      alert("Search successful.");
      if (isbnInput) isbnInput.value = "";
    } catch (error) {
      resultsContainer.innerHTML = "<p>An error occurred while searching.</p>";
      alert("Search failed. Please try again later.");
      if (isbnInput) isbnInput.value = "";
    }
  });
});