# Database Schema Alignment - Complete Fix ✅

**Date**: 2025-10-15  
**Status**: Completed  
**Impact**: Critical - All database queries now working

## Overview

Fixed critical database schema misalignment issues where the codebase was using outdated column names that didn't match the actual database schema. This was causing widespread query failures across the application.

## Root Cause

After Migration 003, the database schema was updated with Vietnamese column names, but the codebase still referenced old English column names in multiple locations, causing `column does not exist` errors.

---

## Issues Fixed

### 1. Credit Column Name Mismatch
**Database**: `SoGioTinChiQuyDoi` (converted credit hours)  
**Code was using**: `SoTinChiQuyDoi`

**Impact**: All credit calculations, compliance tracking, and practitioner progress queries were failing.

### 2. Timestamp Column Name Mismatches
**Database columns**:
- `NgayGhiNhan` (record date)
- `NgayDuyet` (approval date)
- `NgayBatDau` (start date)
- `NgayKetThuc` (end date)

**Code was using**:
- `CreatedAt` / `ThoiGianTao`
- `ThoiGianDuyet`
- `ThoiGianBatDau`
- `ThoiGianKetThuc`

**Impact**: Activity submissions, approval workflows, and date-based queries were failing.

### 3. Other Column Mismatches
**Database**: `GhiChuDuyet` (approval notes)  
**Code was using**: `GhiChu`

**Database**: `SoTiet` (number of sessions)  
**Code was using**: `SoGio`

---

## Files Updated

### Schema Definitions
**File**: `src/lib/db/schemas.ts`

```typescript
// Before:
export const GhiNhanHoatDongSchema = z.object({
  // ...
  ThoiGianBatDau: z.date().nullable(),
  ThoiGianKetThuc: z.date().nullable(),
  SoGio: z.number().min(0).nullable(),
  SoTinChiQuyDoi: z.number().min(0),
  ThoiGianDuyet: z.date().nullable(),
  GhiChu: z.string().nullable(),
  CreatedAt: z.date(),
  UpdatedAt: z.date(),
});

// After:
export const GhiNhanHoatDongSchema = z.object({
  // ...
  NgayBatDau: z.date().nullable(),
  NgayKetThuc: z.date().nullable(),
  SoTiet: z.number().min(0).nullable(),
  SoGioTinChiQuyDoi: z.number().min(0),
  NgayDuyet: z.date().nullable(),
  GhiChuDuyet: z.string().nullable(),
  NgayGhiNhan: z.date(),
});
```

### Repository Layer
**File**: `src/lib/db/repositories.ts`

#### getComplianceStatus()
```sql
-- Before:
SELECT COALESCE(SUM("SoTinChiQuyDoi"), 0) as total_credits

-- After:
SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total_credits
```

#### findByPractitioner()
```sql
-- Before:
ORDER BY "ThoiGianBatDau" DESC, "CreatedAt" DESC

-- After:
ORDER BY "NgayBatDau" DESC, "NgayGhiNhan" DESC
```

#### findPendingApprovals()
```sql
-- Before:
ORDER BY g."CreatedAt" ASC

-- After:
ORDER BY g."NgayGhiNhan" ASC
```

#### approve() / reject()
```typescript
// Before:
{
  TrangThaiDuyet: 'DaDuyet',
  ThoiGianDuyet: new Date(),
  GhiChu: comments,
}

// After:
{
  TrangThaiDuyet: 'DaDuyet',
  NgayDuyet: new Date(),
  GhiChuDuyet: comments,
}
```

### Credit Engine
**File**: `src/lib/db/credit-engine.ts`

#### calculateComplianceStatus()
```sql
-- Before:
SELECT COALESCE(SUM("SoTinChiQuyDoi"), 0) as total

-- After:
SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total
```

#### getCreditsByCategory()
```sql
-- Before:
COALESCE(SUM(g."SoTinChiQuyDoi"), 0) as "TongTinChi"
WHERE g."ThoiGianBatDau" >= $2

-- After:
COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as "TongTinChi"
WHERE g."NgayBatDau" >= $2
```

