const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1eH4sA1zXZ0qd4EU0doJwgPVzffUS-NSnwxF_1a6u3ik';
const DATA_SHEET_NAME = 'DATA';
const API_SHEET_NAME = 'API';

const DEFAULT_SERVICE_ACCOUNT = {
  client_email: 'ca-nhan@h161-508101.iam.gserviceaccount.com',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC1XkzwY+oHzPmN\nYnJ+sMKxe5TRTp8Md0Jb+PFApojE72HcVnXj14zFxFocyCPX1+dtwXJGJ/sSCyAh\niV3OtLEpxRU5QJponFszl9X6vmdLzDbzQS7VQTqMPv0JB+lHEYMU2B37hcIfpfJO\n+l6EMprUA7NJtmeJpqmXKjsov6Rdt61sjyH/LKaYj0T2sLGazgZesp96sEOu83HM\nnl+KPk9xafPOlKaE34Bk6zl4D8lFUK3v7opndvt/7IOBQ/RdI7p0v+HeOORGUuZW\nkW3GH1vo6xY/uyrtmjD7+18w5vmAIRm24Satu0MJYz+j1JtqV4U5wwDkNelXBAWz\nhKkfl5yxAgMBAAECggEAA9pDk+Epc943qFhQoo6Oai77+ai8AeuoHBRJCqSm99j2\naRPol+0Im1xZBi69rSxzyO3wp5sajxbvqSq19Im70C10rpVH2mRE3y8Q321LPC3T\ntn3aWPMUY22Emjwh6U2uzULsex7roVi48ZLJrnD1Pz7vYGfYofDJfjGqVUqh2xA+\nOSiz/U2JFTmePtrhxQGwaS8PHWyyUd+aiHz7pBg+tNzX0L+rMirPsN6i/ph+QolS\n4YXubv94O/WL92helDjQuUyWbisYdkuLp2XxnB+5Oa/2fQY7+rhju4pcIm+zA+Wc\nGdSzvLtL5hY9vLrZ8e4n0E/saILqViHSkRFksV1PaQKBgQDmEDaYQxmBeQsDbRJN\nBLg5lNBCgEWWkW/GNcL9cT+IcmNSyiPAnk2jofQpvmbbBh1lYeCbOhE4HDotN8a8\nhc1uRLb4K17fofhGV/znXW9Y12NcwZTkL5u4kKwDy8Qfx3PfckeLxA1s/3oS01tF\nwrybv1aB3Vxain5axUps5v0x6QKBgQDJ0Ld9nqXGBrknORjF1uQ7vpp5wp4Haohy\nFVNNfMzjKGRzKl8d4TxPVrUpShYBQE+v1pCwahOXCefovff32mQHzg4oVeml3bQq\notLFVVcydb1L8RY1R+QLbiqRy6Pnv5h4pB82eWg1i7xKuZvxZ68v6iPpEz+8zx0F\nFJ9IGolPiQKBgBRF03nBV+sHzoejwdwVkWJJkbx6bydgc3gE3sTUiOOuKMBv3Yyo\npnDH4asYAxpDxK1dXZxwFnpaSmoXoySTqdGQrorZz4dnT2hrcna0zg4HFNNkn4ko\nBNHTtcSz3Plr6vMCr/lJ8mDrdkdYZo+UJGiZCLdy2SOFVrMK9Y75H9CZAoGBAJcl\njTc06VztTiA1H/uT3K1uLA2DF43gWL5wgEopbN24M7sZAdHEDcIx405AIUjgnI3J\n+eVWHMPi9GAYXq2vT3mU9n95EJtb9wJznb2TE9JD4fkNX5+Z7w4sfQ9iX6hCk3PP\nH11SAh0QQX4JkuRyzf7pselutC65Qze54S1ESpBZAoGACkqjFmmF9I9jLZfJdWJM\nhOdPNHJD8NcM7ixbO9FBMw6S7PeUE//IuKQQcnxm9FsxCFVo2Q16+XKYLryZ/QxD\ncRUVkq/nAg4IB78jDp5Yc3n5VXAr10zWHWNFwVbdcZAs3BT9Q4WacASPdyowQPx0\nJYdnFqf9hx1XKT04zZ49M7w=\n-----END PRIVATE KEY-----\n'
};

async function getGoogleAccessToken() {
  try {
    let creds = null;
    const credPath = path.join(process.cwd(), 'service_account.json');
    if (fs.existsSync(credPath)) {
      try {
        creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      } catch(e) {}
    } else if (process.env.SERVICE_ACCOUNT_JSON) {
      try {
        creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
      } catch(e) {}
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      try {
        creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
      } catch(e) {}
    }

    if (!creds || !creds.client_email || !creds.private_key) {
      creds = DEFAULT_SERVICE_ACCOUNT;
    }

    const header = { alg: 'RS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const claim = {
      iss: creds.client_email,
      scope: 'https://www.googleapis.com/auth/spreadsheets',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now
    };

    const b64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
    const b64Claim = Buffer.from(JSON.stringify(claim)).toString('base64url');
    const signatureInput = `${b64Header}.${b64Claim}`;

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(creds.private_key, 'base64url');
    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt
      })
    });
    const data = await res.json();
    return data.access_token || null;
  } catch (err) {
    console.error('Lỗi xác thực Google Service Account:', err.message);
    return null;
  }
}

