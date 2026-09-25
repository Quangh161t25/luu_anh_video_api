# 🎬 HỆ THỐNG TẢI LÊN VIDEO & TỰ ĐỘNG LƯU GOOGLE SHEET API

Hệ thống cho phép bạn tải video lên các nền tảng đám mây (Cloudinary, Telegram Cloud API, Litterbox, DoodStream, Supabase, GoFile hoặc Server riêng), nhận **direct link video** và **tự động lưu dữ liệu vào Google Sheet `DATA`**.

---

## 📊 THÔNG TIN GOOGLE SHEET ĐÃ KẾT NỐI

- **Google Sheet Link**: [luu_anh_video_api - Google Trang tính](https://docs.google.com/spreadsheets/d/1eH4sA1zXZ0qd4EU0doJwgPVzffUS-NSnwxF_1a6u3ik/edit?gid=0#gid=0)
- **Tên Sheet (Tab)**: `DATA`
- **7 Cột Dữ Liệu Tự Động Ghi**:
  1. `id`: Mã định danh thời gian thực
  2. `ngay`: Ngày tải lên (`DD/MM/YYYY`)
  3. `ngay_gio`: Thời gian chi tiết (`DD/MM/YYYY HH:MM:SS`)
  4. `dinh_dang`: Định dạng file (`MP4`, `MKV`, `WEBM`,...)
  5. `link`: Đường link trực tiếp của video
  6. `tên`: Tên file video gốc
  7. `ghi chú`: Nền tảng lưu trữ đã chọn

- **Tài khoản Service Account**: `ca-nhan@h161-508101.iam.gserviceaccount.com`

---

## 🚀 CÁCH KHỞI ĐỘNG VÀ SỬ DỤNG

### Cách 1: Chạy 1-Click (Khuyên dùng)
1. Nhấp đúp vào file **`Chay_Server_Vinh_Vien.bat`**.
2. Trình duyệt sẽ tự động mở trang web tại: **`http://localhost:5000`**.
3. Chọn nền tảng đám mây bạn muốn $\rightarrow$ Chọn video $\rightarrow$ Bấm **"Tải Video Lên & Tự Động Lưu Vào Google Sheet"**.
4. Video được tải lên và thông tin sẽ **tự động xuất hiện ngay lập tức trong Google Sheet `DATA`**!

---

## 📂 DANH SÁCH FILE TRONG THƯ MỤC (`D:\tải xuống 2\html tải video\`)

1. **`index.html`**: Giao diện Web hiện đại, chọn nền tảng, kéo thả video, xem preview và kết nối Google Sheet.
2. **`server.js`**: Máy chủ Node.js xử lý xác thực Google Service Account và ghi dữ liệu tự động vào Google Sheet.
3. **`service_account.json`**: File thông tin xác thực Google Service Account (đã khôi phục RSA Private Key chuẩn 100%).
4. **`Chay_Server_Vinh_Vien.bat`**: File chạy máy chủ 1-click cho Windows.
5. **`google_apps_script.js`**: Mã nguồn Apps Script dự phòng (nếu muốn triển khai Webhook không cần chạy máy chủ Node.js).