#### getCreditHistory()
```typescript
// Interface update:
interface CreditHistoryRow {
  NgayGhiNhan: Date;  // was: CreatedAt / ThoiGianTao
  SoGioTinChiQuyDoi: number;
}

// Query update:
SELECT g."NgayGhiNhan"  -- was: g."CreatedAt"
ORDER BY g."NgayGhiNhan" DESC
```

#### validateCreditLimits()
```sql
-- Before:
SELECT COALESCE(SUM(g."SoTinChiQuyDoi"), 0) as total
WHERE g."ThoiGianBatDau" >= $3

-- After:
SELECT COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0) as total
WHERE g."NgayBatDau" >= $3
```

### API Routes

#### Practitioners API
**File**: `src/app/api/practitioners/route.ts`

```typescript
// Before:
const creditsEarned = parseFloat(creditsResult.rows[0]?.total_credits || '0');

// After:
const creditsEarned = parseFloat(creditsResult[0]?.total_credits || '0');
```

**Query fix**:
```sql
-- Before:
SELECT COALESCE(SUM("SoTinChiQuyDoi"), 0) as total_credits

-- After:
SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total_credits
```

#### Unit Metrics API
**File**: `src/app/api/units/[id]/metrics/route.ts`

**Fixed `.rows[0]` references** (db.query returns array directly, not result.rows):
```typescript
// Before:
const totalPractitioners = parseInt(totalPractitionersResult.rows[0]?.count || '0');
const activePractitioners = parseInt(activePractitionersResult.rows[0]?.count || '0');
const pendingApprovals = parseInt(pendingApprovalsResult.rows[0]?.count || '0');

// After:
const totalPractitioners = parseInt(totalPractitionersResult[0]?.count || '0');
const activePractitioners = parseInt(activePractitionersResult[0]?.count || '0');
const pendingApprovals = parseInt(pendingApprovalsResult[0]?.count || '0');
```

**Query fixes**:
```sql
-- Before:
WHERE g."TrangThaiDuyet" = 'DaDuyet'
AND g."ThoiGianDuyet" >= DATE_TRUNC('month', CURRENT_DATE)

-- After:
WHERE g."TrangThaiDuyet" = 'DaDuyet'
AND g."NgayDuyet" >= DATE_TRUNC('month', CURRENT_DATE)
```

#### Alerts API
**File**: `src/app/api/alerts/generate/route.ts`

```typescript
// Before:
sum + (activity.SoTinChiQuyDoi || 0)

// After:
sum + (activity.SoGioTinChiQuyDoi || 0)
```

### Utility Functions
**File**: `src/lib/db/utils.ts`

```typescript
// Before:
{ activity: activity.TenHoatDong, credits: activity.SoTinChiQuyDoi }
sum + (activity.SoTinChiQuyDoi || 0)

// After:
{ activity: activity.TenHoatDong, credits: activity.SoGioTinChiQuyDoi }
sum + (activity.SoGioTinChiQuyDoi || 0)
```

---

## Database Schema Reference

### GhiNhanHoatDong Table (Actual Schema)
```sql
CREATE TABLE "GhiNhanHoatDong" (
  "MaGhiNhan" UUID PRIMARY KEY,
  "MaNhanVien" UUID NOT NULL,
  "MaDanhMuc" UUID,
  "TenHoatDong" TEXT NOT NULL,
  "NgayGhiNhan" TIMESTAMPTZ NOT NULL,
  "FileMinhChungUrl" TEXT,
  "NguoiNhap" UUID NOT NULL,
  "TrangThaiDuyet" VARCHAR(20) NOT NULL,
  "NgayDuyet" TIMESTAMPTZ,
  "NguoiDuyet" UUID,
  "GhiChuDuyet" TEXT,
  
  -- Migration 003 fields:
  "HinhThucCapNhatKienThucYKhoa" TEXT,
  "ChiTietVaiTro" TEXT,
  "DonViToChuc" TEXT,
  "NgayBatDau" DATE,
  "NgayKetThuc" DATE,
  "SoTiet" NUMERIC(6,2),
  "SoGioTinChiQuyDoi" NUMERIC(6,2),
  "BangChungSoGiayChungNhan" TEXT
);
```

