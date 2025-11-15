# Phase 1 Testing Guide

**Status**: ✅ Implementation Complete - Ready for Testing  
**Date**: October 29, 2025

---

## Overview

This guide provides instructions for testing Phase 1 critical fixes including:
1. Optimized Unit Metrics API (CTE query)
2. Pagination for Unit Admin Dashboard
3. Performance monitoring

---

## Prerequisites

- Local development environment running
- Access to Neon database (`noisy-sea-78740912`)
- Test user accounts with different roles (SoYTe, DonVi)
- At least 20+ practitioners in test database for pagination testing

---

## Test 1: Unit Metrics API Performance

### Objective
Verify that the optimized CTE query performs 3-5x faster than the old sequential queries.

### Method A: SQL Performance Test (Recommended)

1. **Run the performance test script**:
   ```bash
   psql $DATABASE_URL -f scripts/test-phase1-performance.sql
   ```

2. **Update the unit ID** in the script:
   - Replace `'00000000-0000-0000-0000-000000000003'` with an actual unit ID from your database
   - Use a unit with 10+ practitioners for meaningful results

3. **Compare results**:
   - OLD method: Sum of 7 query execution times
   - NEW method: Single CTE query execution time
   - Calculate improvement: `(OLD - NEW) / OLD * 100`

4. **Expected results**:
   - Small units (<10 practitioners): NEW < 50ms
   - Medium units (10-50 practitioners): NEW < 100ms
   - Large units (50+ practitioners): NEW < 150ms
   - Improvement: 60-85% faster

### Method B: API Endpoint Test

1. **Start the development server**:
   ```bash
   npm run dev
   ```

2. **Make API request** (replace `{unitId}` with actual unit):
   ```bash
   curl -X GET "http://localhost:3000/api/units/{unitId}/metrics" \
     -H "Cookie: session=YOUR_SESSION_COOKIE" \
     -w "\nTime: %{time_total}s\n"
   ```

3. **Check console logs** for performance metrics:
   - Look for `[PERF] GET /api/units/{id}/metrics - XXXms`
   - Green (<100ms) = Excellent
   - Yellow (<300ms) = Good
   - Red (>=300ms) = Needs investigation

4. **Verify metrics correctness**:
   ```json
   {
     "success": true,
     "data": {
       "totalPractitioners": X,
       "activePractitioners": X,
       "complianceRate": X,
       "pendingApprovals": X,
       "approvedThisMonth": X,
       "rejectedThisMonth": X,
       "atRiskPractitioners": X
     }
   }
   ```

---

## Test 2: Pagination Functionality

### Objective
Verify server-side pagination works correctly with 10 items per page.

### Setup
Ensure your test unit has at least 25+ practitioners for comprehensive testing.

### Test Cases

#### 2.1 Basic Pagination
1. Navigate to Unit Admin Dashboard
2. Verify only 10 practitioners are displayed initially
3. Check pagination controls appear at bottom
4. Verify page count display: "Hiển thị 1 - 10 / {total}"

**Expected**: ✅ Only 10 items shown, pagination controls visible

#### 2.2 Page Navigation
1. Click "Next" button
2. Verify URL updates (if applicable)
3. Verify new set of 10 practitioners loads
4. Verify page count updates: "Hiển thị 11 - 20 / {total}"
5. Click "Previous" button
6. Verify returns to first 10 practitioners

**Expected**: ✅ Smooth navigation, correct items displayed

#### 2.3 Direct Page Selection
1. Click on page number (e.g., page 3)
2. Verify correct page loads
3. Verify page number button is highlighted
4. Verify page count matches: "Hiển thị 21 - 30 / {total}"

**Expected**: ✅ Correct page loads, active page highlighted

#### 2.4 Search Functionality
1. Enter search term (e.g., practitioner name)
2. Verify results filtered
3. Verify pagination resets to page 1
4. Verify total count updates to filtered count

**Expected**: ✅ Search works, pagination resets, counts update

#### 2.5 Filter Functionality
1. Select filter: "Rủi ro cao" (At-risk)
2. Verify only at-risk practitioners shown
3. Verify pagination resets to page 1
4. Change filter to "Đạt chuẩn" (Compliant)
5. Verify different set of practitioners shown

**Expected**: ✅ Filters apply, pagination resets, correct subset shown

#### 2.6 Edge Cases
- **No results**: Search for non-existent name → Should show "Không tìm thấy người hành nghề"
- **Exactly 10 results**: Filter to get exactly 10 → No pagination controls
- **Less than 10 results**: Filter to get <10 → No pagination controls
- **Page out of bounds**: Manually navigate to invalid page → Should redirect to valid page

**Expected**: ✅ All edge cases handled gracefully

---

## Test 3: Performance Monitoring

### Objective
Verify performance logging works correctly.

### Test Cases

#### 3.1 Console Logging (Development Mode)
1. Ensure `NODE_ENV=development`
2. Make API request to `/api/units/{id}/metrics`
3. Check console for colored output:
   ```
   [PERF] GET /api/units/{id}/metrics - 45.23ms (200)
   ```
