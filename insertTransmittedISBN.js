// Log a message when the script starts running.
console.log("iHelper is running...");

// Replace these values with your actual Supabase details.
const supabaseUrl = "https://nqugmxzvtqunngdcvpml.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5xdWdteHp2dHF1bm5nZGN2cG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjI0NjksImV4cCI6MjA5NDY5ODQ2OX0.-OVawnXolHygi0ewfdXEdqE5eyZg4LDxtFqzDBUwGK8";
let supabase = null;

// Load Supabase JS from CDN and create the client.
async function initSupabase() {
  const { createClient } = await import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm");
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log("Supabase client initialized.");
}

// Save multiple ISBN values to your Supabase database.
// This inserts into the Transmitted_ISBN table with fields ISBN and Transmitted_Date.
async function saveIsbnToSupabase(isbnList, transmittedDate) {
  if (!supabase) {
    console.error("Supabase is not initialized yet.");
    return false;
  }

  const rows = isbnList.map((isbn) => ({ ISBN: isbn, Transmitted_Date: transmittedDate }));

  const { data, error } = await supabase
    .from("Transmitted_ISBN")
    .upsert(rows, { onConflict: "ISBN" });

  if (error) {
    console.error("Supabase insert/upsert error:", error);
    return false;
  }

  console.log(`Inserted/updated ${rows.length} ISBN records to Supabase.`, data);
  return true;
}

function formatDateMmDdYyyy(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();
  return `${month}-${day}-${year}`;
}

function isValidMmDdYyyy(value) {
  return /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])-\d{4}$/.test(value);
}

function parseIsbnList(inputValue) {
  return inputValue
    .split(/[\n,]+/) // split on newline or comma
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

// Wait until the page DOM is ready before accessing elements.
document.addEventListener("DOMContentLoaded", async function() {
  await initSupabase();

  // Find the import button on the page by its ID.
  const importBtn = document.getElementById("importBtn");

  if (!importBtn) {
    console.warn("Import button not found on this page.");
    return;
  }

  importBtn.addEventListener("click", async function() {
    const isbnInput = document.getElementById("isbn-import");
    const dateInput = document.getElementById("transmitted-date");
    const isbnRaw = isbnInput ? isbnInput.value.trim() : "";
    const isbnList = parseIsbnList(isbnRaw);
    let transmittedDate = dateInput ? dateInput.value.trim() : "";

    if (isbnList.length === 0) {
      console.warn("No ISBN entered. Please enter at least one ISBN to import.");
      return;
    }

    if (!transmittedDate) {
      transmittedDate = formatDateMmDdYyyy(new Date());
      console.log("No date entered, using today:", transmittedDate);
    } else if (!isValidMmDdYyyy(transmittedDate)) {
      console.warn("Invalid date format. Use MM-DD-YYYY.");
      return;
    }

    console.log("Import button clicked");
    console.log("ISBNs entered:", isbnList);
    console.log("Transmitted date:", transmittedDate);

    const success = await saveIsbnToSupabase(isbnList, transmittedDate);

    if (success) {
      alert(`Insert ISBN successful. ${isbnList.length} ISBN(s) added.`);
      if (isbnInput) isbnInput.value = "";
      if (dateInput) dateInput.value = "";
    } else {
      alert("Insert ISBN failed. Please try again.");
    }
  });
});