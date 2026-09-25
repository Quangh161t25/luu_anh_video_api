const { saveGoogleSheetConfig } = require('./_sheets');

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

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    let body = req.body;
    if (!body) {
      // Parse raw stream if not auto-parsed
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
    if (success) {
      res.statusCode = 200;
      res.end(JSON.stringify({ status: 'success', message: 'Đã lưu cấu hình vào Google Sheet [API]' }));
    } else {
      res.statusCode = 500;
      res.end(JSON.stringify({ status: 'error', message: 'Không thể ghi vào Google Sheet [API]' }));
    }
  } catch (err) {
    console.error('Lỗi save-config API:', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ status: 'error', message: err.message }));
  }
};
