# Hướng Dẫn Quản Trị: Tài Liệu Kỹ Thuật Sao Lưu Minh Chứng

## 1. Phạm Vi
- **Đối tượng:** Đội vận hành hệ thống & quản trị cơ sở dữ liệu.
- **Mục tiêu:** Bảo đảm tính toàn vẹn của bản sao lưu, hiểu cấu trúc dữ liệu, quy trình khôi phục và hoạch định dung lượng lưu trữ dài hạn.

## 2. Cấu Trúc Gói ZIP
```
CNKTYKLT_Backup_{start}_to_{end}.zip
│
├── BACKUP_MANIFEST.json
├── {CCHN}_{HoTen}/
│   ├── YYYY-MM-DD_{TenHoatDong}_{R2KeyFileName}
│   └── ...
└── ... (mỗi bác sĩ một thư mục)
```

### 2.1 Quy tắc đặt tên thư mục & tệp
- **Thư mục gốc:** `{SoCCHN}_{HoVaTen}` đã được chuẩn hóa (loại bỏ ký tự đặc biệt, thay space bằng `_`, tối đa 50 ký tự).
- **Tên tệp:** `YYYY-MM-DD_{TenHoatDongSanitized}_{Tên gốc trong R2}`.
- Ba thành phần bảo đảm truy vết nhanh theo ngày, hoạt động và id tệp gốc.

## 3. BACKUP_MANIFEST.json

```jsonc
{
  "backupDate": "2025-10-31T10:15:32.123Z",
  "dateRange": {
    "start": "2025-07-01T00:00:00.000Z",
    "end": "2025-09-30T23:59:59.999Z"
  },
  "totalFiles": 148,
  "addedFiles": 146,
  "skippedCount": 2,
  "backupBy": "soyt_admin",
  "backupId": "8d6c1a5f-...",
  "totalSizeBytes": 987654321,
  "files": [
    {
      "submissionId": "de8159f0-...",
      "activityName": "Hội thảo chuyên đề",
      "practitioner": "Nguyễn Văn A",
      "cchn": "BS12345",
      "date": "2025-08-12T04:00:00.000Z",
      "filename": "evidence/abc123.pdf",
      "path": "BS12345_Nguyen_Van_A/2025-08-12_Hoi_thao_chuyen_de_abc123.pdf",
      "size": 5242880
    }
  ],
  "skippedFiles": [
    {
      "submissionId": "f29d16bd-...",
      "filename": "evidence/missing.pdf",
      "reason": "DOWNLOAD_FAILED"
    }
  ]
}
```

### 3.1 Diễn giải
- `addedFiles` + `skippedCount` = `totalFiles`.
- `backupId` ánh xạ tới bản ghi `SaoLuuMinhChung.MaSaoLuu`.
- `reason` của `skippedFiles` có thể là `DOWNLOAD_FAILED` hoặc `STREAM_ERROR`; cần rà soát và tìm bản sao thay thế nếu cần.
- Trường `size` chỉ có khi dữ liệu dung lượng tồn tại trong bảng `GhiNhanHoatDong`.

## 4. Định Dạng Nhật Ký Hệ Thống
- Bảng: `NhatKyHeThong`.
- Các hành động liên quan:
  - `BACKUP_EVIDENCE_FILES`
  - `BACKUP_EVIDENCE_FILES_ERROR`
  - `DELETE_ARCHIVED_FILES`
  - `DELETE_ARCHIVED_FILES_ERROR`
- Trường `NoiDung` là JSON, ví dụ cho sao lưu thành công:
```jsonc
{
  "startDate": "2025-07-01",
  "endDate": "2025-09-30",
  "totalFiles": 148,
  "addedFiles": 146,
  "skippedCount": 2,
  "skippedDetails": 2,
  "totalSizeBytes": 987654321
}
```
- Nhật ký xóa thành công:
```jsonc
{
  "startDate": "2025-07-01",
  "endDate": "2025-09-30",
  "totalFiles": 148,
  "deletedCount": 140,
  "failedCount": 8,
  "spaceMB": 512.4,
  "failedDeletions": [
    { "id": "...", "url": "...", "error": "R2 deletion returned false" }
  ]
}
```
- Truy vấn nhật ký định kỳ để phát hiện lỗi lặp lại (ví dụ: chuỗi R2 404) và báo cáo cho đội vận hành.

