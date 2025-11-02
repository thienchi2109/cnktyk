# Hướng Dẫn Người Dùng: Sao Lưu & Dọn Dẹp Minh Chứng

## 1. Tổng Quan
- **Đối tượng:** Quản trị viên Sở Y Tế (SoYTe).
- **Mục tiêu:** Tạo bản sao lưu minh chứng theo khoảng thời gian, tải về an toàn và dọn dẹp dung lượng lưu trữ khi đã sao lưu thành công.
- **Giới hạn hệ thống:** Tối đa 2.000 tệp cho mỗi gói sao lưu; thao tác xóa giới hạn 5.000 tệp/lần và yêu cầu sao lưu trong vòng 24 giờ trước đó.

## 2. Quy Trình Sao Lưu
1. **Chọn khoảng thời gian:**
   - Mở `Sở Y Tế → Trung tâm sao lưu`.
   - Chọn ngày bắt đầu/kết thúc hoặc sử dụng preset (1 tháng, 3 tháng, 6 tháng, 1 năm).
   - Đảm bảo khoảng thời gian không vượt quá 365 ngày và ngày kết thúc không ở tương lai.
2. **Xem ước tính:**
   - Khối "Ước tính sao lưu" hiển thị tổng số tệp, dung lượng nén dự kiến và thời gian tải xuống dự kiến (giả định đường truyền 5 MB/s và tỷ lệ nén 0,82).
   - Cảnh báo sẽ xuất hiện khi số lượng tệp gần chạm giới hạn 2.000 hoặc khi thiếu dữ liệu dung lượng.
3. **Bắt đầu sao lưu:**
   - Nhấn **"Tạo gói sao lưu"**.
   - Trình duyệt sẽ tải luồng ZIP; thanh tiến trình hiển thị số tệp và dung lượng đã tải.
4. **Hoàn tất tải xuống:**
   - Lưu tệp `CNKTYKLT_Backup_{start}_to_{end}.zip` vào vị trí lưu trữ an toàn.
   - Hệ thống tự ghi nhận bản sao lưu vào bảng `SaoLuuMinhChung` và nhật ký hệ thống.

### 2.1 Phục Hồi (Restore) Thủ Công
Hiện tại nền tảng chưa hỗ trợ khôi phục tự động. Để phục hồi:
1. Giải nén gói ZIP.
2. Xác định tệp cần đưa trở lại dựa trên `BACKUP_MANIFEST.json`.
3. Tải lại tệp thông qua tính năng tải minh chứng (upload) trong hệ thống.
4. Cập nhật hồ sơ thủ công và ghi chú vào nhật ký nội bộ.

## 3. Khuyến Nghị Tần Suất Sao Lưu
| Quy mô đơn vị | Số lượng minh chứng/tháng | Tần suất đề xuất |
|---------------|---------------------------|------------------|
| < 500 tệp     | Thấp                      | 1 lần/tháng |
| 500–1.500 tệp | Trung bình                | 2 tuần/lần |
| > 1.500 tệp   | Cao                       | Hàng tuần |

- Thực hiện sao lưu bổ sung trước các chiến dịch dọn dẹp lớn hoặc trước khi triển khai tính năng mới.
- Lưu lịch sử tải xuống tối thiểu 12 tháng để phục vụ kiểm định.

## 4. Lưu Trữ Sau Sao Lưu
- **Bản chính (Primary):** Lưu trên kho lưu trữ đám mây có mã hóa (VD: Google Drive doanh nghiệp, OneDrive for Business) với thư mục chuyên biệt.
- **Bản phụ (Secondary):** Lưu trên thiết bị ngoại tuyến (NAS nội bộ, ổ cứng ngoài) đặt tại phòng CNTT an toàn.
- **Chính sách đặt tên:** `YYYY-MM-DD_CNKTYKLT_Backup_{range}.zip` kèm nhãn người tạo.
- **Kiểm tra định kỳ:** Hàng quý xác minh khả năng giải nén và truy cập tệp.

