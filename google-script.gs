
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

const SHEET_NAME = "Sheet1"; // Ensure your sheet tab is named "Sheet1" or update this

function doPost(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
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
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = rows[0];
    const transactions = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        let key = header.toString().trim();
        // Normalize keys to camelCase
        if (key.toLowerCase() === "paymentmethod") key = "paymentMethod";
        else key = key.charAt(0).toLowerCase() + key.slice(1);
        
        let value = row[index];
        if (key === 'date' && value instanceof Date) {
          value = value.toISOString();
        }
        obj[key] = value;
      });
      return obj;
    });

    // Return JSON with CORS support via ContentService
    return ContentService.createTextOutput(JSON.stringify(transactions))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
