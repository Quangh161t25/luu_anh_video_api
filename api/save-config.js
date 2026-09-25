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
    res.status(200).end();
    return;
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
      body = JSON.parse(body);
    }
    const success = await saveGoogleSheetConfig(body);
    if (success) {
      res.status(200).json({ status: 'success', message: 'Đã lưu cấu hình vào Google Sheet [API]' });
    } else {
      res.status(500).json({ status: 'error', message: 'Không thể ghi vào Google Sheet [API]' });
    }
  } catch (err) {
    console.error('Lỗi save-config API:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