## 5. Hướng Dẫn Xóa Minh Chứng Sau Sao Lưu
1. Đảm bảo đã tải thành công gói sao lưu phù hợp trong 24 giờ gần nhất.
2. Chọn khoảng thời gian trùng khớp với gói đã sao lưu.
3. Nhấn **"Xóa sau khi sao lưu"** và hoàn tất 3 bước xác nhận.
4. Nhập chính xác `DELETE` để kích hoạt nút xác nhận cuối.
5. Theo dõi thông báo kết quả (số lượng xóa thành công/thất bại, dung lượng giải phóng).

### 5.1 Nguyên Tắc
- Chỉ xóa các minh chứng đã sao lưu và không còn nhu cầu xử lý nội bộ.
- Nếu có tệp thất bại, tải báo cáo lỗi và xử lý thủ công trước khi xóa lại.
- Sau khi xóa, đảm bảo nhật ký `XoaMinhChung` ghi nhận đầy đủ.

## 6. Câu Hỏi Thường Gặp (FAQ)
**Hỏi:** Tại sao không tải được gói sao lưu?
- **Đáp:** Kiểm tra kết nối mạng, đảm bảo trình duyệt hỗ trợ `ReadableStream`, thử lại với phạm vi nhỏ hơn nếu vượt quá 2.000 tệp.

**Hỏi:** Vì sao thời gian ước tính dài hơn thực tế?
- **Đáp:** Hệ thống giả định băng thông 5 MB/s. Nếu đường truyền nhanh hơn/thấp hơn, thời gian thực tế sẽ khác.

**Hỏi:** Có thể xóa minh chứng mà không gõ "DELETE" không?
- **Đáp:** Không. Chuỗi này là cơ chế bắt buộc nhằm phòng tránh thao tác nhầm.

**Hỏi:** Tôi có thể dừng xóa giữa chừng không?
- **Đáp:** Thao tác xóa diễn ra theo từng tệp; khi xảy ra lỗi, tiến trình dừng lại và trả về danh sách tệp lỗi. Bạn cần khởi động lại sau khi xử lý.

**Hỏi:** Muốn phục hồi minh chứng đã xóa thì sao?
- **Đáp:** Sử dụng bản sao lưu gần nhất, tải lên lại thủ công và ghi chú nguyên nhân trong nhật ký nội bộ.

## 7. Xử Lý Sự Cố
| Triệu chứng | Nguyên nhân khả dĩ | Hướng xử lý |
|-------------|---------------------|-------------|
| Lỗi 400: "Khoảng thời gian không được vượt quá 1 năm" | Ngày bắt đầu/kết thúc sai hoặc vượt giới hạn | Điều chỉnh lại khoảng thời gian ≤ 365 ngày |
| Lỗi 403: "Chỉ tài khoản Sở Y tế mới có quyền..." | Tài khoản không thuộc vai trò SoYTe | Đăng nhập bằng tài khoản SoYTe hoặc liên hệ quản trị hệ thống |
| Lỗi 404 khi sao lưu | Không có minh chứng trong phạm vi | Kiểm tra lại bộ lọc; đảm bảo hoạt động đã được duyệt |
| ZIP tải về bị hỏng | Tải xuống bị gián đoạn | Tải lại gói sao lưu; kiểm tra dung lượng tệp so với header tiến trình |
| Không thể xóa vì không có sao lưu 24h gần nhất | Chưa tạo sao lưu hoặc sao lưu thất bại | Tạo gói sao lưu mới cùng phạm vi rồi thử xóa lại |

## 8. Nhật Ký & Báo Cáo
- Mỗi thao tác sao lưu/xóa đều tạo bản ghi trong `NhatKyHeThong` với địa chỉ IP, thời gian và thống kê.
- Trong giao diện "Lịch sử sao lưu", có thể xem 6 thao tác gần nhất cùng chú thích.
- Xuất báo cáo tháng bằng cách tải CSV nhật ký (tính năng trong backlog) hoặc trích xuất trực tiếp từ cơ sở dữ liệu.

---
**Liên hệ hỗ trợ:** đội vận hành CNKTYKLT (`ops@cnktyklt.vn`) hoặc nhóm CNTT Sở Y Tế phòng Quản lý dữ liệu.