4. Verify color coding:
   - Green: < 100ms ✅
   - Yellow: 100-299ms ⚠️
   - Red: >= 300ms ❌

**Expected**: ✅ Logs appear with correct colors

#### 3.2 Slow Query Warnings
1. Simulate slow query (if possible, add delay)
2. Verify warning appears for queries >500ms:
   ```
   ⚠️  SLOW QUERY: GET /api/units/{id}/metrics took 523.45ms
   ```

**Expected**: ✅ Warning logged for slow queries

#### 3.3 Performance Statistics
1. Make multiple API requests (10+)
2. Access performance stats (in browser console or create endpoint):
   ```typescript
   import { perfMonitor } from '@/lib/performance';
   console.log(perfMonitor.getStats('/api/units/*/metrics'));
   ```
3. Verify stats returned:
   ```javascript
   {
     count: 15,
     avgDuration: 67.8,
     minDuration: 34.2,
     maxDuration: 123.5,
     p50: 65.0,
     p95: 110.2,
     p99: 120.1
   }
   ```

**Expected**: ✅ Accurate statistics calculated

---

## Test 4: Integration Testing

### Objective
Verify all components work together correctly.

### Scenario: Complete Dashboard Workflow

1. **Login** as DonVi admin
2. **Navigate** to Unit Admin Dashboard
3. **Observe** metrics load quickly (<150ms in logs)
4. **Verify** all 7 metrics display correctly
5. **Scroll** to practitioners section
6. **Verify** pagination shows (if >10 practitioners)
7. **Search** for specific practitioner
8. **Verify** search results appear quickly
9. **Navigate** through pages
10. **Apply** filter (at-risk)
11. **Verify** filtered results
12. **Clear** search/filter
13. **Verify** returns to original view

**Expected**: ✅ Smooth, fast experience throughout

---

## Test 5: Backwards Compatibility

### Objective
Ensure existing functionality still works.

### Test Cases

1. **API Response Structure**:
   - Verify response structure matches old format exactly
   - No breaking changes to field names or types

2. **Other Dashboard Components**:
   - Verify DOH Dashboard still works
   - Verify Practitioner Dashboard still works
   - Verify Approvals section still works

3. **Existing Links**:
   - "Xem chi tiết" buttons work
   - "Xem tất cả" links work
   - Navigation remains functional

**Expected**: ✅ No regressions, all existing features work

---

## Performance Benchmarks

| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| Unit Metrics API (p50) | 350ms | <100ms | 🧪 Testing |
| Unit Metrics API (p95) | 450ms | <150ms | 🧪 Testing |
| Database queries | 7 | 1 | ✅ Complete |
| Practitioners per page | ALL | 10 | ✅ Complete |
| Data transfer reduction | 0% | 90% | ✅ Complete |

---

## Known Issues / Limitations

- [ ] Unit tests for metrics endpoint not yet written (Task 1.1.4)
- [ ] Performance logging only works in development mode by default
- [ ] Pagination tested manually, needs automated tests

---

## Rollback Procedure

If critical issues are found:

```bash
# Revert to previous version
git revert 066f100

# Or revert specific files
git checkout HEAD~1 -- src/app/api/units/[id]/metrics/route.ts
git checkout HEAD~1 -- src/components/dashboard/unit-admin-dashboard.tsx
git checkout HEAD~1 -- src/lib/performance.ts

# Restart application
npm run dev
```

---

## Test Results Template

Copy this template to record your test results:

```markdown
## Test Results - Phase 1

**Tester**: [Your Name]  
**Date**: [Date]  
**Environment**: [Local/Staging]

### Unit Metrics API Performance
- [ ] Old queries total time: ___ms
- [ ] New CTE query time: ___ms
- [ ] Improvement: ___%
- [ ] Status: PASS / FAIL
- [ ] Notes: ___

### Pagination
- [ ] Basic pagination: PASS / FAIL
- [ ] Page navigation: PASS / FAIL
- [ ] Search functionality: PASS / FAIL
- [ ] Filter functionality: PASS / FAIL
- [ ] Edge cases: PASS / FAIL
- [ ] Notes: ___

### Performance Monitoring
- [ ] Console logging: PASS / FAIL
- [ ] Color coding: PASS / FAIL
- [ ] Slow query warnings: PASS / FAIL
- [ ] Statistics: PASS / FAIL
- [ ] Notes: ___

### Integration
- [ ] Complete workflow: PASS / FAIL
- [ ] Notes: ___

### Backwards Compatibility
- [ ] API structure: PASS / FAIL
- [ ] Other components: PASS / FAIL
- [ ] Existing links: PASS / FAIL
- [ ] Notes: ___

### Overall Assessment
- [ ] Ready for deployment: YES / NO / NEEDS_WORK
- [ ] Blocker issues: ___
- [ ] Recommendations: ___
```

---

## Next Steps After Testing

1. ✅ Document test results
2. ✅ Fix any issues found
3. ✅ Update tasks.md with test completion
4. ✅ Proceed to Phase 2 if all tests pass
5. ✅ Deploy to staging environment
6. ✅ Monitor production metrics

---

**Questions?** Contact the development team or refer to `PHASE_1_COMPLETE.md` for implementation details.
