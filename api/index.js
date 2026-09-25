const { getGoogleSheetConfig, saveGoogleSheetConfig, getGoogleSheetRows, appendToGoogleSheet } = require('./_sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  const url = req.url || '';

  // 1. Health check
  if (url.includes('/status')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'ok', message: 'Media Hub API is active!' }));
    return;
  }

  // 2. Get config from Google Sheet tab API
  if (url.includes('/get-config')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const config = await getGoogleSheetConfig();
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'success', data: config }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 3. Save config to Google Sheet tab API
  if (url.includes('/save-config')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      let body = req.body;
      if (!body) {
        body = await new Promise((resolve) => {
          let raw = '';
          req.on('data', chunk => raw += chunk);
          req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')); } catch(e) { resolve({}); }
          });
        });
      } else if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch(e) { body = {}; }
      }

      const success = await saveGoogleSheetConfig(body);
      res.statusCode = success ? 200 : 500;
      res.end(JSON.stringify({
        status: success ? 'success' : 'error',
        message: success ? 'Đã lưu cấu hình vào Google Sheet [API]' : 'Không thể lưu vào Google Sheet [API]'
      }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 4. Get videos from Google Sheet tab DATA
  if (url.includes('/get-sheet-videos')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const rows = await getGoogleSheetRows();
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'success', data: rows }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 5. Save video to Google Sheet tab DATA
  if (url.includes('/save-to-sheet')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      let data = req.body;
      if (!data) {
        data = await new Promise((resolve) => {
          let raw = '';
          req.on('data', chunk => raw += chunk);
          req.on('end', () => {
            try { resolve(JSON.parse(raw || '{}')); } catch(e) { resolve({}); }
          });
        });
      } else if (typeof data === 'string') {
        try { data = JSON.parse(data); } catch(e) { data = {}; }
      }

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
      res.statusCode = success ? 200 : 500;
      res.end(JSON.stringify({
        status: success ? 'success' : 'error',
        message: success ? 'Đã lưu thành công vào Google Sheet DATA!' : 'Lỗi khi lưu vào Google Sheet'
      }));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 'error', message: err.message }));
    }
    return;
  }

  // 6. DoodStream Server URL Proxy (Bypass CORS)
  if (url.includes('/dood-server') || url.includes('/dood')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      const key = parsedUrl.searchParams.get('key') || '578856ivpifyyfyuloy45x';
      const doodRes = await fetch(`https://doodapi.co/api/upload/server?key=${key}`);
      const doodData = await doodRes.json();
      res.statusCode = 200;
      res.end(JSON.stringify(doodData));
    } catch (err) {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 500, msg: err.message }));
    }
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = 200;
  res.end(JSON.stringify({ status: 'ok', message: 'Vercel Serverless Function Ready' }));
};
