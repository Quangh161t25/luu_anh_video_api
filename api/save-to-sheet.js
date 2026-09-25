const { appendToGoogleSheet } = require('./_sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

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
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: success ? 'success' : 'error',
      message: success ? 'Đã lưu thành công vào Google Sheet DATA!' : 'Không thể lưu vào Google Sheet'
    }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ status: 'error', message: err.message }));
  }
};
