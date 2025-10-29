# GhiNhanHoatDong Schema Analysis - Duplicate/Overlapping Columns

## Current Database Schema (As of Migration 003)

Based on the actual database structure, here are the columns in `GhiNhanHoatDong`:

| Column | Type | Source | Purpose |
|--------|------|--------|---------|
| MaGhiNhan | UUID | Original | Primary key |
| MaNhanVien | UUID | Original | Practitioner FK |
| MaDanhMuc | UUID | Original | Activity catalog FK |
| TenHoatDong | TEXT | Original | Activity name |
| **VaiTro** | TEXT | Original | Role in activity |
| **NgayHoatDong** | DATE | Unknown | Single activity date |
| NgayGhiNhan | TIMESTAMP | Unknown | Record creation timestamp |
| **SoTinChi** | NUMERIC | Unknown | Credit amount |
| FileMinhChungUrl | TEXT | Original | Evidence file URL |
| NguoiNhap | UUID | Original | Submitter FK |
| TrangThaiDuyet | ENUM | Original | Approval status |
| NgayDuyet | TIMESTAMP | Unknown | Approval date |
| NguoiDuyet | UUID | Unknown | Approver FK |
| GhiChuDuyet | TEXT | Unknown | Approval notes |
| **HinhThucCapNhatKienThucYKhoa** | TEXT | Migration 003 | Form of knowledge update |
| **ChiTietVaiTro** | TEXT | Migration 003 | Detailed role |
| DonViToChuc | TEXT | Migration 003 | Organizing unit |
| **NgayBatDau** | DATE | Migration 003 | Start date |
| **NgayKetThuc** | DATE | Migration 003 | End date |
| SoTiet | NUMERIC | Migration 003 | Number of sessions |
| **SoGioTinChiQuyDoi** | NUMERIC | Migration 003 | Converted credit hours |
| BangChungSoGiayChungNhan | TEXT | Migration 003 | Certificate number |

## Original Schema (v_1_init_schema.sql)

The original schema had:
- `ThoiGianBatDau` (TIMESTAMPTZ) - Start timestamp
- `ThoiGianKetThuc` (TIMESTAMPTZ) - End timestamp
- `SoGio` (NUMERIC) - Hours
- `SoTinChiQuyDoi` (NUMERIC) - Converted credits
- `ThoiGianDuyet` (TIMESTAMPTZ) - Approval timestamp
- `GhiChu` (TEXT) - General notes

## Issues Identified

### 🔴 Issue 1: Duplicate Role Fields
**Columns:**
- `VaiTro` (Original) - Role in activity
- `ChiTietVaiTro` (Migration 003) - Detailed role

**Problem:** Two columns for the same purpose.

**Recommendation:** 
- **Keep:** `ChiTietVaiTro` (more descriptive name)
- **Deprecate:** `VaiTro` (migrate data and drop in future)

### 🔴 Issue 2: Conflicting Date Fields
**Columns:**
- `NgayHoatDong` (Unknown source) - Single activity date
- `NgayBatDau` (Migration 003) - Start date
- `NgayKetThuc` (Migration 003) - End date

**Problem:** `NgayHoatDong` conflicts with date range approach.

**Recommendation:**
- **Keep:** `NgayBatDau` + `NgayKetThuc` (supports multi-day activities)
- **Deprecate:** `NgayHoatDong` (single date is limiting)
- **Migration:** Copy `NgayHoatDong` to `NgayBatDau` if `NgayBatDau` is NULL

### 🔴 Issue 3: Conflicting Credit Fields
**Columns:**
- `SoTinChi` (Unknown source) - Credit amount
- `SoGioTinChiQuyDoi` (Migration 003) - Converted credit hours

**Problem:** Two credit fields with unclear relationship.

**Recommendation:**
- **Keep:** `SoTinChiQuyDoi` (from original schema, used in calculations)
- **Deprecate:** `SoTinChi` (redundant)
- **Deprecate:** `SoGioTinChiQuyDoi` (duplicate of SoTinChiQuyDoi)

### 🟡 Issue 4: Timestamp vs Date Inconsistency
**Original Schema:**
- `ThoiGianBatDau` (TIMESTAMPTZ)
- `ThoiGianKetThuc` (TIMESTAMPTZ)
- `ThoiGianDuyet` (TIMESTAMPTZ)

**Current Schema:**
- `NgayBatDau` (DATE)
- `NgayKetThuc` (DATE)
- `NgayDuyet` (TIMESTAMP)

**Problem:** Inconsistent use of DATE vs TIMESTAMP.

**Recommendation:**
- For activity dates: DATE is sufficient (activities are day-based)
- For system timestamps: TIMESTAMP is appropriate
- Current approach is acceptable

