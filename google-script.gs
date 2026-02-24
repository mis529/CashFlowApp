
/**
 * Google Apps Script for CashFlow Pro Sync
 * 1. Open Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this code
 * 4. Deploy > New Deployment > Web App
 * 5. Set 'Who has access' to 'Anyone'
 */

/**
 * Google Apps Script for CashFlow Pro Sync
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all code with this script.
 * 4. Click 'Deploy' > 'New Deployment'.
 * 5. Select 'Web App'.
 * 6. Set 'Execute as' to 'Me'.
 * 7. Set 'Who has access' to 'Anyone'.
 * 8. Copy the Web App URL and ensure it matches the one in your app config.
 */

const SHEET_NAME = "Sheet1"; // Default sheet name

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    // If Sheet1 doesn't exist, use the first sheet
    if (!sheet) {
      sheet = ss.getSheets()[0];
    }

    const contents = e.postData.contents;
    const data = JSON.parse(contents);
    
    // Check if headers exist, if not, create them
    if (sheet.getLastRow() === 0) {
      const headers = ["Date", "From", "To", "Type", "Amount", "PaymentMethod", "Note", "ID"];
      sheet.appendRow(headers);
      sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#f3f4f6");
    }

    sheet.appendRow([
      data.date || new Date().toISOString(),
      data.from || "Unknown",
      data.to || "Unknown",
      data.type || "CREDIT",
      data.amount || 0,
      data.paymentMethod || "GENERAL",
      data.note || "",
      data.id || Utilities.getUuid()
    ]);

    return ContentService.createTextOutput(JSON.stringify({ "result": "success", "message": "Transaction recorded" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "result": "error", "message": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // Try to find a sheet with data
    let sheet = ss.getSheetByName(SHEET_NAME);
    if (!sheet || sheet.getLastRow() <= 1) {
      const allSheets = ss.getSheets();
      for (let i = 0; i < allSheets.length; i++) {
        if (allSheets[i].getLastRow() > 1) {
          sheet = allSheets[i];
          break;
        }
      }
    }
    
    if (!sheet) sheet = ss.getSheets()[0];
    
    const rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = rows[0];
    const transactions = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let rawKey = header.toString().trim().toLowerCase();
        let key = rawKey;
        
        // Map common variations to the keys used in the React app
        if (rawKey === "paymentmethod" || rawKey === "payment method") key = "paymentMethod";
        else if (rawKey === "date") key = "date";
        else if (rawKey === "from") key = "from";
        else if (rawKey === "to") key = "to";
        else if (rawKey === "type") key = "type";
        else if (rawKey === "amount") key = "amount";
        else if (rawKey === "note") key = "note";
        else if (rawKey === "id") key = "id";
        
        let value = row[index];
        if (key === 'date' && value instanceof Date) {
          value = value.toISOString();
        }
        obj[key] = value;
      });
      return obj;
    });

    // Return JSON with headers to discourage caching
    return ContentService.createTextOutput(JSON.stringify(transactions))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
