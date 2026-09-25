const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1eH4sA1zXZ0qd4EU0doJwgPVzffUS-NSnwxF_1a6u3ik';
const SHEET_NAME = 'DATA';

async function getGoogleAccessToken() {
  try {
    let creds = null;
    const credPath = path.join(process.cwd(), 'service_account.json');
    if (fs.existsSync(credPath)) {
      creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    } else if (process.env.SERVICE_ACCOUNT_JSON) {
      creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    }

    if (!creds || !creds.client_email || !creds.private_key) {
      return null;
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
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A2:G`;
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

    // Fallback: đọc trực tiếp từ Google Sheet CSV công khai
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=0`;
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
    console.error('Lỗi đọc dữ liệu Google Sheet:', err.message);
    return [];
  }
}

async function appendToGoogleSheet(rowData) {
  try {
    const token = await getGoogleAccessToken();
    if (!token) return false;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:G:append?valueInputOption=USER_ENTERED`;
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
    console.error('Lỗi lưu Google Sheet:', err.message);
    return false;
  }
}

module.exports = {
  getGoogleSheetRows,
  appendToGoogleSheet
};