### 🟢 Issue 5: Missing Original Fields
**Original fields not in current schema:**
- `ThoiGianBatDau` (TIMESTAMPTZ) - Replaced by `NgayBatDau` (DATE)
- `ThoiGianKetThuc` (TIMESTAMPTZ) - Replaced by `NgayKetThuc` (DATE)
- `SoGio` (NUMERIC) - Hours field
- `ThoiGianDuyet` (TIMESTAMPTZ) - Replaced by `NgayDuyet`
- `GhiChu` (TEXT) - Replaced by `GhiChuDuyet`
- `FileMinhChungETag`, `FileMinhChungSha256`, `FileMinhChungSize` - File metadata

**Problem:** Schema drift from original design.

## Recommended Actions

### Immediate Actions (No Breaking Changes)

1. **Update TypeScript schemas** to match actual database
2. **Document field usage** in code comments
3. **Update bulk import mapping** to use correct fields

### Short-term Actions (Data Migration Required)

1. **Consolidate Role Fields**
   ```sql
   -- Migrate VaiTro to ChiTietVaiTro
   UPDATE "GhiNhanHoatDong"
   SET "ChiTietVaiTro" = "VaiTro"
   WHERE "ChiTietVaiTro" IS NULL AND "VaiTro" IS NOT NULL;
   ```

2. **Consolidate Date Fields**
   ```sql
   -- Migrate NgayHoatDong to NgayBatDau
   UPDATE "GhiNhanHoatDong"
   SET "NgayBatDau" = "NgayHoatDong"
   WHERE "NgayBatDau" IS NULL AND "NgayHoatDong" IS NOT NULL;
   ```

3. **Consolidate Credit Fields**
   ```sql
   -- Migrate SoTinChi to SoTinChiQuyDoi (if SoTinChi exists)
   UPDATE "GhiNhanHoatDong"
   SET "SoTinChiQuyDoi" = "SoTinChi"
   WHERE "SoTinChiQuyDoi" IS NULL AND "SoTinChi" IS NOT NULL;
   ```

### Long-term Actions (Breaking Changes)

1. **Drop deprecated columns** (after data migration)
   ```sql
   ALTER TABLE "GhiNhanHoatDong"
     DROP COLUMN IF EXISTS "VaiTro",
     DROP COLUMN IF EXISTS "NgayHoatDong",
     DROP COLUMN IF EXISTS "SoTinChi",
     DROP COLUMN IF EXISTS "SoGioTinChiQuyDoi";
   ```

2. **Restore missing original fields** (if needed)
   ```sql
   ALTER TABLE "GhiNhanHoatDong"
     ADD COLUMN IF NOT EXISTS "SoGio" NUMERIC(6,2),
     ADD COLUMN IF NOT EXISTS "FileMinhChungETag" TEXT,
     ADD COLUMN IF NOT EXISTS "FileMinhChungSha256" TEXT,
     ADD COLUMN IF NOT EXISTS "FileMinhChungSize" BIGINT;
   ```

## Recommended Field Mapping for Bulk Import

Based on the analysis, here's the corrected Excel template mapping:

| Column | Excel Header | Database Field | Notes |
|--------|-------------|----------------|-------|
| A | Mã nhân viên | MaNhanVien | FK to practitioners |
| B | Tên hoạt động | TenHoatDong | Activity name |
| C | Hình thức | HinhThucCapNhatKienThucYKhoa | Form of knowledge update |
| D | Chi tiết vai trò | ChiTietVaiTro | Use this, not VaiTro |
| E | Đơn vị tổ chức | DonViToChuc | Organizing unit |
| F | Ngày bắt đầu | NgayBatDau | Use this, not NgayHoatDong |
| G | Ngày kết thúc | NgayKetThuc | End date |
| H | Số tiết | SoTiet | Number of sessions |
| I | Số tín chỉ | SoTinChiQuyDoi | Use existing field |
| J | Số giấy chứng nhận | BangChungSoGiayChungNhan | Certificate number |

## Questions to Resolve

1. **Where did these columns come from?**
   - `NgayHoatDong`, `NgayGhiNhan`, `SoTinChi`, `NgayDuyet`, `NguoiDuyet`, `GhiChuDuyet`
   - Were these added in a previous migration that wasn't documented?

2. **What happened to original fields?**
   - `ThoiGianBatDau`, `ThoiGianKetThuc`, `SoGio`, `ThoiGianDuyet`, `GhiChu`
   - Were these renamed or dropped?

3. **Which credit field should be authoritative?**
   - `SoTinChi` vs `SoTinChiQuyDoi` vs `SoGioTinChiQuyDoi`
   - Need to clarify business logic

## Next Steps

1. ✅ Document current schema state
2. ⏳ Query database to check which columns actually exist
3. ⏳ Create Migration 004 to consolidate duplicate fields
4. ⏳ Update TypeScript schemas to match reality
5. ⏳ Update bulk import to use correct fields
6. ⏳ Test with actual database