## 5. Quy Trình Khôi Phục (Disaster Recovery)
1. **Định danh sự cố:** Xác định phạm vi dữ liệu mất (dựa trên thời gian, danh sách bác sĩ, hoạt động ảnh hưởng).
2. **Chọn bản sao lưu:** Lọc `SaoLuuMinhChung` theo `NgayBatDau/NgayKetThuc` tương ứng và đảm bảo `TrangThai = 'HoanThanh'`.
3. **Lấy file nguồn:** Tải gói ZIP tương ứng (ưu tiên bản lưu cục bộ thứ cấp). Kiểm tra `BACKUP_MANIFEST.json` để tra cứu đường dẫn gốc.
4. **Khôi phục thủ công:**
   - Dùng giao diện upload minh chứng để tải lại tệp.
   - Nếu cần khôi phục hàng loạt, phối hợp đội kỹ thuật viết script dựa trên manifest để upload qua API.
5. **Cập nhật hệ thống:**
   - Đối với bản ghi `ChiTietSaoLuu`, cập nhật `TrangThai` từ `DaXoa` về `DaSaoLuu` nếu tệp được khôi phục.
   - Ghi chú hành động vào `NhatKyHeThong` (loại `DISASTER_RECOVERY_RESTORE`).
6. **Đánh giá hậu sự cố:** Tạo báo cáo mô tả tổng số tệp phục hồi, thời gian xử lý và nguyên nhân gốc.

## 6. Hoạch Định Dung Lượng Lâu Dài
### 6.1 Dự báo dung lượng
- `DungLuong` trong `SaoLuuMinhChung` sử dụng byte chưa nén; ước tính dung lượng nén bằng cách nhân với hệ số 0,82.
- Công thức dự trù 12 tháng:
  - `Tổng dung lượng năm ≈ (Trung bình DungLuong tháng) × 12 × 0,82`.
- Lưu ít nhất ba bản sao gần nhất (3 chu kỳ) để đối chiếu.

### 6.2 Chiến lược lưu trữ
- **Quy tắc 3-2-1:** 3 bản sao, 2 loại phương tiện, 1 bản ngoại tuyến.
- **Kiểm kê định kỳ:** Hàng quý, lập bảng so sánh số lượng bản sao lưu vs. dung lượng thực tế; cảnh báo khi vượt ngưỡng kho đám mây hoặc lưu trữ ngoại tuyến.
- **Lưu trữ lạnh:** Nếu dung lượng vượt xa hạn mức (ví dụ > 1 TB), chuyển các bản > 1 năm sang kho lạnh (tape/offline) và cập nhật danh mục theo dõi.

## 7. Chính Sách Xóa & Kiểm Soát
- Kiểm tra bảng `ChiTietSaoLuu` để đảm bảo chỉ xóa tệp có `TrangThai = 'DaSaoLuu'` và chưa có `NgayXoa`.
- Thiết lập quy trình phê duyệt hai bước cho thao tác xóa số lượng lớn (> 1.000 tệp).
- Kích hoạt báo cáo email định kỳ (roadmap) để gửi thống kê dung lượng được giải phóng cho lãnh đạo.

## 8. Checklist Kiểm Tra Định Kỳ
- [ ] Nhật ký sao lưu/ xóa không có lỗi nghiêm trọng trong tuần gần nhất.
- [ ] Tổng số tệp bị bỏ qua (`skippedCount`) < 1% tổng số tệp sao lưu.
- [ ] Bản sao lưu gần nhất được xác minh giải nén thành công.
- [ ] Dự báo dung lượng năm < 80% hạn mức kho chính.
- [ ] Quy trình khôi phục được diễn tập ít nhất 2 lần/năm.

---
**Tài liệu tham khảo:** `design.md`, `SUMMARY.md`, các migration bảng `SaoLuuMinhChung`, `ChiTietSaoLuu`, `XoaMinhChung` và mã nguồn `src/app/api/backup/*`.
