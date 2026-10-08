/**
 * MÃ GOOGLE APPS SCRIPT CHO GOOGLE SHEET: luu_anh_video_api
 * Bảng tính: https://docs.google.com/spreadsheets/d/1eH4sA1zXZ0qd4EU0doJwgPVzffUS-NSnwxF_1a6u3ik/edit
 * Sheet: DATA
 * Các cột: id, ngay, ngay_gio, dinh_dang, link, tên, ghi chú
 */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName("DATA");

    // Nếu chưa có sheet DATA thì tự động tạo và thêm tiêu đề
    if (!sheet) {
      sheet = ss.insertSheet("DATA");
      sheet.appendRow(["id", "ngay", "ngay_gio", "dinh_dang", "link", "tên", "ghi chú"]);
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(["id", "ngay", "ngay_gio", "dinh_dang", "link", "tên", "ghi chú"]);
    }

    var data = JSON.parse(e.postData.contents);

    // Ghi 1 hàng mới gồm 7 cột theo đúng yêu cầu
    sheet.appendRow([
      data.id || new Date().getTime().toString(),
      data.ngay || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy"),
      data.ngay_gio || Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy HH:mm:ss"),
      data.dinh_dang || "MP4",
      data.link || "",
      data.ten || "",
      data.ghi_chu || ""
    ]);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "success", message: "Đã lưu vào sheet DATA thành công!" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
