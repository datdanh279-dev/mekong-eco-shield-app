# CHIẾN LƯỢC BẢO VỆ & THỐNG TRỊ THỊ TRƯỜNG
## Mekong Eco-Shield AI - Danh Đạt

---

## 1. DẤU CHÌM KỸ THUẬT SỐ & CODE POISONING (ĐÃ TRIỂN KHAI)

### Cơ chế đã cài vào code:
- **frontend/src/utils/watermark.ts** - Hệ thống watermark client-side
- **backend/app/core/watermark.py** - Hệ thống watermark server-side

### Tính năng bảo vệ:
- **Kiểm tra Origin/Package ID**: App chỉ chạy đúng trên `mekong-eco-shield.pages.dev`
- **Tự sai lệch tọa độ GPS**: Nếu chạy trên domain lạ, tọa độ tự động lệch ±5m
- **Tự sai lệch độ sâu lũ**: Nếu bị copy, kết quả dự báo lũ sẽ tính toán sai
- **Dấu chìm toán học**: Hệ số DANHDAT_CONSTANT = 1.971346895231847 chìm trong mọi hàm tính toán
- **Watermark ngược**: Có thể kiểm tra dữ liệu có chữ ký của Danh Đạt hay không

### Bằng chứng vi phạm bản quyền:
Khi đối thủ copy app, chạy trên domain của họ, dữ liệu sẽ có chứa chữ ký "DanhDat_HeThongSinhTon" trong các hằng số toán học, cho phép bạn kiện ra tòa bằng chứng không thể chối cãi.

---

## 2. CHIẾM LĨNH HIỆU ỨNG MẠNG LƯỚI (KẾ HOẠCH)

### Phủ kín địa bàn chiến lược:
1. Chọn 1-2 huyện rốn lũ ở ĐBSCL (VD: **Châu Đốc - An Giang**, **Hồng Ngự - Đồng Tháp**)
2. Phối hợp với chính quyền địa phương phát động cài đặt app
3. Cho phát điện thoại đời thấp kèm app cài sẵn (chiến thuật bao cấp)
4. Ưu đãi cho người đầu tiên kích hoạt Mesh Bluetooth trong mỗi ấp

### Tại sao đối thủ không thể cạnh tranh:
- App Mesh dựa trên mật độ người dùng
- Cả làng/xã đều dùng app của Danh Đạt, Mesh mạnh
- Đối thủ đến sau, không ai có app của họ, Mesh chết

---

## 3. ĐỘC QUYỀN HÓA NGUỒN DỮ LIỆU (KẾ HOẠCH)

### Mục tiêu: Độc quyền bản đồ DEM độ phân giải cao

### Hành động:
- Đến gặp **Cục Bản đồ - Bộ TN&MT** hoặc **Viện Khoa học Địa chất**
- Đề xuất: Cho phép truy cập độc quyền, đổi lại:
  - Cấp license miễn phí cho cơ quan nhà nước
  - Tích hợp module cảnh báo vào hệ thống của họ
  - Cung cấp dữ liệu phân tích AI miễn phí
- Kết quả: App của bạn chạy đúng, app đối thủ chỉ đường sai (do thiếu dữ liệu)

---

## 4. TRIỂN KHAI KỸ THUẬT NGAY

### Bước 1: Deploy lên Cloudflare Pages
- Frontend: https://mekong-eco-shield.pages.dev
- Backend: https://api.mekongeco.shield (cần deploy riêng)

### Bước 2: Kết nối GitHub → Cloudflare
- Vào dashboard.cloudflare.com → Pages → Connect Git
- Chọn repo `datdanh279-dev/mekong-eco-shield-app`
- Build command: `cd frontend && npm install && npm run build`

### Bước 3: Kiểm thử
- Chạy `cd frontend && npm run build` để verify build
- Kiểm tra API health: `GET /health`

---

## TÀI NGUYÊN & API

| Endpoint | Method | Mô tả |
|----------|--------|-------|
| `/watermark` | GET | Chữ ký bản quyền của Danh Đạt |
| `/watermark/verify` | POST | Xác thực package ID |
| `/health` | GET | Kiểm tra hệ thống |
| `/api/v1/auth/*` | POST | Đăng nhập/đăng ký |
| `/api/v1/farms/*` | GET/POST | Quản lý farms |
| `/api/v1/predictions/flood` | GET | Dự báo lũ |
| `/api/v1/predictions/salinity` | GET | Dự báo xâm nhập mặn |
