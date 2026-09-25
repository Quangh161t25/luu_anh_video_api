const crypto = require('crypto');
const fs = require('fs');

const creds = JSON.parse(fs.readFileSync('service_account.json', 'utf8'));


async function testAuth() {
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
  const signatureInput = b64Header + '.' + b64Claim;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  
  // Format private key properly with \n
  const formattedKey = creds.private_key.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
  const signature = signer.sign(formattedKey, 'base64url');
  const jwt = signatureInput + '.' + signature;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  const tokenJson = await tokenRes.json();
  console.log('Token response:', tokenJson.access_token ? 'ACCESS TOKEN GRANTED!' : tokenJson);

  if (tokenJson.access_token) {
    const sheetId = '1eH4sA1zXZ0qd4EU0doJwgPVzffUS-NSnwxF_1a6u3ik';
    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`, {
      headers: { Authorization: `Bearer ${tokenJson.access_token}` }
    });
    const sheetData = await sheetRes.json();
    console.log('Sheet metadata:', JSON.stringify(sheetData));

    // Append to sheet DATA
    const nowObj = new Date();
    const d = String(nowObj.getDate()).padStart(2, '0');
    const m = String(nowObj.getMonth() + 1).padStart(2, '0');
    const y = nowObj.getFullYear();
    const hh = String(nowObj.getHours()).padStart(2, '0');
    const mm = String(nowObj.getMinutes()).padStart(2, '0');
    const ss = String(nowObj.getSeconds()).padStart(2, '0');

    const ngay = `${d}/${m}/${y}`;
    const ngay_gio = `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
    const id = Date.now().toString();

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/DATA!A:G:append?valueInputOption=USER_ENTERED`;
    const appendRes = await fetch(appendUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [[id, ngay, ngay_gio, 'MP4', 'https://res.cloudinary.com/qeld2qwe/video/upload/sample.mp4', 'sample_video.mp4', 'Tải lên từ Web API Hub']]
      })
    });
    const appendData = await appendRes.json();
    console.log('Append result:', JSON.stringify(appendData));
  }
}

testAuth();
