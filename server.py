import http.server
import socketserver
import os
import cgi
import json
import urllib.parse

PORT = 5000
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')

if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

class VideoUploadHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/upload':
            try:
                ctype, pdict = cgi.parse_header(self.headers.get('content-type'))
                if ctype == 'multipart/form-data':
                    pdict['boundary'] = bytes(pdict['boundary'], "utf-8")
                    fields = cgi.parse_multipart(self.rfile, pdict)
                    
                    file_data = fields.get('video') or fields.get('file')
                    if file_data and len(file_data) > 0:
                        raw_bytes = file_data[0]
                        # Create filename
                        import time
                        filename = f"video_{int(time.time())}.mp4"
                        file_path = os.path.join(UPLOAD_DIR, filename)
                        
                        with open(file_path, 'wb') as f:
                            f.write(raw_bytes)
                        
                        video_url = f"http://localhost:{PORT}/uploads/{filename}"
                        
                        self.send_response(200)
                        self.send_header('Content-Type', 'application/json')
                        self.end_headers()
                        response = {
                            "status": "success",
                            "message": "Upload thành công (Lưu vĩnh viễn)",
                            "url": video_url,
                            "filename": filename
                        }
                        self.wfile.write(json.dumps(response).encode('utf-8'))
                        return

                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": "Không tìm thấy file"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

print(f"🚀 Server lưu trữ video vĩnh viễn đang chạy tại: http://localhost:{PORT}")
print(f"📁 Thư mục lưu video: {UPLOAD_DIR}")
print("Bấm Ctrl + C để dừng server.")

with socketserver.TCPServer(("", PORT), VideoUploadHandler) as httpd:
    httpd.serve_forever()
