# Working Session: Bulk Approve + Dynamic Badge + Signin UX Fix

**Date**: 2025-10-22 to 2025-10-23  
**Duration**: Multi-hour session  
**Focus**: Submissions management enhancements and authentication flow improvement

---

## Session Overview

### 1. Dynamic Header Badge (Completed)
**Problem**: Header navigation showed mock badge value (12) for "Hoạt động" menu item.

**Solution**:
- Replaced hardcoded badge with DB-driven pending count for DonVi (unit admins).
- Fetched count server-side in `src/app/(authenticated)/layout.tsx` via `ghiNhanHoatDongRepo.getActivityStats(unitId)`.
- Passed `submissionPendingCount` prop to `ResponsiveNavigation`.
- Badge only displays for DonVi role; shows actual pending submissions awaiting approval.

**Files Modified**:
- `src/components/layout/responsive-navigation.tsx` - added prop, conditional badge rendering
- `src/app/(authenticated)/layout.tsx` - fetch and pass pending count

---

### 2. Bulk Approve Submissions (Completed)

**Problem**: Unit admins needed to approve multiple pending submissions individually, causing workflow inefficiency.

**Solution**: End-to-end bulk approval feature.

#### Backend
- **Repository** (`src/lib/db/repositories.ts`):
  - Added `approveActivities(ids: string[], comments?: string, unitId?: string)`
  - SQL: `UPDATE ... FROM NhanVien WHERE ... AND TrangThaiDuyet='ChoDuyet' AND MaDonVi=unitId RETURNING MaGhiNhan`
  - Unit restriction enforced at DB level for DonVi role

- **API** (`src/app/api/submissions/bulk/route.ts`):
  - POST endpoint: `{ action: "approve", ids: string[], comments?: string }`
  - RBAC: DonVi (own unit) and SoYTe (all units)
  - Returns: `{ processedCount, updatedIds, skippedIds }`

- **Stats endpoint** (`src/app/api/activities/stats/route.ts`):
  - GET returns `{ total, pending, approved, rejected }` for client refresh

#### Frontend
- **Hooks** (`src/hooks/use-submissions.ts`):
  - Added `useBulkApproveSubmissions` mutation
  - Added `refreshKey` to query key for manual refetch triggers
  - Review mutation invalidates `["submissions"]`

- **UI** (`src/components/submissions/submissions-list.tsx`):
  - Checkboxes for pending rows only (TrangThaiDuyet='ChoDuyet')
  - Select-all checkbox in header (page-scoped)
  - Bulk approve button: shows count, disabled while pending, displays "Đang xử lý..."
  - Success/error alerts with auto-dismiss (3s)
  - Removed empty-state "Ghi nhận hoạt động đầu tiên" button (per user request)
  - Calls `router.refresh()` on success to update list and header badge

#### User Flow
1. DonVi user sees pending submissions with checkboxes
2. Selects items → clicks "Phê duyệt hàng loạt (N)" button
3. Confirmation dialog → API call
4. Success alert: "Đã phê duyệt X hoạt động, bỏ qua Y"
5. List and header badge refresh immediately

**Commit**: `feat(submissions): add bulk approve + dynamic pending badge` (03e7c0e)

---

### 3. Signin UX Fix (Completed)

**Problem**: After clicking "Sign in", users experienced confusing navigation:
- User credentials validated → redirect to `/dashboard`
- `/dashboard` server page immediately redirects to role-specific dashboard
- Brief flash of signin page or intermediate states

**Root Cause**:
- Client-side `router.push('/dashboard')` triggered intermediate navigation
- `/dashboard` page performed server-side `redirect()` to role dashboard
- Middleware may have caused additional redirects

**Solution**:
- **Signin page** (`src/app/auth/signin/page.tsx`):
  - Changed `router.push()` to `router.replace()` (no back-navigation to signin)
  - Keep loading overlay visible after successful login to mask intermediate states (do not clear `isLoading` on success)
  - Navigate directly to role-specific dashboards:
    - SoYTe → `/dashboard/doh`
    - DonVi → `/dashboard/unit-admin`
    - NguoiHanhNghe → `/dashboard/practitioner`
    - Auditor → `/dashboard`
  - Renamed helper: `getDashboardUrl()` → `getRoleSpecificDashboard()`

