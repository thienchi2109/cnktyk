# Data Relationship & Workflow: GhiNhanHoatDong ↔ NhanVien

## 📊 Database Relationship Overview

```
┌─────────────────┐
│    DonVi        │  Healthcare Unit (Hospital, Clinic, etc.)
│  (Unit)         │
└────────┬────────┘
         │
         │ MaDonVi (FK)
         │
         ▼
┌─────────────────┐         ┌──────────────────┐
│   TaiKhoan      │         │    KyCNKT        │  5-Year Compliance Cycle
│  (User Account) │         │  (Cycle Period)  │
└────────┬────────┘         └────────┬─────────┘
         │                           │
         │ NguoiNhap (FK)           │ MaNhanVien (FK)
         │                           │
         │                           │
         │                  ┌────────▼─────────┐
         │                  │    NhanVien      │  Healthcare Practitioner
         │                  │  (Practitioner)  │  - License holder
         │                  └────────┬─────────┘  - Must complete 120 credits/5 years
         │                           │
         │                           │ MaNhanVien (FK)
         │                           │
         │                  ┌────────▼──────────┐
         └─────────────────►│ GhiNhanHoatDong  │  Activity Record
                            │ (Activity Record) │  - Training, conferences, etc.
                            └───────────────────┘  - Earns credits toward compliance
                                     │
                                     │ MaDanhMuc (FK, optional)
                                     │
                            ┌────────▼──────────┐
                            │ DanhMucHoatDong   │  Activity Catalog
                            │ (Activity Type)   │  - Predefined activity types
                            └───────────────────┘  - Credit conversion rules
```

## 🔗 Foreign Key Relationships in GhiNhanHoatDong

### 1. **MaNhanVien** → NhanVien.MaNhanVien
**Purpose:** Links activity record to the practitioner who performed it

**Meaning:** "This activity was completed by this practitioner"

**Example:**
```sql
-- Practitioner: Dr. Nguyen Van A
-- Activity: Attended medical conference
MaNhanVien = '123e4567-e89b-12d3-a456-426614174000'
```

### 2. **NguoiNhap** → TaiKhoan.MaTaiKhoan
**Purpose:** Tracks who entered/submitted this activity record

**Meaning:** "This activity was submitted by this user account"

**Important:** `NguoiNhap` ≠ `MaNhanVien` in many cases!

**Example Scenarios:**

#### Scenario A: Self-Entry (Practitioner submits their own activity)
```sql
-- Dr. Nguyen Van A logs in and submits their own activity
MaNhanVien = '123e4567-e89b-12d3-a456-426614174000'  -- Dr. Nguyen Van A
NguoiNhap   = '789e4567-e89b-12d3-a456-426614174111'  -- Dr. Nguyen Van A's account
```

#### Scenario B: Admin Entry (Unit admin submits on behalf of practitioner)
```sql
-- Admin at Hospital X submits activity for Dr. Nguyen Van A
MaNhanVien = '123e4567-e89b-12d3-a456-426614174000'  -- Dr. Nguyen Van A
NguoiNhap   = '999e4567-e89b-12d3-a456-426614174222'  -- Admin's account
```

#### Scenario C: Bulk Import (DoH admin imports Excel file)
```sql
-- DoH admin imports 100 activities from Excel
MaNhanVien = '123e4567-e89b-12d3-a456-426614174000'  -- Dr. Nguyen Van A
NguoiNhap   = 'aaae4567-e89b-12d3-a456-426614174333'  -- DoH admin's account
```

### 3. **MaDanhMuc** → DanhMucHoatDong.MaDanhMuc (Optional)
**Purpose:** Links to predefined activity type for automatic credit calculation

**Meaning:** "This activity follows the rules of this activity type"

**When NULL:** Custom/ad-hoc activity with manual credit entry

## 👥 User Roles & Workflow

### Role 1: NguoiHanhNghe (Practitioner)
**Account Type:** TaiKhoan with QuyenHan = 'NguoiHanhNghe'

**Workflow:**
1. Practitioner logs in with their TaiKhoan
2. Views their NhanVien profile (linked via MaNhanVien)
3. Submits new activity:
   - `MaNhanVien` = their own practitioner ID
   - `NguoiNhap` = their own account ID
   - `TrangThaiDuyet` = 'ChoDuyet' (Pending Approval)
4. Waits for unit admin approval

