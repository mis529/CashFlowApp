
/**
 * Google Apps Script for CashFlow Pro Sync
 * 1. Open Google Sheet
 * 2. Extensions > Apps Script
 * 3. Paste this code
 * 4. Deploy > New Deployment > Web App
 * 5. Set 'Who has access' to 'Anyone'
 */

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const data = JSON.parse(e.postData.contents);
    
    // Check if headers exist, if not, create them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Date", "From", "To", "Type", "Amount", "Note", "ID"]);
      sheet.getRange(1, 1, 1, 7).setFontWeight("bold").setBackground("#f3f4f6");
    }

    sheet.appendRow([
      data.date,
      data.from,
      data.to,
      data.type,
      data.amount,
      data.note || "",
      data.id
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
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const rows = sheet.getDataRange().getValues();
    
    if (rows.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify([]))
        .setMimeType(ContentService.MimeType.JSON);
    }

    const headers = rows[0];
    const transactions = rows.slice(1).map(row => {
      const obj = {};
      headers.forEach((header, index) => {
        const key = header.toLowerCase();
        let value = row[index];
        // Handle date conversion if necessary
        if (key === 'date' && value instanceof Date) {
          value = value.toISOString();
        }
        obj[key] = value;
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(transactions))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ "error": error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
