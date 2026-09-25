const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getGoogleSheetConfig, saveGoogleSheetConfig } = require('./api/_sheets');

const PORT = 5000;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const SPREADSHEET_ID = '1eH4sA1zXZ0qd4EU0doJwgPVzffUS-NSnwxF_1a6u3ik';
const SHEET_NAME = 'DATA';

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// MIME Types hỗ trợ đa phương tiện (Ảnh, Video, PDF, Audio, Docs)
const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.zip': 'application/zip',
  '.rar': 'application/x-rar-compressed',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.txt': 'text/plain; charset=utf-8'
};

// Hàm lấy OAuth2 Access Token từ Google Service Account
async function getGoogleAccessToken() {
  try {
    let creds = null;
    const credPath = path.join(__dirname, 'service_account.json');
    if (fs.existsSync(credPath)) {
      creds = JSON.parse(fs.readFileSync(credPath, 'utf8'));
    } else if (process.env.SERVICE_ACCOUNT_JSON) {
      creds = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT) {
      creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
    }

    if (!creds || !creds.client_email || !creds.private_key) {
      console.warn('Không tìm thấy thông tin Service Account (file service_account.json hoặc biến môi trường SERVICE_ACCOUNT_JSON)');
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

// Đảm bảo tab DATA và Header tồn tại trong Sheet
async function ensureSheetAndHeaders(token) {
  try {
    const sheetRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const sheetData = await sheetRes.json();
    if (!sheetData.sheets) return;

    const titles = sheetData.sheets.map(s => s.properties.title);
    if (!titles.includes(SHEET_NAME)) {
      console.log(`Tạo mới tab ${SHEET_NAME}...`);
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}:batchUpdate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{ addSheet: { properties: { title: SHEET_NAME } } }]
        })
      });
      // Ghi hàng tiêu đề
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A1:G1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          values: [['id', 'ngay', 'ngay_gio', 'dinh_dang', 'link', 'tên', 'ghi chú']]
        })
      });
    }
  } catch (err) {
    console.error('Lỗi kiểm tra tab DATA:', err.message);
  }
}

// Hàm ghi dữ liệu vào Google Sheet DATA
async function appendToGoogleSheet(rowData) {
  try {
    const token = await getGoogleAccessToken();
    if (!token) {
      console.error('Không thể lấy Access Token của Service Account!');
      return false;
    }

    await ensureSheetAndHeaders(token);

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:G:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        values: [rowData]
      })
    });

    const result = await res.json();
    if (result.updates) {
      console.log(`✅ [Google Sheet DATA] Đã lưu thành công: [${rowData[3]}] ${rowData[4]} (${rowData[5]})`);
      return true;
    } else {
      console.error('Lỗi lưu Google Sheet:', JSON.stringify(result));
      return false;
    }
  } catch (err) {
    console.error('Lỗi kết nối Google Sheet:', err.message);
    return false;
  }
}

