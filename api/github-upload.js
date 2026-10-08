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

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'error', message: 'Method Not Allowed' }));
    return;
  }

  try {
    let payload = req.body;
    if (!payload) {
      payload = await new Promise((resolve) => {
        let raw = '';
        req.on('data', chunk => raw += chunk);
        req.on('end', () => {
          try { resolve(JSON.parse(raw || '{}')); } catch(e) { resolve({}); }
        });
      });
    } else if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) { payload = {}; }
    }

    const { token, repo, branch, path: filePath, content, message } = payload;
    if (!token || !repo || !filePath || !content) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      return res.end(JSON.stringify({ status: 'error', message: 'Thiếu thông tin upload GitHub' }));
    }

    const ghRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'Media-Cloud-Hub-App'
      },
      body: JSON.stringify({
        message: message || `Upload media: ${filePath}`,
        content: content,
        branch: branch || 'main'
      })
    });

    const ghData = await ghRes.json();
    if (ghRes.ok) {
      const cdnUrl = `https://cdn.jsdelivr.net/gh/${repo}@${branch || 'main'}/${filePath}`;
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ status: 'success', data: ghData, url: cdnUrl }));
    } else {
      res.statusCode = ghRes.status;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ status: 'error', message: ghData.message || 'Lỗi từ GitHub API' }));
    }
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ status: 'error', message: err.message }));
  }
};
