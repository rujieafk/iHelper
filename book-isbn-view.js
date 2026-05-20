// View page script for showing transmitted ISBNs by date filter.
console.log("book-isbn-view.js running...");

const supabaseUrl = "https://nqugmxzvtqunngdcvpml.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdWdteHp2dHF1bm5nZGN2cG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjI0NjksImV4cCI6MjA5NDY5ODQ2OX0.-OVawnXolHygi0ewfdXEdqE5eyZg4LDxtFqzDBUwGK8";
let supabase = null;

async function initSupabase() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");

  const fetchWrapper = async (input, init) => {
    return fetch(input, {
      ...init,
      mode: "cors",
      credentials: "omit",
    });
  };

  supabase = createClient(supabaseUrl, supabaseAnonKey, { fetch: fetchWrapper });
  console.log("Supabase client initialized.");
}

function formatTableRows(rows) {
  return rows
    .map(
      (row) => `
        <tr>
          <td>${row.ISBN}</td>
          <td>${row.Transmitted_Date}</td>
        </tr>
      `
    )
    .join("");
}

function renderIsbnTable(rows) {
  const container = document.getElementById("isbn-table-container");
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = "<p>No ISBN records found for this selection.</p>";
    return;
  }

  const tableRows = formatTableRows(rows);
  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%; border-collapse:collapse; text-align:left; max-width:760px; margin:0 auto;">
        <thead>
          <tr>
            <th style="border-bottom:2px solid #333; padding:0.75rem;">ISBN</th>
            <th style="border-bottom:2px solid #333; padding:0.75rem;">Transmitted Date</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
    </div>
  `;
}

function renderEmptyMessage(message) {
  const container = document.getElementById("isbn-table-container");
  if (!container) return;
  container.innerHTML = `<p>${message}</p>`;
}

function isValidMmDdYyyy(value) {
  return /^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])-\d{4}$/.test(value);
}

async function fetchIsbnsByDate(transmittedDate) {
  try {
    let query = supabase.from("Transmitted_ISBN").select("ISBN, Transmitted_Date").order("ISBN", { ascending: true });
    if (transmittedDate) {
      query = query.eq("Transmitted_Date", transmittedDate);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Supabase ISBN fetch error:", error);
      throw error;
    }

    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.warn("Failed to load ISBN records via Supabase client, using fallback REST call.");

    const encodedDate = transmittedDate ? `&Transmitted_Date=eq.${encodeURIComponent(transmittedDate)}` : "";
    const response = await fetch(
      `${supabaseUrl}/rest/v1/Transmitted_ISBN?select=ISBN,Transmitted_Date${encodedDate}&order=ISBN.asc`,
      {
        method: "GET",
        headers: {
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
          Accept: "application/json",
        },
        mode: "cors",
        credentials: "omit",
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Fallback REST ISBN fetch failed:", response.status, text);
      return [];
    }

    return await response.json();
  }
}

async function loadPageData() {
  const records = await fetchIsbnsByDate("");
  if (!records || records.length === 0) {
    renderEmptyMessage("No ISBN records in the database.");
  } else {
    renderIsbnTable(records);
  }
}

async function handleDateSearch() {
  const dateInput = document.getElementById("date-input");
  if (!dateInput) return;

  const dateValue = dateInput.value.trim();
  if (!isValidMmDdYyyy(dateValue)) {
    renderEmptyMessage("Please enter a date in MM-DD-YYYY format.");
    return;
  }

  const records = await fetchIsbnsByDate(dateValue);
  if (!records || records.length === 0) {
    renderEmptyMessage("No date found.");
  } else {
    renderIsbnTable(records);
  }
}

async function handleShowAll() {
  const records = await fetchIsbnsByDate("");
  if (!records || records.length === 0) {
    renderEmptyMessage("No ISBN records in the database.");
  } else {
    renderIsbnTable(records);
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  await initSupabase();

  const searchBtn = document.getElementById("date-search-btn");
  const showAllBtn = document.getElementById("show-all-btn");

  if (searchBtn) {
    searchBtn.addEventListener("click", handleDateSearch);
  }

  if (showAllBtn) {
    showAllBtn.addEventListener("click", handleShowAll);
  }

  await loadPageData();
});
