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
    res.statusCode = 200;
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const config = await getGoogleSheetConfig();
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'success', data: config }));
  } catch (err) {
    console.error('Lỗi get-config API:', err.message);
    res.statusCode = 500;
    res.end(JSON.stringify({ status: 'error', message: err.message }));
  }
};