---

## Impact Areas Fixed

### ✅ Practitioner Management
- Practitioner listing with compliance status
- Individual practitioner progress calculation
- Credit history display
- Last activity date tracking

### ✅ Unit Administration
- Unit metrics and statistics
- Compliance rate calculations
- At-risk practitioner identification
- Monthly approval/rejection counts

### ✅ Credit Engine
- Credit calculation by category
- Compliance status determination
- Credit limit validation
- Credit history tracking
- Activity date filtering

### ✅ Alert System
- Compliance-based alert generation
- Progress monitoring
- Credit threshold checks

### ✅ Activity Management
- Activity submission logging
- Credit tracking
- Approval workflow
- Date-based queries

### ✅ Submissions API
- Activity listing
- Status filtering
- Date sorting

---

## Verification

### Type Check
```bash
npm run typecheck
# ✅ Exit Code: 0 - No errors
```

### Database Queries
All queries now use correct column names:
- ✅ `SoGioTinChiQuyDoi` for credit calculations
- ✅ `NgayGhiNhan` for record timestamps
- ✅ `NgayDuyet` for approval timestamps
- ✅ `NgayBatDau` / `NgayKetThuc` for activity dates
- ✅ `SoTiet` for session counts
- ✅ `GhiChuDuyet` for approval notes

### API Endpoints Working
- ✅ `/api/practitioners` - Practitioner listing with compliance
- ✅ `/api/practitioners?includeProgress=true` - Includes compliance data
- ✅ `/api/units/[id]/metrics` - Unit statistics
- ✅ `/api/submissions` - Activity submissions
- ✅ `/api/alerts/generate` - Alert generation

---

## Testing Checklist

### Database Operations
- [x] Credit calculation queries execute successfully
- [x] Compliance status calculations work
- [x] Activity history retrieval works
- [x] Activity submission with credits works
- [x] Timestamp ordering works correctly
- [x] Approval workflow updates dates correctly

### API Endpoints
- [x] GET `/api/practitioners` - Returns practitioner list
- [x] GET `/api/practitioners?includeProgress=true` - Includes compliance data
- [x] GET `/api/units/[id]/metrics` - Returns unit metrics
- [x] GET `/api/submissions` - Returns activity submissions
- [x] POST `/api/submissions` - Creates new activity submission
- [x] POST `/api/alerts/generate` - Generates compliance alerts

### Frontend Integration
- [x] Dashboard displays practitioner statistics
- [x] Unit admin dashboard shows metrics
- [x] Practitioner profiles show credit progress
- [x] Activity submission form works
- [x] Activity history displays correctly
- [x] Alert notifications appear correctly

---

## Related Documents

- [Migration 003 Summary](.kiro/specs/compliance-management-platform/MIGRATION_003_SUMMARY.md)
- [Schema Update Complete](.kiro/specs/compliance-management-platform/SCHEMA_UPDATE_COMPLETE.md)
- [API Routes Updated](.kiro/specs/compliance-management-platform/API_ROUTES_UPDATED.md)
- [Data Relationship Workflow](.kiro/specs/compliance-management-platform/DATA_RELATIONSHIP_WORKFLOW.md)

---

## Summary

✅ **All column name mismatches fixed**  
✅ **Schema definitions updated**  
✅ **Repository queries corrected**  
✅ **Credit engine aligned**  
✅ **API routes fixed**  
✅ **Utility functions updated**  
✅ **Type checking passes**  
✅ **All database queries working**

The application now correctly uses the Vietnamese column names from Migration 003 throughout the entire codebase, ensuring all database operations work correctly.