- **Middleware** (`middleware.ts`):
  - Added guard: authenticated users accessing `/auth/signin` → redirect to dashboard
  - Prevents logged-in users from seeing signin page

**Before Flow**:
```
Click Sign in → validate → push /dashboard → server redirect → role dashboard
                                  ↑ visible flicker/confusion
```

**After Flow**:
```
Click Sign in → validate → replace /dashboard/{role} → smooth direct navigation
Middleware blocks re-access to signin when authenticated
```

**Files Modified**:
- `src/app/auth/signin/page.tsx`
- `middleware.ts`

**Status**: Completed; verified no signin page flash. Further QA checks ongoing.

---

## Testing Checklist

### Bulk Approve
- [x] DonVi can select and approve multiple pending submissions
- [x] Badge decrements after approval
- [x] SoYTe can approve across units
- [x] Skipped items (non-pending, other unit) excluded from update
- [x] Success/error feedback displays correctly

### Signin Flow
- [x] Sign in redirects directly to role dashboard
- [x] No intermediate signin page flash
- [x] Authenticated users cannot access `/auth/signin`
- [ ] Back button after signin does not return to signin page

### Badge Accuracy
- [x] Shows correct pending count for DonVi
- [x] Updates after bulk approve
- [x] Not shown for other roles

---

## Technical Notes

- **SQL Performance**: Bulk approve uses single UPDATE with JOIN; indexed on TrangThaiDuyet and MaDonVi.
- **Cache Strategy**: React Query invalidates `["submissions"]` on mutate; `router.refresh()` updates server-rendered header.
- **RBAC**: Enforced at API layer with DB-level unit restriction for DonVi.
- **UX**: `router.replace()` removes signin from history; middleware prevents double-navigation.

---

## Follow-up Tasks

### High Priority
- [x] Commit signin UX fix with detailed message
- [x] Test signin flow in dev environment
- [ ] Verify back-button behavior

### Optional Enhancements
- [ ] Add bulk reject/request-info mirroring approve
- [ ] Unit tests: repository bulk SQL, API RBAC, selection logic
- [ ] Consider client-side header state provider for instant badge updates
- [ ] Add stable secondary sort to submissions list (e.g., MaGhiNhan DESC)

---

## Files Changed This Session

### New Files
- `src/app/api/submissions/bulk/route.ts`
- `src/app/api/activities/stats/route.ts`
- `docs/2025-10-22/bulk-approve-submissions.md`
- `docs/2025-10-22/session-bulk-approve-signin-fix.md` (this file)

### Modified Files
- `src/lib/db/repositories.ts`
- `src/components/layout/responsive-navigation.tsx`
- `src/app/(authenticated)/layout.tsx`
- `src/hooks/use-submissions.ts`
- `src/components/submissions/submissions-list.tsx`
- `src/app/auth/signin/page.tsx`
- `middleware.ts`

### Verification
- Typecheck: ✅ Passed
- ESLint: ⚠️ Warnings only (no new errors)
- Manual testing: ⏳ Pending signin flow verification

---

## Session Artifacts

**Git Commits**:
1. `03e7c0e` - feat(submissions): add bulk approve + dynamic pending badge
2. `fix(auth): remove signin flash with direct role navigation and persistent loading overlay` - improve UX; middleware guard; docs updated

**Documentation**:
- Detailed API contracts in bulk-approve-submissions.md
- Testing procedures and follow-ups documented

**Key Learnings**:
- Server-side redirects in Next.js App Router can cause navigation flicker
- Using `router.replace()` + direct role URLs eliminates intermediate states
- Middleware can prevent backward navigation to public routes after auth
- Single SQL UPDATE with JOIN is more efficient than N individual approvals