### Role 2: DonVi (Unit Admin)
**Account Type:** TaiKhoan with QuyenHan = 'DonVi'

**Workflow:**
1. Unit admin logs in
2. Views all practitioners in their unit (WHERE MaDonVi = admin's unit)
3. Can submit activities on behalf of practitioners:
   - `MaNhanVien` = practitioner's ID
   - `NguoiNhap` = admin's account ID
   - `TrangThaiDuyet` = 'ChoDuyet' or 'DaDuyet'
4. Reviews and approves pending activities:
   - Updates `TrangThaiDuyet` to 'DaDuyet' or 'TuChoi'
   - Sets `NgayDuyet` = current timestamp
   - Sets `NguoiDuyet` = admin's account ID

### Role 3: SoYTe (Department of Health Admin)
**Account Type:** TaiKhoan with QuyenHan = 'SoYTe'

**Workflow:**
1. DoH admin logs in
2. Views ALL practitioners across all units
3. Bulk imports activities from Excel:
   - Reads Excel with columns: MaNhanVienNoiBo, TenHoatDong, etc.
   - Looks up MaNhanVien from MaNhanVienNoiBo
   - Creates records with:
     - `MaNhanVien` = looked up practitioner ID
     - `NguoiNhap` = DoH admin's account ID
     - `TrangThaiDuyet` = 'ChoDuyet' (requires unit approval)
4. Monitors compliance across all units

### Role 4: Auditor
**Account Type:** TaiKhoan with QuyenHan = 'Auditor'

**Workflow:**
1. Auditor logs in (read-only access)
2. Views all data for compliance verification
3. Cannot create or modify records

## 📝 Complete Activity Lifecycle

### Step 1: Activity Creation
```sql
INSERT INTO "GhiNhanHoatDong" (
  "MaGhiNhan",
  "MaNhanVien",              -- WHO performed the activity
  "TenHoatDong",
  "NgayBatDau",
  "NgayKetThuc",
  "SoGioTinChiQuyDoi",
  "NguoiNhap",               -- WHO submitted the record
  "TrangThaiDuyet",          -- Initial status: ChoDuyet
  "NgayGhiNhan"              -- When record was created
) VALUES (
  gen_random_uuid(),
  '123e4567-...',            -- Dr. Nguyen Van A
  'Hội thảo Y học lâm sàng',
  '2024-03-15',
  '2024-03-17',
  5.5,
  '789e4567-...',            -- Could be practitioner or admin
  'ChoDuyet',
  NOW()
);
```

### Step 2: Activity Approval
```sql
UPDATE "GhiNhanHoatDong"
SET 
  "TrangThaiDuyet" = 'DaDuyet',
  "NgayDuyet" = NOW(),
  "NguoiDuyet" = '999e4567-...'  -- Unit admin who approved
WHERE "MaGhiNhan" = '...';
```

### Step 3: Credit Calculation
```sql
-- Calculate total credits for a practitioner in their current cycle
SELECT 
  nv."HoVaTen",
  ky."NgayBatDau" as cycle_start,
  ky."NgayKetThuc" as cycle_end,
  ky."SoTinChiYeuCau" as required_credits,
  SUM(ghd."SoGioTinChiQuyDoi") as earned_credits,
  (SUM(ghd."SoGioTinChiQuyDoi") / ky."SoTinChiYeuCau" * 100) as completion_percent
FROM "NhanVien" nv
JOIN "KyCNKT" ky ON ky."MaNhanVien" = nv."MaNhanVien"
LEFT JOIN "GhiNhanHoatDong" ghd ON ghd."MaNhanVien" = nv."MaNhanVien"
  AND ghd."TrangThaiDuyet" = 'DaDuyet'
  AND ghd."NgayBatDau" BETWEEN ky."NgayBatDau" AND ky."NgayKetThuc"
WHERE nv."MaNhanVien" = '123e4567-...'
  AND ky."TrangThai" = 'DangThuc'
GROUP BY nv."HoVaTen", ky."NgayBatDau", ky."NgayKetThuc", ky."SoTinChiYeuCau";
```

## 🔍 Key Insights

### Why Two User References?

**MaNhanVien (Practitioner):**
- Identifies WHO the activity belongs to
- Used for credit calculation
- Links to compliance cycle (KyCNKT)
- Determines which unit's data this is

**NguoiNhap (Submitter):**
- Audit trail: WHO entered the data
- Important for data quality tracking
- Enables bulk import by admins
- Supports delegation workflows

### Data Isolation by Unit

```sql
-- Unit admin can only see their unit's practitioners
SELECT ghd.*
FROM "GhiNhanHoatDong" ghd
JOIN "NhanVien" nv ON nv."MaNhanVien" = ghd."MaNhanVien"
WHERE nv."MaDonVi" = '...'  -- Admin's unit ID
```

### Approval Workflow

```
┌──────────────┐
│  ChoDuyet    │  Pending Approval
│ (Submitted)  │  - Can be edited by submitter
└──────┬───────┘  - Awaiting unit admin review
       │
       ├─────────► ┌──────────────┐
       │           │   DaDuyet    │  Approved
       │           │  (Approved)  │  - Credits count toward compliance
       │           └──────────────┘  - Cannot be edited
       │
       └─────────► ┌──────────────┐
                   │   TuChoi     │  Rejected
                   │  (Rejected)  │  - Credits do NOT count
                   └──────────────┘  - Can be resubmitted with corrections
```

## 📋 Common Queries

### 1. Get all activities for a practitioner
```sql
SELECT 
  ghd."TenHoatDong",
  ghd."NgayBatDau",
  ghd."NgayKetThuc",
  ghd."SoGioTinChiQuyDoi",
  ghd."TrangThaiDuyet",
  tk."TenDangNhap" as submitted_by
FROM "GhiNhanHoatDong" ghd
JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = ghd."NguoiNhap"
WHERE ghd."MaNhanVien" = '123e4567-...'
ORDER BY ghd."NgayBatDau" DESC;
```

### 2. Get pending approvals for unit admin
```sql
SELECT 
  nv."HoVaTen" as practitioner_name,
  ghd."TenHoatDong",
  ghd."NgayGhiNhan" as submitted_date,
  ghd."SoGioTinChiQuyDoi" as credits
FROM "GhiNhanHoatDong" ghd
JOIN "NhanVien" nv ON nv."MaNhanVien" = ghd."MaNhanVien"
WHERE nv."MaDonVi" = '...'  -- Admin's unit
  AND ghd."TrangThaiDuyet" = 'ChoDuyet'
ORDER BY ghd."NgayGhiNhan" ASC;
```

### 3. Get compliance progress for all practitioners in a unit
```sql
SELECT 
  nv."HoVaTen",
  nv."SoCCHN",
  COUNT(ghd."MaGhiNhan") as total_activities,
  SUM(CASE WHEN ghd."TrangThaiDuyet" = 'DaDuyet' THEN ghd."SoGioTinChiQuyDoi" ELSE 0 END) as approved_credits,
  ky."SoTinChiYeuCau" as required_credits,
  ROUND(
    SUM(CASE WHEN ghd."TrangThaiDuyet" = 'DaDuyet' THEN ghd."SoGioTinChiQuyDoi" ELSE 0 END) 
    / ky."SoTinChiYeuCau" * 100, 
    2
  ) as completion_percent
FROM "NhanVien" nv
JOIN "KyCNKT" ky ON ky."MaNhanVien" = nv."MaNhanVien" AND ky."TrangThai" = 'DangThuc'
LEFT JOIN "GhiNhanHoatDong" ghd ON ghd."MaNhanVien" = nv."MaNhanVien"
  AND ghd."NgayBatDau" BETWEEN ky."NgayBatDau" AND ky."NgayKetThuc"
WHERE nv."MaDonVi" = '...'
GROUP BY nv."MaNhanVien", nv."HoVaTen", nv."SoCCHN", ky."SoTinChiYeuCau"
ORDER BY completion_percent ASC;
```

## 🎯 Summary

**GhiNhanHoatDong** is the central table that:
1. **Belongs to** a practitioner (MaNhanVien → NhanVien)
2. **Submitted by** a user account (NguoiNhap → TaiKhoan)
3. **Optionally categorized** by activity type (MaDanhMuc → DanhMucHoatDong)
4. **Approved by** a unit admin (NguoiDuyet → TaiKhoan)
5. **Counts toward** compliance cycle (via MaNhanVien → KyCNKT)

The separation of `MaNhanVien` and `NguoiNhap` enables:
- ✅ Bulk imports by admins
- ✅ Delegation workflows
- ✅ Audit trails
- ✅ Data quality tracking
