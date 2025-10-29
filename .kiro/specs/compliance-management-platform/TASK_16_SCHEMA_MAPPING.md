# Task 16: Excel Schema to Database Mapping

## Practitioners Sheet → NhanVien Table

### Excel Template Columns (10 columns)

| # | Excel Column | Required | Data Type | Example |
|---|--------------|----------|-----------|---------|
| A | Mã nhân viên | ○ | Text | NV001 |
| B | Họ và tên | ✓ | Text | Nguyễn Văn An |
| C | Ngày sinh | ○ | Date | 15/05/1985 |
| D | Giới tính | ○ | Enum | Nam |
| E | Khoa/Phòng | ○ | Text | Khoa Nội |
| F | Chức vụ | ○ | Text | Bác sĩ CK II |
| G | Số CCHN | ✓ | Text | CCHN-2023-001234 |
| H | Ngày cấp | ✓ | Date | 15/01/2023 |
| I | Nơi cấp | ○ | Text | Sở Y Tế Cần Thơ |
| J | Phạm vi chuyên môn | ○ | Text | Nội khoa |

### Database Table: NhanVien (9 columns)

```sql
CREATE TABLE "NhanVien" (
  "MaNhanVien"        UUID PRIMARY KEY,
  "HoVaTen"           TEXT NOT NULL,
  "SoCCHN"            TEXT UNIQUE,
  "NgayCapCCHN"       DATE,
  "MaDonVi"           UUID NOT NULL,
  "TrangThaiLamViec"  trang_thai_lam_viec NOT NULL DEFAULT 'DangLamViec',
  "Email"             TEXT,
  "DienThoai"         TEXT,
  "ChucDanh"          TEXT
);
```

### Field Mapping Strategy

