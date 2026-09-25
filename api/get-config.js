const { getGoogleSheetConfig } = require('./_sheets');

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
    const config = await getGoogleSheetConfig();
    res.status(200).json({ status: 'success', data: config });
  } catch (err) {
    console.error('Lỗi get-config API:', err.message);
    res.status(500).json({ status: 'error', message: err.message });
  }
};
