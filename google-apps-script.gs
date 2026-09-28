// Google Apps Script — add this function into the SAME script project as
// the existing sendDailyLeadsReport() and onEdit() functions (don't
// replace them, just paste this alongside). It writes into the
// "לידים חטוב בלי תפריט" sheet/tab — same one onEdit() targets — with
// columns: שם ליד, מספר טלפון, תאריך יצירה, מקור הגעה, סטטוס, תאריך
// פולואו/חזרה הבאה, סכום סגירה, תאריך סגירה, הערות להמשך, סיבת אי סגירה.
// Then deploy as a Web App:
//   Deploy > New deployment > Type: Web app
//   Execute as: Me
//   Who has access: Anyone
// Copy the resulting URL and send it back — it goes into the site's
// GOOGLE_SHEETS_WEBHOOK_URL environment variable.
//
// Note: appendRow() called from a Web App doesn't trigger onEdit(), so
// this won't double-write the date/status that onEdit() fills in for
// manual edits — this function sets them directly instead.

function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    "לידים חטוב בלי תפריט"
  );
  var data = JSON.parse(e.postData.contents);

  var notes =
    "כמה זמן מנסה להתחיל תהליך: " + (data.duration || "-") +
    "\n" +
    "הערה: " + (data.reason || "-");

  sheet.appendRow([
    data.name || "",           // שם ליד
    data.phone || "",          // מספר טלפון
    new Date(),                // תאריך יצירה
    "מודעה ישירה",             // מקור הגעה
    "חדש",                     // סטטוס
    "",                        // תאריך פולואו/חזרה הבאה
    "",                        // סכום סגירה
    "",                        // תאריך סגירה
    notes,                     // הערות להמשך
    "",                        // סיבת אי סגירה
  ]);

  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok" })
  ).setMimeType(ContentService.MimeType.JSON);
}