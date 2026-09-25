const { appendToGoogleSheet } = require('./_sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const data = req.body || {};
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
    res.status(200).json({
      status: success ? 'success' : 'error',
      message: success ? 'Đã lưu thành công vào Google Sheet DATA!' : 'Không thể lưu vào Google Sheet'
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
};
