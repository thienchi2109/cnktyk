# Proposal: Add Practitioner-Submissions Integration

**Change ID:** `add-practitioner-submissions-integration`
**Status:** Pending Approval
**Created:** 2025-11-16
**Author:** Claude AI Assistant

---

## Why

### Problem Statement

Unit admins (DonVi role) face a **fragmented workflow** when managing practitioner compliance. The practitioners page displays compliance metrics (e.g., "45 / 120 credits - 37%"), but provides no visibility into **which activities** contributed to those credits or **what submissions** exist for each practitioner.

**Current Pain Points:**

1. **Disconnected pages:** Practitioners page and submissions page are completely separate
2. **Manual context switching:** Admins must:
   - View practitioner compliance on `/practitioners`
   - Memorize the practitioner's name
   - Navigate to `/submissions` (losing context)
   - Manually search for that practitioner
   - Return to `/practitioners` to check next person
   - Repeat for every non-compliant practitioner
3. **No drill-down capability:** Compliance percentage is shown, but there's no way to investigate WHY
4. **Inefficient approval workflow:** Cannot quickly approve pending submissions from practitioner context

### Business Impact

- **Time waste:** Unit admins managing 50+ practitioners spend excessive time switching contexts
- **Errors:** Manual search prone to typos and Vietnamese diacritics issues
- **Poor UX:** No drill-down from summary (compliance %) to details (individual activities)
- **Delayed approvals:** Cannot take action on pending submissions from practitioner view

---

## What Changes

### High-Level Overview

Add **contextual navigation and preview** from practitioner detail sheet to their submissions, following a drill-down UX pattern: summary → details.

### Specific Changes

#### 1. Submissions Summary Card (New)
Add a summary statistics card in `PractitionerDetailSheet.tsx` showing:
- Count of pending submissions (ChoDuyet)
- Count of approved submissions (DaDuyet)
- Count of rejected submissions (TuChoi)
- Displayed immediately when detail sheet opens

#### 2. Recent Submissions Preview Table (New)
Add a preview table showing last 5 submissions with:
- Activity name
- Submission date
- Status badge (pending/approved/rejected)
- Credits earned
- Displayed below summary card

#### 3. View All Submissions Button (New)
Add navigation button that opens `/submissions` page with:
- Pre-applied filter: `practitionerId={MaNhanVien}`
- Query parameter passed via URL
- Existing API already supports this filter

#### 4. API Enhancement (Minor)
The submissions API (`/api/submissions`) already supports filtering by `practitionerId`. Minor enhancement:
- Add dedicated endpoint or extend existing: `/api/submissions/summary?practitionerId={id}`
- Returns: `{ pending: number, approved: number, rejected: number }`

---

## Impact

### Affected Specifications

- **New:** `practitioner-management` - Creating new spec for practitioner management capabilities
- **Related:** `activity-submission` - Uses existing submissions API with practitionerId filter

### Affected Code

**Frontend Components:**
- `src/components/practitioners/practitioner-detail-sheet.tsx` - Add summary card, preview table, navigation button
- `src/app/(authenticated)/submissions/page.tsx` - Handle practitionerId query parameter (already supported)
- `src/components/submissions/submissions-list.tsx` - Pre-apply filter from URL params (already supported)

**Backend API:**
- `src/app/api/submissions/route.ts` - Already supports practitionerId filter (line 30, 76-86)
- `src/app/api/submissions/summary/route.ts` - New endpoint for summary statistics (optional optimization)

**Hooks:**
- New custom hook: `src/hooks/use-practitioner-submissions.ts` - Fetch submissions for single practitioner
- New custom hook: `src/hooks/use-practitioner-submissions-summary.ts` - Fetch summary statistics

### RBAC Considerations

- **DonVi role:** Can only view submissions from practitioners in their unit (already enforced by API)
- **SoYTe role:** Can view submissions from any practitioner
- **NguoiHanhNghe role:** Can only view own submissions (not affected by this change)
- **Auditor role:** Read-only access (not affected by this change)

### Data Flow

```
PractitionerDetailSheet (opens)
    ↓
Fetch summary: GET /api/submissions/summary?practitionerId={id}
    ↓
Fetch recent: GET /api/submissions?practitionerId={id}&limit=5
    ↓
Display summary card + preview table
    ↓
User clicks "View All Submissions →"
    ↓
Navigate to: /submissions?practitionerId={id}
    ↓
SubmissionsList applies filter from URL params
```

