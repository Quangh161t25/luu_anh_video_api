const fs = require('fs');
const path = require('path');
const apiHandler = require('./api/index');

module.exports = (req, res) => {
  const url = (req.url || '/').split('?')[0];

  // Phục vụ giao diện HTML
  if (url === '/' || url === '/index.html') {
    const filePath = path.join(__dirname, 'index.html');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(fs.readFileSync(filePath));
    }
  }

  if (url === '/gallery' || url === '/gallery.html') {
    const filePath = path.join(__dirname, 'gallery.html');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(fs.readFileSync(filePath));
    }
  }

  if (url === '/player' || url === '/player.html') {
    const filePath = path.join(__dirname, 'player.html');
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.end(fs.readFileSync(filePath));
    }
  }

  // Xử lý các request API
  return apiHandler(req, res);
};
