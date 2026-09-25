const { getGoogleSheetRows } = require('./_sheets');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const rows = await getGoogleSheetRows();
    res.statusCode = 200;
    res.end(JSON.stringify({ status: 'success', data: rows }));
  } catch (err) {
    res.statusCode = 500;
    res.end(JSON.stringify({ status: 'error', message: err.message }));
  }
};
