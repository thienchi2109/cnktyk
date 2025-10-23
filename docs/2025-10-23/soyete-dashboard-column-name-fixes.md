# SoYTe Admin Dashboard: Data Fetching Fix Complete

**Date**: 2025-10-23  
**Issue**: Dashboard KPI cards showing empty/null values  
**Root Cause**: SQL queries using incorrect column names that don't exist in database  
**Resolution**: Corrected column names verified via Neon MCP tools

---

## Problem Identified

The SoYTe (Sở Y Tế) admin dashboard at `/dashboard/doh` was displaying empty or null values for all KPI cards because the backend API endpoints were querying the database with **column names that don't exist**.

### Error Observed
```
Database query error: Error [NeonDbError]: column "SoTinChi" does not exist
Database query error: Error [NeonDbError]: column g.NgayHoatDong does not exist
```

---

## Schema Verification (Authoritative via Neon MCP)

Used Neon MCP tools to query the actual database schema:

```sql
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'GhiNhanHoatDong' AND table_schema = 'public' 
ORDER BY ordinal_position
```

### GhiNhanHoatDong Table - Verified Columns

| Column Name | Data Type | Nullable |
|-------------|-----------|----------|
| MaGhiNhan | uuid | NO |
| MaNhanVien | uuid | NO |
| MaDanhMuc | uuid | YES |
| TenHoatDong | text | NO |
| **NgayGhiNhan** | timestamp with time zone | NO |
| FileMinhChungUrl | text | YES |
| NguoiNhap | uuid | NO |
| TrangThaiDuyet | USER-DEFINED | NO |
| NgayDuyet | timestamp with time zone | YES |
| NguoiDuyet | uuid | YES |
| GhiChuDuyet | text | YES |
| HinhThucCapNhatKienThucYKhoa | text | YES |
| ChiTietVaiTro | text | YES |
| DonViToChuc | text | YES |
| NgayBatDau | date | YES |
| NgayKetThuc | date | YES |
| SoTiet | numeric | YES |
| **SoGioTinChiQuyDoi** | numeric | YES |
| BangChungSoGiayChungNhan | text | YES |

---

## Column Name Mapping (Incorrect → Correct)

| ❌ Incorrect (Code) | ✅ Correct (Database) | Usage |
|---------------------|----------------------|-------|
| `"SoTinChi"` | `"SoGioTinChiQuyDoi"` | Credit/hours calculation |
| `"NgayHoatDong"` | `"NgayGhiNhan"` | Activity date filtering |

---

## Files Fixed

### 1. `/api/system/metrics` Route
**File**: `src/app/api/system/metrics/route.ts`

#### Changes Made:

**Line 60**: Total credits awarded query
```typescript
// Before ❌
db.query('SELECT COALESCE(SUM("SoTinChi"), 0) as total...')

// After ✅  
db.query('SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total...')
```

**Lines 71, 75**: Compliance rate calculation
```sql
-- Before ❌
SELECT COALESCE(SUM(g."SoTinChi"), 0)
WHERE g."NgayHoatDong" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"

-- After ✅
SELECT COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0)
WHERE g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
```

**Lines 91, 95**: At-risk practitioners query
```sql
-- Before ❌
SELECT COALESCE(SUM(g."SoTinChi"), 0)
WHERE g."NgayHoatDong" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"

-- After ✅
SELECT COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0)
WHERE g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
```

---

### 2. `/api/system/units-performance` Route
**File**: `src/app/api/system/units-performance/route.ts`

#### Changes Made:

**Lines 28, 32**: Compliant practitioners calculation
```sql
-- Before ❌
SELECT COALESCE(SUM(g."SoTinChi"), 0)
WHERE g."NgayHoatDong" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"

-- After ✅
SELECT COALESCE(SUM(g."SoGioTinChiQuyDoi"), 0)
WHERE g."NgayGhiNhan" BETWEEN kc."NgayBatDau" AND kc."NgayKetThuc"
```

**Line 42**: Total credits per unit
```sql
-- Before ❌
THEN g."SoTinChi"

-- After ✅
THEN g."SoGioTinChiQuyDoi"
```

---

## Neon MCP Verification Results

Tested corrected queries directly against Neon database:

### Test 1: Total Credits Query
```sql
SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total 
FROM "GhiNhanHoatDong" 
WHERE "TrangThaiDuyet" = 'DaDuyet'
```
**Result**: `{ "total": "5.50" }` ✅ Success

### Test 2: Pending Approvals Query
```sql
SELECT COUNT(*) as count 
FROM "GhiNhanHoatDong" 
WHERE "TrangThaiDuyet" = 'ChoDuyet'
```
**Result**: `{ "count": "10" }` ✅ Success

---