async function getGoogleSheetRows() {
  try {
    const token = await getGoogleAccessToken();
    if (token) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${DATA_SHEET_NAME}!A2:G`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.values) {
        return data.values.map(row => ({
          id: row[0] || '',
          ngay: row[1] || '',
          ngay_gio: row[2] || '',
          dinh_dang: row[3] || 'FILE',
          link: row[4] || '',
          ten: row[5] || '',
          ghi_chu: row[6] || ''
        }));
      }
    }

    // Fallback: đọc trực tiếp từ Google Sheet CSV công khai tab DATA
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${DATA_SHEET_NAME}`;
    const csvRes = await fetch(csvUrl);
    if (csvRes.ok) {
      const csvText = await csvRes.text();
      const lines = csvText.split('\n');
      const results = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 5 && cols[4] && cols[4].startsWith('http')) {
          results.push({
            id: cols[0] || Date.now().toString(),
            ngay: cols[1] || '',
            ngay_gio: cols[2] || '',
            dinh_dang: cols[3] || 'FILE',
            link: cols[4] || '',
            ten: cols[5] || ('file_' + i),
            ghi_chu: cols[6] || ''
          });
        }
      }
      return results;
    }
    return [];
  } catch (err) {
    console.error('Lỗi đọc dữ liệu Google Sheet DATA:', err.message);
    return [];
  }
}

async function appendToGoogleSheet(rowData) {
  try {
    const token = await getGoogleAccessToken();
    if (!token) return false;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${DATA_SHEET_NAME}!A:G:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: [rowData] })
    });
    const result = await res.json();
    return !!result.updates;
  } catch (err) {
    console.error('Lỗi lưu Google Sheet DATA:', err.message);
    return false;
  }
}

// Lấy cấu hình các API từ tab API của Google Sheet
async function getGoogleSheetConfig() {
  try {
    const token = await getGoogleAccessToken();
    if (token) {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${API_SHEET_NAME}!A2:D50`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.values) {
        const config = {};
        data.values.forEach(row => {
          if (row[0]) {
            config[row[0].trim()] = (row[1] !== undefined && row[1] !== null) ? row[1].trim() : '';
          }
        });
        return config;
      }
    }

    // Fallback: đọc qua gviz CSV tab API
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${API_SHEET_NAME}`;
    const csvRes = await fetch(csvUrl);
    if (csvRes.ok) {
      const csvText = await csvRes.text();
      const lines = csvText.split('\n');
      const config = {};
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.replace(/^"|"$/g, '').trim());
        if (cols.length >= 2 && cols[0]) {
          config[cols[0]] = cols[1] || '';
        }
      }
      return config;
    }
    return {};
  } catch (err) {
    console.error('Lỗi đọc cấu hình từ Google Sheet API:', err.message);
    return {};
  }
}

// Lưu cấu hình các API vào tab API của Google Sheet
async function saveGoogleSheetConfig(configObj) {
  try {
    const token = await getGoogleAccessToken();
    if (!token) return false;

    const descMap = {
      cld_name: 'Cloudinary Cloud Name (Ví dụ: demo, dxx...)',
      cld_preset: 'Cloudinary Upload Preset (Unsigned)',
      catbox_userhash: 'Catbox.moe User Hash (Lưu vĩnh viễn vào tài khoản)',
      litter_time: 'Litterbox Thời gian hết hạn (1h, 12h, 24h, 72h)',
      tg_token: 'Telegram Bot Token (Ví dụ: 123456:ABC-DEF...)',
      tg_chatid: 'Telegram Channel / Group Chat ID (Ví dụ: @kenhcuatoi hoặc -100xxx)',
      dood_key: 'DoodStream API Key',
      sb_url: 'Supabase Project URL (https://xyz.supabase.co)',
      sb_key: 'Supabase Anon Public Key',
      sheet_webapp_url: 'Google Apps Script WebApp URL (Dự phòng)'
    };

    // Đọc trước để giữ lại mô tả của các key tùy chỉnh khác
    try {
      const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${API_SHEET_NAME}!A2:D50`;
      const readRes = await fetch(readUrl, { headers: { Authorization: `Bearer ${token}` } });
      const readData = await readRes.json();
      if (readData.values) {
        readData.values.forEach(r => {
          if (r[0] && r[2]) descMap[r[0].trim()] = r[2].trim();
        });
      }
    } catch(e) {}

    const nowObj = new Date();
    const d = String(nowObj.getDate()).padStart(2, '0');
    const m = String(nowObj.getMonth() + 1).padStart(2, '0');
    const y = nowObj.getFullYear();
    const hh = String(nowObj.getHours()).padStart(2, '0');
    const mm = String(nowObj.getMinutes()).padStart(2, '0');
    const ss = String(nowObj.getSeconds()).padStart(2, '0');
    const timeStr = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;

    const keys = Object.keys(descMap);
    // Thêm các key mới nếu có trong configObj
    if (configObj && typeof configObj === 'object') {
      Object.keys(configObj).forEach(k => {
        if (!keys.includes(k)) keys.push(k);
      });
    }

    const rows = [['key', 'value', 'mo_ta', 'ngay_cap_nhat']];
    keys.forEach(k => {
      const val = (configObj && configObj[k] !== undefined && configObj[k] !== null) ? String(configObj[k]) : '';
      const desc = descMap[k] || 'Cấu hình API';
      rows.push([k, val, desc, timeStr]);
    });

    const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${API_SHEET_NAME}!A1:D${rows.length}?valueInputOption=USER_ENTERED`;
    const updateRes = await fetch(updateUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values: rows })
    });
    const result = await updateRes.json();
    return !!result.updatedRows;
  } catch (err) {
    console.error('Lỗi ghi cấu hình vào Google Sheet API:', err.message);
    return false;
  }
}

module.exports = {
  getGoogleSheetRows,
  appendToGoogleSheet,
  getGoogleSheetConfig,
  saveGoogleSheetConfig
};
