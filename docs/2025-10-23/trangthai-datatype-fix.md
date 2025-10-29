# TrangThai Data Type Fix

**Date**: 2025-10-23  
**Issue**: Units comparison returning no data  
**Cause**: Incorrect assumption about TrangThai column data type  

---

## Problem

After implementing the SoYTe filter, the units-performance API returned **zero results** instead of showing the 4 operational healthcare facilities.

## Root Cause

### Wrong Assumption
Documentation suggested `TrangThai` was a BOOLEAN column:
```sql
"TrangThai" BOOLEAN NOT NULL DEFAULT true
```

### Actual Reality
Database stores `TrangThai` as **TEXT** with string values:
```json
{
  "TrangThai": "HoatDong"  // ← TEXT, not boolean!
}
```

## The Error
```
Error: operator does not exist: text = boolean
```

Query was trying: `WHERE dv."TrangThai" = true`  
But column contains: `"HoatDong"` (string)

---

## Fix Applied

**File**: `src/app/api/system/units-performance/route.ts`

```sql
-- Before ❌
WHERE dv."TrangThai" = true

-- After ✅
WHERE dv."TrangThai" = 'HoatDong'
```

---

## Verification

Query now correctly returns **4 operational units**:

```json
[
  {
    "TenDonVi": "Trung tâm Y tế Ninh Kiều",
    "CapQuanLy": "TrungTam",
    "TrangThai": "HoatDong"
  },
  {
    "TenDonVi": "Bệnh viện Nhi đồng thành phố Cần Thơ",
    "CapQuanLy": "BenhVien",
    "TrangThai": "HoatDong"
  },
  {
    "TenDonVi": "Bệnh viện Đa khoa thành phố Cần Thơ",
    "CapQuanLy": "BenhVien",
    "TrangThai": "HoatDong"
  },
  {
    "TenDonVi": "Bệnh viện Mắt - Răng Hàm Mặt thành phố Cần Thơ",
    "CapQuanLy": "BenhVien",
    "TrangThai": "HoatDong"
  }
]
```

✅ **3 Hospitals (BenhVien) + 1 Health Center (TrungTam) = 4 units**  
✅ **No SoYTe administrative unit**

---

## Status: ✅ FIXED

Dashboard comparison section now displays all operational healthcare facilities correctly.

## Commits
```
a01a19c - fix(api): correct TrangThai to use 'HoatDong' string not boolean
31b359b - fix(api): filter SoYTe admin units from comparison + fix CapQuanLy column
71233f0 - fix(api): correct column names in SoYTe dashboard API endpoints
```
