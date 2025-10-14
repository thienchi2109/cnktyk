# Excel Import Template Schema

## Template File: `CNKTYKLT_Import_Template.xlsx`

### Visual Layout

## Sheet 1: "Nhân viên" (Practitioners)

```
┌────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Row│      A       │      B       │      C       │      D       │      E       │      F       │      G       │      H       │      I       │      J       │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  1 │ Mã nhân viên │ Họ và tên *  │ Ngày sinh    │ Giới tính    │ Khoa/Phòng   │ Chức vụ      │ Số CCHN *    │ Ngày cấp *   │ Nơi cấp      │ Phạm vi      │
│    │              │              │              │              │              │              │              │              │              │ chuyên môn   │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  2 │ Text         │ Text         │ DD/MM/YYYY   │ Nam/Nữ       │ Text         │ Text         │ Text         │ DD/MM/YYYY   │ Text         │ Text         │
│    │ (Optional)   │ (Required)   │ (Optional)   │ (Optional)   │ (Optional)   │ (Optional)   │ (Required)   │ (Required)   │ (Optional)   │ (Optional)   │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  3 │ NV001        │ Nguyễn Văn An│ 15/05/1985   │ Nam          │ Khoa Nội     │ Bác sĩ CK II │CCHN-2023-0001│ 15/01/2023   │ Sở Y Tế CT   │ Nội khoa     │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  4 │              │              │              │              │              │              │              │              │              │              │
│ ...│              │              │              │              │              │              │              │              │              │              │
└────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

**Styling:**
- Row 1: Bold, Blue background (#4472C4), White text, Centered
- Row 2: Italic, Gray text (#808080), Centered, Font size 9
- Row 3: Example data, Light blue background (#D9E1F2)
- Rows 4+: White background, Left-aligned text

**Column Widths:**
- A: 15 chars (Mã nhân viên)
- B: 25 chars (Họ và tên)
- C: 15 chars (Ngày sinh)
- D: 12 chars (Giới tính)
- E: 20 chars (Khoa/Phòng)
- F: 20 chars (Chức vụ)
- G: 18 chars (Số CCHN)
- H: 15 chars (Ngày cấp)
- I: 20 chars (Nơi cấp)
- J: 25 chars (Phạm vi chuyên môn)

**Data Validation:**
- Column D: Dropdown list = ["Nam", "Nữ", "Khác"]
- Column C, H: Date format = DD/MM/YYYY
- Column G: Text, unique constraint

---

## Sheet 2: "Hoạt động" (Activities)

```
┌────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│ Row│      A       │      B       │      C       │      D       │      E       │      F       │      G       │      H       │      I       │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  1 │ Số CCHN *    │ Tên hoạt động*│ Vai trò      │ Ngày hoạt động*│ Số tín chỉ * │ Trạng thái * │ Ngày duyệt   │ Ghi chú duyệt│ URL minh chứng│
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  2 │ Text         │ Text         │ Text         │ DD/MM/YYYY   │ Number       │ Enum         │ DD/MM/YYYY   │ Text         │ URL          │
│    │ (Required)   │ (Required)   │ (Optional)   │ (Required)   │ (Required)   │ (Required)   │ (Optional)   │ (Optional)   │ (Optional)   │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  3 │CCHN-2023-0001│ Hội thảo Y học│ Báo cáo viên │ 15/03/2024   │ 5.5          │ DaDuyet      │ 20/03/2024   │ Đã xác minh  │ https://...  │
├────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│  4 │              │              │              │              │              │              │              │              │              │
│ ...│              │              │              │              │              │              │              │              │              │
└────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

