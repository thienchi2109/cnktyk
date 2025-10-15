# Schema Changelog

## Migration 003 - Extended Activity Fields (2025-10-15)

### GhiNhanHoatDong Table Changes

#### Removed Columns
- `VaiTro` → Replaced by `ChiTietVaiTro`
- `ThoiGianBatDau` (TIMESTAMPTZ) → Replaced by `NgayBatDau` (DATE)
- `ThoiGianKetThuc` (TIMESTAMPTZ) → Replaced by `NgayKetThuc` (DATE)
- `SoGio` → Replaced by `SoTiet`
- `SoTinChiQuyDoi` → Replaced by `SoGioTinChiQuyDoi`
- `FileMinhChungETag` → Removed (not needed)
- `FileMinhChungSha256` → Removed (not needed)
- `FileMinhChungSize` → Removed (not needed)
- `ThoiGianDuyet` → Replaced by `NgayDuyet`
- `GhiChu` → Replaced by `GhiChuDuyet`
- `CreatedAt` → Replaced by `NgayGhiNhan`
- `UpdatedAt` → Removed (not needed)

#### Added Columns
- `NgayGhiNhan` TIMESTAMPTZ NOT NULL DEFAULT now() - Record creation timestamp
- `NgayDuyet` TIMESTAMPTZ - Approval timestamp
- `NguoiDuyet` UUID - Approver user ID
- `GhiChuDuyet` TEXT - Approval notes
- `HinhThucCapNhatKienThucYKhoa` TEXT - Form of medical knowledge update
- `ChiTietVaiTro` TEXT - Detailed role description
- `DonViToChuc` TEXT - Organizing institution
- `NgayBatDau` DATE - Activity start date
- `NgayKetThuc` DATE - Activity end date
- `SoTiet` NUMERIC(6,2) - Number of sessions/periods
- `SoGioTinChiQuyDoi` NUMERIC(6,2) - Converted credit hours
- `BangChungSoGiayChungNhan` TEXT - Certificate number

#### Renamed Columns (Conceptual)
| Old Name | New Name | Type Change | Purpose |
|----------|----------|-------------|---------|
| `VaiTro` | `ChiTietVaiTro` | TEXT → TEXT | More descriptive name |
| `ThoiGianBatDau` | `NgayBatDau` | TIMESTAMPTZ → DATE | Date precision sufficient |
| `ThoiGianKetThuc` | `NgayKetThuc` | TIMESTAMPTZ → DATE | Date precision sufficient |
| `SoGio` | `SoTiet` | NUMERIC → NUMERIC | Vietnamese terminology |
| `SoTinChiQuyDoi` | `SoGioTinChiQuyDoi` | NUMERIC → NUMERIC | More specific name |
| `ThoiGianDuyet` | `NgayDuyet` | TIMESTAMPTZ → TIMESTAMPTZ | Vietnamese terminology |
| `GhiChu` | `GhiChuDuyet` | TEXT → TEXT | More specific (approval notes) |
| `CreatedAt` | `NgayGhiNhan` | TIMESTAMPTZ → TIMESTAMPTZ | Vietnamese terminology |

### Rationale

**Why DATE instead of TIMESTAMPTZ for activity dates?**
- Activities are typically day-based events
- Time precision not needed for start/end dates
- Simplifies date range queries
- Reduces storage overhead

**Why separate NgayGhiNhan and NgayDuyet?**
- `NgayGhiNhan`: When the activity was recorded in the system
- `NgayDuyet`: When the activity was approved
- Clear audit trail for compliance tracking

**Why SoGioTinChiQuyDoi instead of SoTinChiQuyDoi?**
- More descriptive: "Converted Credit Hours" vs just "Converted Credits"
- Aligns with Vietnamese medical education terminology
- Clarifies that this is the final calculated value

**Why add HinhThucCapNhatKienThucYKhoa?**
- Required by Vietnamese medical continuing education regulations
- Tracks the specific form of knowledge update (conference, training, etc.)
- Essential for compliance reporting

**Why add ChiTietVaiTro?**
- More detailed than simple "VaiTro"
- Captures specific roles (Speaker, Participant, Presenter, etc.)
- Important for credit calculation rules

**Why add DonViToChuc?**
- Tracks which institution organized the activity
- Required for verification and audit purposes
- Helps validate activity legitimacy

**Why add BangChungSoGiayChungNhan?**
- Certificate numbers are primary evidence
- Required for compliance verification
- Easier to reference than file URLs

### Index Changes

#### Removed Indexes
- Indexes referencing `ThoiGianBatDau` (replaced with `NgayBatDau`)

#### Added Indexes
- `idx_gnhd_record_date` on `NgayGhiNhan` DESC
- `idx_gnhd_approval_date` on `NgayDuyet` DESC (partial, WHERE NgayDuyet IS NOT NULL)

#### Updated Indexes
- `idx_gnhd_nv_time_desc`: Now uses `NgayBatDau` instead of `ThoiGianBatDau`
- `idx_gnhd_status_time`: Now uses `NgayBatDau` instead of `ThoiGianBatDau`
- `idx_gnhd_pending_only`: Now uses `NgayBatDau` instead of `ThoiGianBatDau`

### Trigger Changes

#### Removed Triggers
- `trg_gnhd_set_updated_at` - No longer needed (UpdatedAt column removed)

### Materialized View Changes

#### BaoCaoTienDoNhanVien
- Changed `SUM(g."SoTinChiQuyDoi")` → `SUM(g."SoGioTinChiQuyDoi")`
- Changed `MIN(g."ThoiGianBatDau")` → `MIN(g."NgayBatDau")`
- Changed `MAX(g."ThoiGianKetThuc")` → `MAX(g."NgayKetThuc")`

### Foreign Key Changes

#### Added Foreign Keys
- `fk_gnhd_nguoiduyet`: References `TaiKhoan(MaTaiKhoan)` for approver tracking

### Constraint Changes

#### Updated Constraints
- `chk_gnhd_time`: Now checks `NgayKetThuc >= NgayBatDau` (DATE comparison)

## Migration History

### v1 - Initial Schema (2025-10-03)
- Created all base tables
- Established relationships
- Set up indexes and constraints

### Migration 003 - Extended Activity Fields (2025-10-15)
- Extended GhiNhanHoatDong table
- Aligned with Vietnamese medical education requirements
- Improved data granularity for compliance tracking
- Simplified date handling (DATE vs TIMESTAMPTZ)

## Compatibility Notes

### Breaking Changes
- All queries referencing old column names must be updated
- Application code must use new column names
- Materialized views must be refreshed after migration

### Data Migration
- Existing data should be migrated:
  - `ThoiGianBatDau` → `NgayBatDau` (cast to DATE)
  - `ThoiGianKetThuc` → `NgayKetThuc` (cast to DATE)
  - `SoTinChiQuyDoi` → `SoGioTinChiQuyDoi` (direct copy)
  - `CreatedAt` → `NgayGhiNhan` (direct copy)
  - `ThoiGianDuyet` → `NgayDuyet` (direct copy)
  - `GhiChu` → `GhiChuDuyet` (direct copy)

### Application Updates Required
- Update all TypeScript schemas
- Update all database queries
- Update all API endpoints
- Update all form components
- Update all validation rules

## Current Schema Version

**Version**: 1.3 (after Migration 003)  
**Last Updated**: 2025-10-15  
**Status**: Production Ready