| Excel Column | DB Column | Mapping Strategy | Notes |
|--------------|-----------|------------------|-------|
| A: Mã nhân viên | - | **Skip** | Reference only, not stored |
| B: Họ và tên | HoVaTen | **Direct** | Required field |
| C: Ngày sinh | - | **Skip** | Not in current schema |
| D: Giới tính | - | **Skip** | Not in current schema |
| E: Khoa/Phòng | ChucDanh | **Concatenate** | Combine with Chức vụ |
| F: Chức vụ | ChucDanh | **Concatenate** | Format: "Chức vụ - Khoa/Phòng" |
| G: Số CCHN | SoCCHN | **Direct** | Unique constraint |
| H: Ngày cấp | NgayCapCCHN | **Direct** | Date field |
| I: Nơi cấp | - | **Skip** | Not in current schema |
| J: Phạm vi chuyên môn | - | **Skip** | Not in current schema |
| - | MaDonVi | **Auto** | From session (importing user's unit) |
| - | TrangThaiLamViec | **Default** | "DangLamViec" |
| - | Email | **Null** | Not in import template |
| - | DienThoai | **Null** | Not in import template |

### ChucDanh Concatenation Logic

```typescript
// If both Chức vụ and Khoa/Phòng are provided
ChucDanh = `${chucVu} - ${khoaPhong}`
// Example: "Bác sĩ CK II - Khoa Nội"

// If only Chức vụ is provided
ChucDanh = chucVu
// Example: "Bác sĩ CK II"

// If only Khoa/Phòng is provided
ChucDanh = khoaPhong
// Example: "Khoa Nội"

// If neither is provided
ChucDanh = null
```

## Activities Sheet → GhiNhanHoatDong Table

### Excel Template Columns (9 columns)

| # | Excel Column | Required | Data Type | Example |
|---|--------------|----------|-----------|---------|
| A | Số CCHN | ✓ | Text | CCHN-2023-001234 |
| B | Tên hoạt động | ✓ | Text | Hội thảo Y học |
| C | Vai trò | ○ | Text | Báo cáo viên |
| D | Ngày hoạt động | ✓ | Date | 15/03/2024 |
| E | Số tín chỉ | ✓ | Number | 5.5 |
| F | Trạng thái | ✓ | Enum | DaDuyet |
| G | Ngày duyệt | ○ | Date | 20/03/2024 |
| H | Ghi chú duyệt | ○ | Text | Đã xác minh |
| I | URL minh chứng | ○ | URL | https://... |

### Database Table: GhiNhanHoatDong (14 columns)

```sql
CREATE TABLE "GhiNhanHoatDong" (
  "MaGhiNhan"        UUID PRIMARY KEY,
  "MaNhanVien"       UUID NOT NULL,
  "MaDanhMuc"        UUID NULL,
  "TenHoatDong"      TEXT NOT NULL,
  "VaiTro"           TEXT,
  "NgayHoatDong"     DATE,
  "NgayGhiNhan"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "SoTinChi"         NUMERIC NOT NULL,
  "FileMinhChungUrl" TEXT,
  "NguoiNhap"        UUID NOT NULL,
  "TrangThaiDuyet"   trang_thai_duyet NOT NULL DEFAULT 'ChoDuyet',
  "NgayDuyet"        TIMESTAMPTZ,
  "NguoiDuyet"       UUID,
  "GhiChuDuyet"      TEXT
);
```

### Field Mapping Strategy

| Excel Column | DB Column | Mapping Strategy | Notes |
|--------------|-----------|------------------|-------|
| A: Số CCHN | MaNhanVien | **Lookup** | Find MaNhanVien by SoCCHN |
| B: Tên hoạt động | TenHoatDong | **Direct** | Required field |
| C: Vai trò | VaiTro | **Direct** | Optional field |
| D: Ngày hoạt động | NgayHoatDong | **Direct** | Date field |
| E: Số tín chỉ | SoTinChi | **Direct** | Numeric field |
| F: Trạng thái | TrangThaiDuyet | **Direct** | Enum: ChoDuyet/DaDuyet/TuChoi |
| G: Ngày duyệt | NgayDuyet | **Conditional** | Required if status = DaDuyet/TuChoi |
| H: Ghi chú duyệt | GhiChuDuyet | **Direct** | Optional field |
| I: URL minh chứng | FileMinhChungUrl | **Direct** | Optional URL |
| - | MaGhiNhan | **Auto** | Generate UUID |
| - | MaDanhMuc | **Null** | Custom activities (no catalog) |
| - | NgayGhiNhan | **Auto** | Current timestamp |
| - | NguoiNhap | **Auto** | From session (importing user) |
| - | NguoiDuyet | **Conditional** | Set to importing user if approved/rejected |

### Lookup Logic for MaNhanVien

```typescript
// Step 1: Look up in imported practitioners (same file)
const practitioner = importedPractitioners.find(p => p.SoCCHN === soCCHN);

// Step 2: If not found, look up in database
if (!practitioner) {
  const dbPractitioner = await db.query(
    'SELECT "MaNhanVien" FROM "NhanVien" WHERE "SoCCHN" = $1',
    [soCCHN]
  );
}

// Step 3: If still not found, validation error
if (!dbPractitioner) {
  throw new ValidationError(`Số CCHN ${soCCHN} không tồn tại`);
}
```

## Compliance Cycles (KyCNKT)

### Auto-Creation Strategy

When importing practitioners without explicit cycle data, automatically create a default compliance cycle:

```typescript
// Create default 5-year cycle
const cycle = {
  MaKy: generateUUID(),
  MaNhanVien: practitioner.MaNhanVien,
  NgayBatDau: new Date(currentYear, 0, 1), // Jan 1 of current year
  NgayKetThuc: new Date(currentYear + 5, 11, 31), // Dec 31, 5 years later
  SoTinChiYeuCau: 120,
  TrangThai: 'DangDienRa'
};
```

### Cycle Validation for Activities

When importing activities, validate that the activity date falls within the practitioner's active cycle:

```typescript
// Validate activity date is within cycle
const cycle = await db.query(
  `SELECT * FROM "KyCNKT" 
   WHERE "MaNhanVien" = $1 
   AND "TrangThai" = 'DangDienRa'
   AND $2 BETWEEN "NgayBatDau" AND "NgayKetThuc"`,
  [maNhanVien, ngayHoatDong]
);

if (!cycle) {
  throw new ValidationError(
    `Ngày hoạt động ${ngayHoatDong} nằm ngoài kỳ CNKT của nhân viên`
  );
}
```

## Data Type Conversions

### Date Parsing (DD/MM/YYYY → PostgreSQL DATE)

```typescript
function parseVietnameseDate(dateStr: string): Date {
  // Input: "15/01/2023"
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
  // Output: Date object for PostgreSQL
}
```

### Enum Mapping

```typescript
// Gender mapping (if needed in future)
const genderMap = {
  'Nam': 'Male',
  'Nữ': 'Female',
  'Khác': 'Other'
};

// Status mapping (direct match)
const statusMap = {
  'ChoDuyet': 'ChoDuyet',
  'DaDuyet': 'DaDuyet',
  'TuChoi': 'TuChoi'
};
```

## Import Transaction Flow

```typescript
async function importData(file: Buffer, userId: string, unitId: string) {
  const client = await db.getClient();
  
  try {
    await client.query('BEGIN');
    
    // Step 1: Parse Excel file
    const { practitioners, activities } = await parseExcelFile(file);
    
    // Step 2: Validate all data
    const validation = await validateImportData(practitioners, activities);
    if (validation.hasErrors) {
      throw new ValidationError(validation.errors);
    }
    
    // Step 3: Import practitioners
    const importedPractitioners = [];
    for (const p of practitioners) {
      const result = await client.query(`
        INSERT INTO "NhanVien" (
          "HoVaTen", "SoCCHN", "NgayCapCCHN", "MaDonVi", 
          "TrangThaiLamViec", "ChucDanh"
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("SoCCHN") DO UPDATE SET
          "HoVaTen" = EXCLUDED."HoVaTen",
          "NgayCapCCHN" = EXCLUDED."NgayCapCCHN",
          "ChucDanh" = EXCLUDED."ChucDanh"
        RETURNING "MaNhanVien", "SoCCHN"
      `, [
        p.hoVaTen,
        p.soCCHN,
        p.ngayCapCCHN,
        unitId,
        'DangLamViec',
        p.chucDanh
      ]);
      importedPractitioners.push(result.rows[0]);
    }
    
    // Step 4: Create default compliance cycles
    for (const p of importedPractitioners) {
      await client.query(`
        INSERT INTO "KyCNKT" (
          "MaNhanVien", "NgayBatDau", "NgayKetThuc", 
          "SoTinChiYeuCau", "TrangThai"
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT DO NOTHING
      `, [
        p.MaNhanVien,
        new Date(new Date().getFullYear(), 0, 1),
        new Date(new Date().getFullYear() + 5, 11, 31),
        120,
        'DangDienRa'
      ]);
    }
    
    // Step 5: Import activities
    for (const a of activities) {
      const practitioner = importedPractitioners.find(
        p => p.SoCCHN === a.soCCHN
      );
      
      await client.query(`
        INSERT INTO "GhiNhanHoatDong" (
          "MaNhanVien", "TenHoatDong", "VaiTro", "NgayHoatDong",
          "SoTinChi", "NguoiNhap", "TrangThaiDuyet", "NgayDuyet",
          "NguoiDuyet", "GhiChuDuyet", "FileMinhChungUrl"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        practitioner.MaNhanVien,
        a.tenHoatDong,
        a.vaiTro,
        a.ngayHoatDong,
        a.soTinChi,
        userId,
        a.trangThaiDuyet,
        a.ngayDuyet,
        a.trangThaiDuyet !== 'ChoDuyet' ? userId : null,
        a.ghiChuDuyet,
        a.urlMinhChung
      ]);
    }
    
    // Step 6: Log audit trail
    await client.query(`
      INSERT INTO "NhatKyHeThong" (
        "MaTaiKhoan", "HanhDong", "Bang", "NoiDung"
      ) VALUES ($1, $2, $3, $4)
    `, [
      userId,
      'BULK_IMPORT',
      'NhanVien,GhiNhanHoatDong',
      JSON.stringify({
        practitionersCount: practitioners.length,
        activitiesCount: activities.length,
        timestamp: new Date()
      })
    ]);
    
    await client.query('COMMIT');
    
    return {
      success: true,
      practitionersImported: practitioners.length,
      activitiesImported: activities.length
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

## Summary

### Fields Stored in Database
- ✅ Họ và tên → HoVaTen
- ✅ Số CCHN → SoCCHN
- ✅ Ngày cấp → NgayCapCCHN
- ✅ Chức vụ + Khoa/Phòng → ChucDanh (concatenated)

### Fields Skipped (Not in Current Schema)
- ❌ Mã nhân viên (reference only)
- ❌ Ngày sinh
- ❌ Giới tính
- ❌ Nơi cấp
- ❌ Phạm vi chuyên môn

### Future Enhancements
Consider adding these fields to NhanVien table in a future migration:
```sql
ALTER TABLE "NhanVien" 
  ADD COLUMN "NgaySinh" DATE,
  ADD COLUMN "GioiTinh" TEXT,
  ADD COLUMN "KhoaPhong" TEXT,
  ADD COLUMN "NoiCapCCHN" TEXT,
  ADD COLUMN "PhamViChuyenMon" TEXT;
```