**Styling:**
- Row 1: Bold, Green background (#70AD47), White text, Centered
- Row 2: Italic, Gray text (#808080), Centered, Font size 9
- Row 3: Example data, Light green background (#E2EFDA)
- Rows 4+: White background, Left-aligned text

**Column Widths:**
- A: 18 chars (Số CCHN)
- B: 40 chars (Tên hoạt động)
- C: 20 chars (Vai trò)
- D: 15 chars (Ngày hoạt động)
- E: 12 chars (Số tín chỉ)
- F: 15 chars (Trạng thái)
- G: 15 chars (Ngày duyệt)
- H: 30 chars (Ghi chú duyệt)
- I: 40 chars (URL minh chứng)

**Data Validation:**
- Column F: Dropdown list = ["ChoDuyet", "DaDuyet", "TuChoi"]
- Column D, G: Date format = DD/MM/YYYY
- Column E: Number, Min = 0, Max = 999.99, 2 decimal places

---

## Sheet 3: "Hướng dẫn" (Instructions)

```
┌─────────────────────────────────────────────────────────────────┐
│  HƯỚNG DẪN NHẬP DỮ LIỆU HÀNG LOẠT                              │
│  CNKTYKLT - Hệ thống quản lý tuân thủ CNKT                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📋 TỔNG QUAN                                                    │
│  ─────────────────────────────────────────────────────────────  │
│  File Excel này cho phép bạn nhập hàng loạt:                   │
│  • Thông tin nhân viên y tế                                     │
│  • Lịch sử hoạt động CNKT của họ                               │
│                                                                  │
│  🔢 CÁC BƯỚC THỰC HIỆN                                          │
│  ─────────────────────────────────────────────────────────────  │
│  1. Điền thông tin vào sheet "Nhân viên"                       │
│  2. Điền hoạt động vào sheet "Hoạt động"                       │
│  3. Lưu file và tải lên hệ thống                               │
│  4. Kiểm tra kết quả xác thực                                  │
│  5. Xác nhận nhập dữ liệu                                      │
│                                                                  │
│  ⚠️ LƯU Ý QUAN TRỌNG                                            │
│  ─────────────────────────────────────────────────────────────  │
│  • Không xóa hoặc đổi tên các sheet                            │
│  • Không thay đổi tiêu đề cột (dòng 1)                         │
│  • Các trường có dấu * là bắt buộc                             │
│  • Số CCHN phải duy nhất trong toàn hệ thống                   │
│  • Ngày hoạt động phải nằm trong kỳ CNKT                       │
│  • File tối đa 10MB                                             │
│                                                                  │
│  📝 MÔ TẢ CÁC TRƯỜNG - SHEET "NHÂN VIÊN"                       │
│  ─────────────────────────────────────────────────────────────  │
│  Mã nhân viên                                                   │
│    Mã định danh nhân viên (tùy chọn)                           │
│    Ví dụ: NV001, BS123                                         │
│    Lưu ý: Nếu để trống, hệ thống sẽ tự động tạo               │
│                                                                  │
│  Họ và tên *                                                    │
│    Họ và tên đầy đủ của nhân viên y tế                         │
│    Ví dụ: Nguyễn Văn An                                        │
│                                                                  │
│  Ngày sinh                                                      │
│    Ngày tháng năm sinh                                          │
│    Định dạng: DD/MM/YYYY                                        │
│    Ví dụ: 15/05/1985                                           │
│    Lưu ý: Phải đủ 18 tuổi                                      │
│                                                                  │
│  Giới tính                                                      │
│    Giới tính của nhân viên                                      │
│    Giá trị: Nam / Nữ / Khác                                    │
│                                                                  │
│  Khoa/Phòng                                                     │
│    Khoa hoặc phòng ban công tác                                │
│    Ví dụ: Khoa Nội, Phòng Khám Đa khoa                        │
│                                                                  │
│  Chức vụ                                                        │
│    Chức vụ hoặc chức danh chuyên môn                           │
│    Ví dụ: Bác sĩ chuyên khoa II, Điều dưỡng trưởng            │
│                                                                  │
│  Số CCHN *                                                      │
│    Số chứng chỉ hành nghề (duy nhất)                           │
│    Ví dụ: CCHN-2023-001234                                     │
│    Lưu ý: Phải duy nhất trong toàn hệ thống                   │
│                                                                  │
│  Ngày cấp *                                                     │
│    Ngày cấp chứng chỉ hành nghề                                │
│    Định dạng: DD/MM/YYYY                                        │
│    Ví dụ: 15/01/2023                                           │
│                                                                  │
│  Nơi cấp                                                        │
│    Cơ quan cấp chứng chỉ hành nghề                            │
│    Ví dụ: Sở Y Tế Cần Thơ, Bộ Y Tế                            │
│                                                                  │
│  Phạm vi chuyên môn                                            │
│    Phạm vi hoạt động chuyên môn được phép                      │
│    Ví dụ: Nội khoa, Ngoại khoa, Sản phụ khoa                  │
│                                                                  │
│  📝 MÔ TẢ CÁC TRƯỜNG - SHEET "HOẠT ĐỘNG"                       │
│  ─────────────────────────────────────────────────────────────  │
│  Số CCHN *                                                      │
│    Số CCHN của nhân viên (phải có trong sheet Nhân viên)       │
│    Ví dụ: CCHN-2023-001234                                     │
│                                                                  │
│  Tên hoạt động *                                                │
│    Tên đầy đủ của hoạt động CNKT                               │
│    Ví dụ: Hội thảo Y học lâm sàng 2024                         │
│                                                                  │
│  Vai trò                                                        │
│    Vai trò tham gia (nếu có)                                    │
│    Ví dụ: Báo cáo viên, Học viên, Chủ tọa                      │
│                                                                  │
│  Ngày hoạt động *                                               │
│    Ngày diễn ra hoạt động                                       │
│    Định dạng: DD/MM/YYYY                                        │
│    Ví dụ: 15/03/2024                                           │
│    Lưu ý: Phải nằm trong kỳ CNKT của nhân viên                 │
│                                                                  │
│  Số tín chỉ *                                                   │
│    Số tín chỉ đạt được từ hoạt động                            │
│    Ví dụ: 5.5                                                  │
│    Lưu ý: Tối đa 2 chữ số thập phân                            │
│                                                                  │
│  Trạng thái *                                                   │
│    Trạng thái duyệt của hoạt động                              │
│    Giá trị: ChoDuyet / DaDuyet / TuChoi                        │
│                                                                  │
│  Ngày duyệt                                                     │
│    Ngày duyệt hoạt động (nếu đã duyệt)                         │
│    Định dạng: DD/MM/YYYY                                        │
│    Ví dụ: 20/03/2024                                           │
│    Lưu ý: Bắt buộc nếu trạng thái là DaDuyet hoặc TuChoi      │
│                                                                  │
│  Ghi chú duyệt                                                  │
│    Ghi chú của người duyệt (nếu có)                            │
│    Ví dụ: Đã xác minh chứng chỉ                               │
│                                                                  │
│  URL minh chứng                                                 │
│    Đường dẫn đến file minh chứng (nếu có)                      │
│    Ví dụ: https://storage.example.com/cert.pdf                 │
│                                                                  │
│  ❌ LỖI THƯỜNG GẶP                                              │
│  ─────────────────────────────────────────────────────────────  │
│  1. "Số CCHN đã tồn tại"                                       │
│     → Số CCHN phải duy nhất, kiểm tra lại dữ liệu              │
│                                                                  │
│  2. "Ngày hoạt động ngoài kỳ CNKT"                             │
│     → Ngày hoạt động phải nằm giữa ngày bắt đầu và kết thúc   │
│                                                                  │
│  3. "Định dạng ngày không hợp lệ"                              │
│     → Sử dụng định dạng DD/MM/YYYY (ví dụ: 15/01/2023)        │
│                                                                  │
│  4. "Trạng thái không hợp lệ"                                  │
│     → Chỉ sử dụng các giá trị trong dropdown list              │
│                                                                  │
│  5. "Thiếu ngày duyệt"                                         │
│     → Nếu trạng thái là DaDuyet/TuChoi, phải có ngày duyệt    │
│                                                                  │
│  📞 HỖ TRỢ                                                       │
│  ─────────────────────────────────────────────────────────────  │
│  Nếu gặp vấn đề, vui lòng liên hệ:                            │
│  • Email: support@cnktyklt.gov.vn                              │
│  • Hotline: 1900-xxxx                                          │
│  • Tài liệu: https://docs.cnktyklt.gov.vn                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Styling:**
- Title: Bold, Font size 16, Blue text
- Section headers: Bold, Font size 12, Blue background
- Body text: Font size 10, Black text
- Examples: Italic, Gray text
- Warnings: Bold, Red text
- Notes: Italic, Orange text

---

## Validation Rules Summary

### Practitioners Sheet

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Mã nhân viên | Text | ○ | Max 50 chars, alphanumeric, unique if provided |
| Họ và tên | Text | ✓ | Max 255 chars, not empty |
| Ngày sinh | Date | ○ | Valid date, DD/MM/YYYY, age >= 18 |
| Giới tính | Enum | ○ | One of: Nam, Nữ, Khác |
| Khoa/Phòng | Text | ○ | Max 100 chars |
| Chức vụ | Text | ○ | Max 100 chars |
| Số CCHN | Text | ✓ | Unique, alphanumeric, max 50 chars |
| Ngày cấp | Date | ✓ | Valid date, DD/MM/YYYY, not future |
| Nơi cấp | Text | ○ | Max 200 chars |
| Phạm vi chuyên môn | Text | ○ | Max 200 chars |

### Activities Sheet

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| Số CCHN | Text | ✓ | Must exist in Practitioners sheet or DB |
| Tên hoạt động | Text | ✓ | Max 500 chars, not empty |
| Vai trò | Text | ○ | Max 100 chars |
| Ngày hoạt động | Date | ✓ | Valid date, DD/MM/YYYY, within cycle |
| Số tín chỉ | Number | ✓ | Decimal(6,2), Min: 0, Max: 999.99 |
| Trạng thái | Enum | ✓ | One of: ChoDuyet, DaDuyet, TuChoi |
| Ngày duyệt | Date | ○ | Required if status = DaDuyet/TuChoi |
| Ghi chú duyệt | Text | ○ | Max 1000 chars |
| URL minh chứng | URL | ○ | Valid URL format if provided |

---

## File Specifications

- **Format**: Excel 2007+ (.xlsx)
- **Max Size**: 10 MB
- **Max Rows**: 10,000 practitioners + 50,000 activities
- **Encoding**: UTF-8
- **Date Format**: DD/MM/YYYY (Vietnamese standard)
- **Number Format**: Decimal with 2 places (e.g., 5.50)
- **Text Encoding**: Unicode (supports Vietnamese characters)

---

## Example Data

### Practitioners Example
```
NV001 | Nguyễn Văn An | 15/05/1985 | Nam | Khoa Nội | Bác sĩ CK II | CCHN-2023-001234 | 15/01/2023 | Sở Y Tế Cần Thơ | Nội khoa
NV002 | Trần Thị Bình | 20/03/1990 | Nữ | Khoa Ngoại | Điều dưỡng trưởng | CCHN-2023-001235 | 20/02/2023 | Sở Y Tế Cần Thơ | Điều dưỡng
```

### Activities Example
```
CCHN-2023-001234 | Hội thảo Y học lâm sàng 2024 | Báo cáo viên | 15/03/2024 | 5.5 | DaDuyet | 20/03/2024 | Đã xác minh chứng chỉ | https://storage.example.com/cert1.pdf
CCHN-2023-001234 | Khóa học cập nhật kiến thức | Học viên | 10/05/2024 | 10.0 | DaDuyet | 15/05/2024 | Hoàn thành khóa học | https://storage.example.com/cert2.pdf
CCHN-2023-001235 | Hội nghị điều dưỡng toàn quốc | Tham dự | 20/06/2024 | 3.0 | ChoDuyet | | | 
```
