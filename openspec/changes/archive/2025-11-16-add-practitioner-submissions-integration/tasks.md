# Implementation Tasks

**Change ID:** `add-practitioner-submissions-integration`
**Status:** Pending Approval

---

## Pre-Implementation Checklist

- [ ] Proposal approved by project maintainer
- [ ] OpenSpec validation passes (`openspec validate add-practitioner-submissions-integration --strict`)
- [ ] No conflicting changes in `openspec/changes/`
- [ ] Backend API endpoints verified to support required filters

---

## Implementation Tasks

### 1. Backend API (Optional Optimization)

#### 1.1 Verify Existing API Support
- [ ] Confirm `/api/submissions` supports `practitionerId` query parameter
- [ ] Test RBAC enforcement for DonVi role (can only access own unit's practitioners)
- [ ] Test response format includes all needed fields (status, date, credits, activity name)

#### 1.2 Create Summary Endpoint (Optional)
**Note:** Can skip if aggregating on frontend is acceptable

- [ ] Create `src/app/api/submissions/summary/route.ts`
- [ ] Implement GET handler with `practitionerId` query parameter
- [ ] Return JSON: `{ pending: number, approved: number, rejected: number, total: number }`
- [ ] Apply RBAC checks (DonVi can only query own unit's practitioners)
- [ ] Add error handling and validation
- [ ] Write unit tests for summary endpoint

---

### 2. Custom React Hooks

#### 2.1 Create Submissions Summary Hook
- [ ] Create file: `src/hooks/use-practitioner-submissions-summary.ts`
- [ ] Implement hook using TanStack Query
- [ ] Query key: `['practitioner-submissions-summary', practitionerId]`
- [ ] Handle loading, error, and success states
- [ ] Enable caching with appropriate stale time (30 seconds)
- [ ] Export TypeScript interfaces for response data

#### 2.2 Create Recent Submissions Hook
- [ ] Create file: `src/hooks/use-practitioner-recent-submissions.ts`
- [ ] Implement hook using TanStack Query
- [ ] Query key: `['practitioner-recent-submissions', practitionerId]`
- [ ] Fetch with filters: `practitionerId={id}&limit=5&page=1`
- [ ] Handle loading, error, and success states
- [ ] Enable caching with appropriate stale time (30 seconds)
- [ ] Export TypeScript interfaces for submission data

---

### 3. UI Components

#### 3.1 Create Submissions Summary Card Component
- [ ] Create file: `src/components/practitioners/submissions-summary-card.tsx`
- [ ] Accept props: `practitionerId: string`
- [ ] Use `use-practitioner-submissions-summary` hook
- [ ] Display statistics in glassmorphic card:
  - "X chờ duyệt" (yellow badge)
  - "X đã duyệt" (green badge)
  - "X từ chối" (red badge)
  - "Tổng: X hoạt động" (gray text)
- [ ] Show loading skeleton during fetch
- [ ] Show error alert if API fails
- [ ] Show empty state if total === 0: "Chưa có hoạt động nào"
- [ ] Add icon for each status (Clock, CheckCircle, XCircle)
- [ ] Use consistent styling with existing glasscn-ui components

#### 3.2 Create Recent Submissions Table Component
- [ ] Create file: `src/components/practitioners/recent-submissions-table.tsx`
- [ ] Accept props: `practitionerId: string`
- [ ] Use `use-practitioner-recent-submissions` hook
- [ ] Display table with columns:
  - **Hoạt động** (Activity name) - truncate if too long
  - **Ngày ghi nhận** (Submission date) - formatted as DD/MM/YYYY
  - **Trạng thái** (Status badge)
  - **Tín chỉ** (Credits earned) - from SoTinChiQuyDoi or calculated
- [ ] Show loading skeleton during fetch (5 rows)
- [ ] Show error alert if API fails
- [ ] Show empty state if no submissions: "Chưa có hoạt động gần đây"
- [ ] Use consistent table styling with practitioners-list.tsx
- [ ] Make table responsive (stack on mobile if needed)
- [ ] Add tooltips for truncated activity names

#### 3.3 Update Practitioner Detail Sheet
- [ ] Open file: `src/components/practitioners/practitioner-detail-sheet.tsx`
- [ ] Import new components:
  - `SubmissionsSummaryCard`
  - `RecentSubmissionsTable`
- [ ] Import icons: `FileText`, `ArrowRight`, `ExternalLink`
- [ ] Add new section after "Compliance Status" section (around line 305):
  ```tsx
  {/* Activity Submissions */}
  {practitionerId && (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <FileText className="w-5 h-5" />
        Hoạt động đã ghi nhận
      </h3>

      {/* Summary Card */}
      <SubmissionsSummaryCard practitionerId={practitionerId} />

      {/* Recent Submissions Table */}
      <RecentSubmissionsTable practitionerId={practitionerId} />

      {/* View All Button */}
      <Button
        variant="medical-secondary"
        className="w-full gap-2"
        onClick={() => {
          window.location.href = `/submissions?practitionerId=${practitionerId}`;
        }}
      >
        Xem tất cả hoạt động
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )}
  ```
- [ ] Ensure sheet width is sufficient (already set to max-w-7xl, should be fine)
- [ ] Test loading states for all components
- [ ] Test error states
- [ ] Test empty state (practitioner with 0 submissions)

---

### 4. Submissions Page Enhancement

#### 4.1 Handle Query Parameter in Submissions Page
- [ ] Open file: `src/components/submissions/submissions-list.tsx`
- [ ] Verify existing code handles `practitionerId` from URL params (line 173-181)
- [ ] If not present, add logic to read `practitionerId` from searchParams
- [ ] Pre-apply filter when practitionerId is in URL
- [ ] Show info alert: "Đang hiển thị hoạt động của: {practitioner name}"
- [ ] Add "Clear Filter" button to remove practitionerId filter

#### 4.2 Add Breadcrumb or Back Link (Optional)
- [ ] Add breadcrumb navigation showing: "Người hành nghề > {Name} > Hoạt động"
- [ ] OR: Add back button: "← Quay lại người hành nghề"
- [ ] Navigate back to `/practitioners` with detail sheet still open (if possible)

---

### 5. TypeScript Types & Interfaces

#### 5.1 Define Submission Summary Type
- [ ] Create or update: `src/types/submissions.ts`
- [ ] Add interface:
  ```typescript
  export interface SubmissionsSummary {
    pending: number;
    approved: number;
    rejected: number;
    total: number;
  }
  ```

#### 5.2 Define Recent Submission Type
- [ ] Reuse existing `Submission` interface from submissions-list.tsx
- [ ] Or create simplified version with only needed fields:
  ```typescript
  export interface RecentSubmission {
    MaGhiNhan: string;
    TenHoatDong: string;
    NgayGhiNhan: string;
    TrangThaiDuyet: 'ChoDuyet' | 'DaDuyet' | 'TuChoi';
    SoTinChiQuyDoi: number | null;
    SoGio: number | null;
  }
  ```

---

### 6. Testing

#### 6.1 Manual Testing Checklist
- [ ] Test as DonVi user:
  - [ ] Open practitioner detail sheet
  - [ ] Verify summary card shows correct counts
  - [ ] Verify recent table shows last 5 submissions
  - [ ] Click "View All" button, verify navigation to filtered submissions
  - [ ] Verify can only see practitioners from own unit
- [ ] Test as SoYTe user:
  - [ ] Can view any practitioner's submissions
  - [ ] Summary and table work correctly
- [ ] Test edge cases:
  - [ ] Practitioner with 0 submissions (empty state)
  - [ ] Practitioner with 1-4 submissions (less than 5)
  - [ ] Practitioner with 100+ submissions (verify only 5 shown)
  - [ ] API failure (network error)
  - [ ] Slow API response (loading states)

#### 6.2 Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Test keyboard navigation (tab through elements)
- [ ] Test screen reader accessibility (basic check)

#### 6.3 Performance Testing
- [ ] Measure detail sheet open time (should be <500ms)
- [ ] Verify parallel API calls (not sequential)
- [ ] Check network tab for unnecessary requests
- [ ] Verify TanStack Query caching works (re-opening sheet should use cache)

#### 6.4 Unit Tests (Optional)
- [ ] Write tests for `use-practitioner-submissions-summary` hook
- [ ] Write tests for `use-practitioner-recent-submissions` hook
- [ ] Write tests for `SubmissionsSummaryCard` component
- [ ] Write tests for `RecentSubmissionsTable` component
- [ ] Mock API responses for different scenarios (success, error, empty)

---

### 7. Documentation & Polish

#### 7.1 Code Documentation
- [ ] Add JSDoc comments to new hooks
- [ ] Add JSDoc comments to new components
- [ ] Add inline comments for complex logic

#### 7.2 User Documentation (Optional)
- [ ] Update user guide with new workflow
- [ ] Add screenshots of new UI
- [ ] Document "View Submissions" feature

#### 7.3 Code Cleanup
- [ ] Remove console.log statements
- [ ] Run `npm run typecheck` and fix any TypeScript errors
- [ ] Run `npm run lint:fix` to auto-fix linting issues
- [ ] Ensure consistent code formatting
- [ ] Remove unused imports

---

### 8. Deployment Preparation

#### 8.1 Pre-Commit Checks
- [ ] All tests pass: `npm run test`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`

#### 8.2 Git Workflow
- [ ] Commit changes with descriptive message:
  ```
  feat: add practitioner-submissions integration

  - Add summary card showing pending/approved/rejected counts
  - Add recent submissions preview table (last 5)
  - Add "View All Submissions" button with pre-applied filter
  - Create custom hooks for data fetching with TanStack Query
  - Update practitioner detail sheet with new sections
  - Handle query parameters in submissions list

  Resolves workflow pain point for DonVi admins managing compliance.
  ```
- [ ] Push to branch: `claude/enhance-practitioners-page-ux-01CJzhSb7wCqWWxFdr815QR6`
- [ ] Verify CI/CD pipeline passes (if configured)

#### 8.3 Create Pull Request
- [ ] Open PR with title: "feat: Add Practitioner-Submissions Integration"
- [ ] Link to OpenSpec proposal in PR description
- [ ] Add screenshots/GIF of new UI
- [ ] Request review from maintainer
- [ ] Address review feedback

---

## Post-Implementation Tasks

### 9. Archive OpenSpec Change
- [ ] After PR is merged and deployed to production
- [ ] Run: `openspec archive add-practitioner-submissions-integration --yes`
- [ ] Verify: `openspec validate --strict` passes
- [ ] Commit archived change and updated specs
- [ ] Push to main branch

---

## Rollback Plan

If critical issues discovered in production:

1. **Immediate:** Revert PR and redeploy previous version
2. **Investigation:** Identify root cause of issue
3. **Fix:** Address issue in new branch
4. **Redeploy:** Test thoroughly and redeploy

---

## Success Metrics

After deployment, verify:

- [ ] Unit admins report improved workflow efficiency
- [ ] No performance degradation (page load times)
- [ ] No RBAC vulnerabilities reported
- [ ] No increase in API error rates
- [ ] Positive user feedback

---

## Notes

- **Priority:** Medium-High (workflow improvement for unit admins)
- **Estimated effort:** ~90 minutes total
- **Risk level:** Low (leverages existing APIs, additive change)
- **Breaking changes:** None