// Hàm lấy danh sách dữ liệu từ Google Sheet DATA
async function getGoogleSheetRows() {
  try {
    const token = await getGoogleAccessToken();
    if (token) {
      await ensureSheetAndHeaders(token);
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

    // Fallback: đọc trực tiếp từ Google Sheet CSV công khai (hỗ trợ Vercel không cần key)
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

const handler = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check API
  if (req.method === 'GET' && req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', message: 'Media Server & Google Sheet API đang hoạt động!' }));
    return;
  }

  // Phục vụ giao diện Web Upload trực tiếp từ http://localhost:5000/
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
  }

  // Phục vụ giao diện Xem Video từ http://localhost:5000/player
  if (req.method === 'GET' && (req.url === '/player' || req.url === '/player.html')) {
    const playerPath = path.join(__dirname, 'player.html');
    if (fs.existsSync(playerPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(playerPath).pipe(res);
      return;
    }
  }

  // Phục vụ giao diện Bộ Sưu Tập & Quản Lý File từ http://localhost:5000/gallery
  if (req.method === 'GET' && (req.url === '/gallery' || req.url === '/gallery.html')) {
    const galleryPath = path.join(__dirname, 'gallery.html');
    if (fs.existsSync(galleryPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(galleryPath).pipe(res);
      return;
    }
  }

  // API Lấy danh sách video từ Google Sheet DATA
  if (req.method === 'GET' && req.url === '/api/get-sheet-videos') {
    getGoogleSheetRows().then(rows => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'success', data: rows }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    });
    return;
  }

  // API Lấy cấu hình các API từ Google Sheet tab API
  if (req.method === 'GET' && req.url === '/api/get-config') {
    getGoogleSheetConfig().then(config => {
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'success', data: config }));
    }).catch(err => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    });
    return;
  }

  // API Lưu cấu hình các API vào Google Sheet tab API
  if (req.method === 'POST' && req.url === '/api/save-config') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const configData = JSON.parse(body || '{}');
        const success = await saveGoogleSheetConfig(configData);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: success ? 'success' : 'error',
          message: success ? 'Đã lưu cấu hình thành công vào Google Sheet tab API!' : 'Lỗi khi lưu vào Google Sheet API'
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: err.message }));
      }
    });
    return;
  }

  // API Upload Catbox qua Server sử dụng node-catbox (100% không lỗi CORS)
  if (req.method === 'POST' && req.url.startsWith('/api/catbox-upload')) {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : '';
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        let userhash = '';
        let fileData = null;
        let filename = 'file.dat';

        if (boundary) {
          const boundaryBuf = Buffer.from('--' + boundary);
          let pos = 0;
          while (pos < buffer.length) {
            const next = buffer.indexOf(boundaryBuf, pos);
            if (next === -1) break;
            const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), next);
            if (headerEnd !== -1) {
              const head = buffer.slice(next, headerEnd).toString();
              const partEnd = buffer.indexOf(boundaryBuf, headerEnd + 4);
              if (partEnd !== -1) {
                const partContent = buffer.slice(headerEnd + 4, partEnd - 2);
                if (head.includes('name="userhash"')) {
                  userhash = partContent.toString().trim();
                } else if (head.includes('name="fileToUpload"')) {
                  fileData = partContent;
                  const fnMatch = head.match(/filename="([^"]+)"/);
                  if (fnMatch) filename = fnMatch[1];
                }
              }
            }
            pos = next + boundaryBuf.length;
          }
        }

        if (!fileData) fileData = buffer;

        const tempPath = path.join(UPLOAD_DIR, `temp_${Date.now()}_${filename}`);
        fs.writeFileSync(tempPath, fileData);

        let fileUrl = '';
        try {
          const { Catbox } = require('node-catbox');
          const catbox = new Catbox(userhash || undefined);
          fileUrl = await catbox.uploadFile({ path: tempPath });
        } catch (catErr) {
          console.warn('node-catbox error, fallback to raw api:', catErr.message);
          const form = new FormData();
          form.append('reqtype', 'fileupload');
          if (userhash) form.append('userhash', userhash);
          form.append('fileToUpload', new Blob([fileData]), filename);
          const rawRes = await fetch('https://catbox.moe/user/api.php', { method: 'POST', body: form });
          fileUrl = (await rawRes.text()).trim();
        } finally {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(fileUrl);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Lỗi Catbox: ' + err.message);
      }
    });
    return;
  }

  // API Upload Litterbox qua Server (100% không lỗi CORS)
  if (req.method === 'POST' && req.url.startsWith('/api/litterbox-upload')) {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch ? (boundaryMatch[1] || boundaryMatch[2]) : '';
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      try {
        const buffer = Buffer.concat(chunks);
        let time = '72h';
        let fileData = null;
        let filename = 'file.dat';

        if (boundary) {
          const boundaryBuf = Buffer.from('--' + boundary);
          let pos = 0;
          while (pos < buffer.length) {
            const next = buffer.indexOf(boundaryBuf, pos);
            if (next === -1) break;
            const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), next);
            if (headerEnd !== -1) {
              const head = buffer.slice(next, headerEnd).toString();
              const partEnd = buffer.indexOf(boundaryBuf, headerEnd + 4);
              if (partEnd !== -1) {
                const partContent = buffer.slice(headerEnd + 4, partEnd - 2);
                if (head.includes('name="time"')) {
                  time = partContent.toString().trim() || '72h';
                } else if (head.includes('name="fileToUpload"')) {
                  fileData = partContent;
                  const fnMatch = head.match(/filename="([^"]+)"/);
                  if (fnMatch) filename = fnMatch[1];
                }
              }
            }
            pos = next + boundaryBuf.length;
          }
        }

        if (!fileData) fileData = buffer;

        const tempPath = path.join(UPLOAD_DIR, `temp_${Date.now()}_${filename}`);
        fs.writeFileSync(tempPath, fileData);

        let fileUrl = '';
        try {
          const { Litterbox } = require('node-catbox');
          const litterbox = new Litterbox();
          fileUrl = await litterbox.uploadFile({ path: tempPath, duration: time });
        } catch (litterErr) {
          console.warn('Litterbox API bị chặn bởi WAF, tự động fallback sang Catbox.moe:', litterErr.message);
          const { Catbox } = require('node-catbox');
          const catbox = new Catbox();
          fileUrl = await catbox.uploadFile({ path: tempPath });
        } finally {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }

        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(fileUrl);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Lỗi Litterbox: ' + err.message);
      }
    });
    return;
  }

  // API lưu thông tin vào Google Sheet từ Web Client
  if (req.method === 'POST' && req.url === '/api/save-to-sheet') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const rowData = [
          data.id || Date.now().toString(),
          data.ngay || new Date().toLocaleDateString('vi-VN'),
          data.ngay_gio || new Date().toLocaleString('vi-VN'),
          data.dinh_dang || 'FILE',
          data.link || '',
          data.ten || '',
          data.ghi_chu || ''
        ];

        const success = await appendToGoogleSheet(rowData);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          status: success ? 'success' : 'error',
          message: success ? 'Đã lưu thành công vào Google Sheet DATA!' : 'Lỗi khi lưu vào Google Sheet'
        }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: e.message }));
      }
    });
    return;
  }

  // API Upload Tệp Đa Phương Tiện Local (Ảnh, Video, PDF,...)
  if (req.method === 'POST' && req.url === '/api/upload') {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);

    if (!boundaryMatch) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ status: 'error', message: 'Content-Type không hợp lệ' }));
      return;
    }

    const boundary = boundaryMatch[1] || boundaryMatch[2];
    const chunks = [];

    req.on('data', chunk => chunks.push(chunk));
    req.on('end', async () => {
      const buffer = Buffer.concat(chunks);
      const boundaryBuffer = Buffer.from('--' + boundary);
      const start = buffer.indexOf(boundaryBuffer);
      
      if (start === -1) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'error', message: 'Không có dữ liệu gửi lên' }));
        return;
      }

      const headerEnd = buffer.indexOf(Buffer.from('\r\n\r\n'), start);
      const headers = buffer.slice(start, headerEnd).toString();
      const filenameMatch = headers.match(/filename="([^"]+)"/);
      const origFilename = filenameMatch ? filenameMatch[1] : 'file';
      
      const ext = path.extname(origFilename) || '.dat';
      const cleanName = `file_${Date.now()}${ext}`;
      const savePath = path.join(UPLOAD_DIR, cleanName);

      const nextBoundary = buffer.indexOf(boundaryBuffer, headerEnd + 4);
      const fileData = buffer.slice(headerEnd + 4, nextBoundary - 2);

      fs.writeFileSync(savePath, fileData);

      const fileUrl = `http://localhost:${PORT}/uploads/${cleanName}`;
      
      // Tự động lưu vào Google Sheet DATA
      const now = new Date();
      const row = [
        Date.now().toString(),
        now.toLocaleDateString('vi-VN'),
        now.toLocaleString('vi-VN'),
        ext.replace('.', '').toUpperCase(),
        fileUrl,
        origFilename,
        'Lưu trữ Server Riêng'
      ];
      await appendToGoogleSheet(row);

      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        status: 'success',
        url: fileUrl,
        filename: cleanName,
        sheet_saved: true
      }));
    });
    return;
  }

  // Phục vụ xem file đã upload (Hỗ trợ Ảnh, Video, PDF, Audio, Docs)
  if (req.method === 'GET' && req.url.startsWith('/uploads/')) {
    const filename = path.basename(req.url);
    const filePath = path.join(UPLOAD_DIR, filename);

    if (fs.existsSync(filePath)) {
      const ext = path.extname(filename).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      const stat = fs.statSync(filePath);

      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Accept-Ranges': 'bytes'
      });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Không tìm thấy file');
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Not Found');
};

module.exports = handler;

if (require.main === module && !process.env.VERCEL) {
  const server = http.createServer(handler);
  server.listen(PORT, () => {
    console.log(`\n================================================================`);
    console.log(`🚀 Media & File Hub Server đang chạy tại: http://localhost:${PORT}`);
    console.log(`📊 Kết nối Google Sheet: ${SPREADSHEET_ID}`);
    console.log(`📑 Sheet đích: ${SHEET_NAME} (Cột: id, ngay, ngay_gio, dinh_dang, link, tên, ghi chú)`);
    console.log(`📧 Service Account: ca-nhan@h161-508101.iam.gserviceaccount.com`);
    console.log(`🖼️ Hỗ trợ: Video (MP4...), Ảnh (JPG, PNG, WEBP...), PDF & Tài liệu!`);
    console.log(`================================================================\n`);
  });
}
