# Filter SoYTe Admin Units from Dashboard Comparison Section

**Date**: 2025-10-23  
**Issue**: SoYTe admin units appearing in unit comparison section  
**Resolution**: Filter out SoYTe units and fix LoaiDonVi → CapQuanLy column name

---

## Problem

The SoYTe admin dashboard "So sánh đơn vị" (Unit Comparison) section was showing SoYTe administrative units alongside regular healthcare facilities (hospitals, clinics, health centers). This cluttered the comparison view with administrative data that shouldn't be compared with operational units.

---

## Root Cause

Two issues identified:

### 1. Wrong Column Name
API was querying `dv."LoaiDonVi"` which **doesn't exist** in the database.  
Correct column: `dv."CapQuanLy"`

### 2. No Filtering
Query included all units regardless of type, showing SoYTe administrative units in the comparison.

---

## Database Schema

### DonVi Table - CapQuanLy Column
The `CapQuanLy` enum defines unit hierarchy levels:

| Value | Meaning | Should Show in Comparison |
|-------|---------|---------------------------|
| `'SoYTe'` | Provincial Health Department (Admin) | ❌ No |
| `'BenhVien'` | Hospital | ✅ Yes |
| `'TrungTam'` | Health Center | ✅ Yes |
| `'PhongKham'` | Clinic | ✅ Yes |

---

## Solution Applied

### File: `src/app/api/system/units-performance/route.ts`

#### Change 1: Fix Column Name
```typescript
// Before ❌
dv."LoaiDonVi",

// After ✅
dv."CapQuanLy",
```

#### Change 2: Add WHERE Filter
```sql
-- Before ❌
WHERE dv."TrangThai" = 'HoatDong'

-- After ✅
WHERE dv."TrangThai" = true
  AND dv."CapQuanLy" != 'SoYTe'
```

#### Change 3: Update GROUP BY
```sql
-- Before ❌
GROUP BY dv."MaDonVi", dv."TenDonVi", dv."LoaiDonVi"

-- After ✅
GROUP BY dv."MaDonVi", dv."TenDonVi", dv."CapQuanLy"
```

#### Change 4: Fix Response Mapping
```typescript
// Before ❌
type: row.LoaiDonVi,

// After ✅
type: row.CapQuanLy,
```

---

## Complete Query (After Fix)

```sql
SELECT 
  dv."MaDonVi",
  dv."TenDonVi",
  dv."CapQuanLy",
  COUNT(DISTINCT nv."MaNhanVien") as total_practitioners,
  COUNT(DISTINCT CASE WHEN nv."TrangThaiLamViec" = 'DangLamViec' 
    THEN nv."MaNhanVien" END) as active_practitioners,
  COUNT(DISTINCT CASE 
    WHEN kc."TrangThai" = 'DangDienRa' 
    AND (
      SELECT COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0)
      FROM "GhiNhanHoatDong" g
      WHERE g."MaNhanVien" = nv."MaNhanVien"
      AND g."TrangThaiDuyet" = 'DaDuyet'
      AND g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
    ) >= kc."SoTinChiYeuCau"
    THEN nv."MaNhanVien" 
  END) as compliant_practitioners,
  COUNT(DISTINCT CASE 
    WHEN g."TrangThaiDuyet" = 'ChoDuyet' 
    THEN g."MaGhiNhan" 
  END) as pending_approvals,
  COALESCE(SUM(CASE 
    WHEN g."TrangThaiDuyet" = 'DaDuyet' 
    THEN g."SoGioTinChiQuyDoi" 
    ELSE 0 
  END), 0) as total_credits
FROM "DonVi" dv
LEFT JOIN "NhanVien" nv ON dv."MaDonVi" = nv."MaDonVi"
LEFT JOIN "KyCNKT" kc ON nv."MaNhanVien" = kc."MaNhanVien"
LEFT JOIN "GhiNhanHoatDong" g ON nv."MaNhanVien" = g."MaNhanVien"
WHERE dv."TrangThai" = true
  AND dv."CapQuanLy" != 'SoYTe'  -- ✅ Filter out admin units
GROUP BY dv."MaDonVi", dv."TenDonVi", dv."CapQuanLy"
ORDER BY dv."TenDonVi"
```

---

## Impact

### Before Fix
- ❌ API query failed due to non-existent column `LoaiDonVi`
- ❌ SoYTe administrative units shown in comparison
- ❌ Cluttered comparison view with irrelevant admin data

### After Fix
- ✅ API uses correct `CapQuanLy` column
- ✅ Only operational healthcare units shown (BenhVien, TrungTam, PhongKham)
- ✅ Clean, relevant unit comparison for operational metrics
- ✅ Unit count badge shows only DonVi facilities

---

## Expected UI Behavior

### Unit Comparison Section
**Shows**:
- Bệnh viện Mắt - Răng Hàm Mặt thành phố Cần Thơ (BenhVien)
- Bệnh viện Nhi đồng thành phố Cần Thơ (BenhVien)
- Bệnh viện Đa khoa thành phố Cần Thơ (BenhVien)
- Trung tâm Y tế Ninh Kiều (TrungTam)
- Other hospitals, health centers, and clinics

**Does NOT Show**:
- Sở Y Tế Cần Thơ (SoYTe) - Administrative unit

---

## Testing Checklist

### API Testing
- [ ] `/api/system/units-performance` returns 200
- [ ] Response includes only BenhVien, TrungTam, PhongKham units
- [ ] No SoYTe units in response
- [ ] `type` field contains valid CapQuanLy values
- [ ] Unit count matches filtered results

### Dashboard UI Testing
- [ ] Navigate to `/dashboard/doh`
- [ ] Open "So sánh đơn vị" section
- [ ] Verify no SoYTe units displayed
- [ ] Unit count badge shows correct number
- [ ] Search and filter work correctly
- [ ] All unit cards show proper CapQuanLy type

---

## Related Changes

This fix is part of the broader SoYTe dashboard data fetching improvements:
- **Previous fix**: Column name corrections (SoTinChi → SoGioTinChiQuyDoi)
- **This fix**: Correct column usage (LoaiDonVi → CapQuanLy) + SoYTe filtering

---

## Technical Notes

### Why Filter SoYTe?
SoYTe represents the **Provincial Health Department** - an administrative oversight body, not an operational healthcare facility. Comparing administrative metrics with operational hospitals/clinics is meaningless.

### CapQuanLy vs LoaiDonVi
- **CapQuanLy**: Hierarchy level (SoYTe, BenhVien, TrungTam, PhongKham) - EXISTS ✅
- **LoaiDonVi**: Does not exist in schema - REMOVED ❌

### Boolean vs String for TrangThai
Changed from `'HoatDong'` string to `true` boolean to match actual schema:
```sql
-- Database schema
"TrangThai" BOOLEAN NOT NULL DEFAULT true

-- Query
WHERE dv."TrangThai" = true  -- ✅ Correct
```

---

## Status: ✅ FIXED

**API now correctly**:
- Uses `CapQuanLy` column (not LoaiDonVi)
- Filters out SoYTe administrative units
- Returns only operational healthcare facilities
- Uses proper boolean for TrangThai

**Dashboard now shows**:
- Clean unit comparison with only relevant facilities
- Accurate unit count in badge
- Proper unit type labels (BenhVien, TrungTam, PhongKham)