---

## Benefits

### For Unit Admins (DonVi)
- ✅ **Immediate context:** See why practitioner is at 37% compliance without leaving page
- ✅ **Faster workflow:** No manual search or context switching
- ✅ **Better decision-making:** Preview submissions before deep dive
- ✅ **Streamlined approvals:** Can see pending count and navigate directly

### For System
- ✅ **Leverages existing API:** Minimal backend changes (API already supports filters)
- ✅ **Consistent UX pattern:** Matches drill-down patterns in dashboard (summary → details)
- ✅ **Maintainable:** Reuses existing components and query logic

### For SoYTe Role
- ✅ **System-wide visibility:** Can drill into any practitioner's submissions
- ✅ **Better oversight:** Quickly investigate compliance issues

---

## Technical Approach

### Implementation Strategy

**Option 3: Hybrid Approach** (Recommended)

Combines quick stats, preview table, and deep-dive navigation:

1. **Summary Card** - Instant overview of submission status
2. **Preview Table** - Last 5 submissions with key details
3. **Navigation Button** - Deep dive to full submissions list when needed

### Why Not Other Options?

- **Option 1 (Link only):** Too minimal, still requires full navigation
- **Option 2 (Full embedded list):** Too heavy, slower load times, complex component

### Performance Considerations

- **Two API calls on sheet open:** Summary + recent submissions (parallel)
- **Caching:** Use TanStack Query for efficient caching
- **Lazy loading:** Data fetched only when detail sheet opens
- **Prefetching:** Not needed for initial implementation

---

## Alternatives Considered

### Alternative 1: Full Submissions Table in Detail Sheet
**Rejected:** Makes detail sheet too heavy, slower performance, complex pagination

### Alternative 2: Navigation Link Only
**Rejected:** Doesn't solve the "why" question, still requires manual investigation

### Alternative 3: Modal Overlay
**Rejected:** Competing modals (sheet + modal) create poor UX

---

## Dependencies

### Required
- Existing submissions API endpoint: `/api/submissions` ✅ Already exists
- Existing RBAC enforcement in submissions API ✅ Already exists
- TanStack Query for data fetching ✅ Already in use

### Optional
- New endpoint `/api/submissions/summary` for performance optimization (can use existing endpoint with aggregation on frontend)

---

## Open Questions

1. **Summary endpoint:** Create dedicated `/api/submissions/summary` or aggregate on frontend?
   - **Recommendation:** Aggregate on frontend initially, optimize later if needed

2. **Preview table row count:** Show 5 or 10 recent submissions?
   - **Recommendation:** 5 rows to keep detail sheet compact

3. **Empty state:** What to show when practitioner has 0 submissions?
   - **Recommendation:** "Chưa có hoạt động nào" with suggestion to create submission

4. **Loading state:** Show skeleton or spinner for summary/preview?
   - **Recommendation:** Skeleton for better perceived performance

---

## Success Criteria

- [ ] Unit admins can see submission summary without leaving practitioner detail sheet
- [ ] Preview table shows last 5 submissions with status and credits
- [ ] "View All Submissions" button navigates to filtered submissions list
- [ ] RBAC properly enforced (DonVi sees only their unit's data)
- [ ] No performance degradation on detail sheet open (<500ms load time)
- [ ] Empty state handled gracefully (0 submissions)
- [ ] Error states handled (API failure, network issues)

---

## Timeline Estimate

- **Planning & Spec:** 30 minutes ✅ (This document)
- **Implementation:** 45-60 minutes
  - Summary card: 10 minutes
  - Preview table: 20 minutes
  - Navigation button: 5 minutes
  - API hooks: 15 minutes
  - Testing & polish: 10 minutes
- **Testing:** 15 minutes
- **Total:** ~90 minutes

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| API performance on large datasets | Medium | Add limit parameter, use pagination |
| RBAC bypass vulnerability | High | Reuse existing API with proven RBAC enforcement |
| Detail sheet becomes too slow | Medium | Parallel API calls, caching with TanStack Query |
| Vietnamese diacritics in URLs | Low | URL encoding handled by Next.js router |

---

## Follow-Up Work (Future)

- **Quick approval actions:** Approve/reject submissions from preview table (not in this change)
- **Compliance timeline:** Visual timeline of submissions over 5-year cycle
- **Export practitioner report:** PDF/Excel export of individual practitioner's compliance data
- **Notifications integration:** Show pending notifications for this practitioner