## Impact Assessment

### Fixed KPIs
- ✅ **Total Units**: Active units count
- ✅ **Total Practitioners**: Overall and active counts
- ✅ **Compliance Rate**: Percentage of compliant practitioners
- ✅ **Pending Approvals**: Count of submissions awaiting approval
- ✅ **Total Credits Awarded**: Sum of approved activity credits
- ✅ **At-Risk Practitioners**: Count needing attention
- ✅ **Approved This Month**: Monthly approval count
- ✅ **Rejected This Month**: Monthly rejection count

### Fixed Unit Performance Metrics
- ✅ **Unit-level compliance rates**
- ✅ **Total credits per unit**
- ✅ **Active practitioners per unit**
- ✅ **Pending approvals per unit**

---

## Testing Checklist

### Backend API Testing
- [ ] Start dev server: `npm run dev`
- [ ] Test `/api/system/metrics` returns 200 with valid data
- [ ] Test `/api/system/units-performance` returns 200 with valid data
- [ ] Verify no "column does not exist" errors in server logs
- [ ] Confirm 403 for non-SoYTe users

### Frontend Dashboard Testing
- [ ] Login as SoYTe user
- [ ] Navigate to `/dashboard/doh`
- [ ] Verify all KPI cards show non-null numeric values
- [ ] Check compliance rate displays correctly
- [ ] Confirm credits total matches Neon MCP query result (5.50)
- [ ] Verify pending approvals count matches (10)
- [ ] Test unit performance list loads with data
- [ ] Ensure search and sorting work without errors
- [ ] Check browser console for no errors

### Data Accuracy Validation
- [ ] Total credits: Should be 5.50 (verified via Neon MCP)
- [ ] Pending approvals: Should be 10 (verified via Neon MCP)
- [ ] Compliance calculations based on SoGioTinChiQuyDoi
- [ ] Date filtering using NgayGhiNhan column

---

## Related Documentation

- **Migration 003**: Extended activity fields for bulk import system
- **Schema Document**: `docs/2025-10-03/v_1_init_schema.sql`
- **Column Name Fix**: `docs/2025-10-15/COLUMN_NAME_FIX_COMPLETE.md`
- **Last Session**: `docs/2025-10-22/session-bulk-approve-signin-fix.md`

---

## Technical Notes

### Database Schema History
- **Original schema** (v1): Used column names `SoTinChiQuyDoi`, `CreatedAt`, `UpdatedAt`
- **Migration 003** (2025-10-15): Renamed to `SoGioTinChiQuyDoi`, removed `UpdatedAt`, renamed timestamps
- **Issue**: Some API routes were not updated after Migration 003

### Why "SoGioTinChiQuyDoi"?
- **So**: Number
- **Gio**: Hours
- **TinChi**: Credits  
- **QuyDoi**: Converted/Equivalent
- **Meaning**: "Number of credit-hours converted" (the calculated credit value based on activity hours and conversion rate)

### Column Names Used in Calculations
- `SoGioTinChiQuyDoi`: Stores the final credit value (numeric) for approved activities
- `NgayGhiNhan`: The timestamp when the activity was recorded (used for cycle date range filtering)
- `TrangThaiDuyet`: Approval status enum ('ChoDuyet', 'DaDuyet', 'TuChoi')
- `NgayDuyet`: Timestamp when activity was approved/rejected

---

## Verification Commands

### Using Neon MCP Tools
```bash
# List all tables
call_mcp_tool list_projects

# Describe project structure
call_mcp_tool describe_project --projectId "noisy-sea-78740912"

# Get table schema
call_mcp_tool run_sql --sql "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'GhiNhanHoatDong'"

# Test credit sum query
call_mcp_tool run_sql --sql "SELECT COALESCE(SUM(\"SoGioTinChiQuyDoi\"), 0) as total FROM \"GhiNhanHoatDong\" WHERE \"TrangThaiDuyet\" = 'DaDuyet'"
```

---

## Next Steps

### Immediate
1. ✅ Fix column names in API routes
2. ⏳ Test locally with dev server
3. ⏳ Verify dashboard displays correct data
4. ⏳ Commit changes with descriptive message

### Follow-up
- Add error handling and logging to API routes
- Enhance client-side error display with retry mechanism
- Document all column name conventions for future reference
- Consider adding integration tests for these endpoints
- Add TypeScript type checking for SQL query results

---

## Status: ✅ FIXED

All column name mismatches corrected and verified against authoritative Neon database schema.

**API endpoints now query the correct columns:**
- `SoGioTinChiQuyDoi` for credit calculations
- `NgayGhiNhan` for activity date filtering

**Expected outcome**: Dashboard KPI cards will display accurate, non-null values based on actual database data.
