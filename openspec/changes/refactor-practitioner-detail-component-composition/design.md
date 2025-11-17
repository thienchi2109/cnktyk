# Design Document: Practitioner Detail Component Composition

**Change ID:** `refactor-practitioner-detail-component-composition`
**Created:** 2025-11-17
**Status:** Pending Approval

---

## Context

### Current State

The application has two separate implementations for displaying practitioner details:

1. **PractitionerDetailSheet** - Slide-out panel used in practitioners list
2. **PractitionerProfile** - Standalone full-page view accessed from dashboard

Both implementations:
- Fetch the same data from the same API
- Display the same information (name, license, contact, compliance)
- Have similar but not identical layouts
- Contain duplicate rendering logic (~300 lines of overlapping code)

Recent work added submissions integration to the sheet view but not the standalone page, creating feature drift.

### Problem

- **Code Duplication:** ~60% of rendering logic is duplicated
- **Maintenance Burden:** Changes must be made twice
- **Feature Drift:** Sheet has submissions integration, standalone page doesn't
- **Inconsistent UX:** Users see different information depending on entry point
- **Type Safety Risk:** Duplicate code can diverge in type definitions

### Constraints

- **Backward Compatibility:** Must preserve existing URLs and navigation
- **RBAC:** Both views enforce role-based access (DonVi, SoYTe, etc.)
- **Performance:** Cannot degrade page load times (currently <500ms)
- **TypeScript:** Strict mode enabled, no `any` types
- **React 19:** Leverage latest React features (memo, composition)
- **Existing Hooks:** Reuse TanStack Query hooks for submissions data

---

## Goals / Non-Goals

### Goals

✅ **Eliminate code duplication** between detail sheet and standalone page
✅ **Achieve feature parity** - both views show same information
✅ **Improve maintainability** - single source of truth for rendering logic
✅ **Preserve user experience** - no breaking changes to navigation or behavior
✅ **Type safety** - shared TypeScript interfaces prevent drift
✅ **Enable future reuse** - section components can power print/export views

### Non-Goals

❌ **Redesign UI** - Keep existing glassmorphism design
❌ **Change data model** - Use existing practitioner schema
❌ **Refactor API** - Use existing endpoints without changes
❌ **Add new features** - Focus is code quality, not new capabilities
❌ **Migrate to new framework** - Stay with React 19 + Next.js 15

---

## Decisions

### Decision 1: Component Composition Pattern

**Choice:** Extract shared rendering logic into reusable section components.

**Rationale:**
- **React Best Practice:** Composition is the recommended pattern over inheritance or HOCs
- **Type Safe:** TypeScript enforces consistent prop interfaces
- **Testable:** Can unit test sections independently
- **Maintainable:** Changes in one place propagate everywhere
- **Flexible:** Easy to rearrange or add sections

**Alternative Considered:**
- **Higher-Order Component (HOC):** Rejected - More complex, harder to type
- **Render Props:** Rejected - Verbose, creates callback hell
- **Single Component with Flags:** Rejected - Creates "god component"

**Implementation:**
```typescript
// Section component interface
interface SectionProps {
  practitioner: Practitioner;
  variant?: 'compact' | 'full';
}

// Usage in sheet (compact)
<BasicInfoSection practitioner={data} variant="compact" />

// Usage in standalone (full)
<BasicInfoSection practitioner={data} variant="full" />
```

---

### Decision 2: Two-Variant System ("compact" vs "full")

**Choice:** Section components accept `variant` prop to control layout density.

**Rationale:**
- **Simplicity:** Only two variants needed (sheet vs page)
- **Predictable:** Variant controls spacing, text size, padding
- **Maintainable:** Single component handles both cases
- **Extensible:** Easy to add third variant (e.g., "print") later

**Alternative Considered:**
- **Three Variants (compact/medium/full):** Rejected - YAGNI (You Aren't Gonna Need It)
- **CSS-only Variants:** Rejected - Need to control React elements too
- **Separate Components:** Rejected - Defeats purpose of deduplication

**Variant Differences:**
| Aspect | Compact | Full |
|--------|---------|------|
| Spacing | `space-y-2` | `space-y-4` |
| Text Size | `text-sm` | `text-base` |
| Padding | `p-3` | `p-4` |
| Icons | 16px | 20px |
| Edit Button | Small | Default |

---

### Decision 3: Section Granularity (5 Main Sections)

**Choice:** Create 5 focused section components, not 10+ micro-components.

**Sections:**
1. **BasicInfoSection** - Name, title, status
2. **LicenseInfoSection** - CCHN, issue date
3. **ContactInfoSection** - Email, phone
4. **ComplianceStatusSection** - Credits, progress, alerts
5. **SubmissionsSection** - Summary, table, navigation

**Rationale:**
- **Right-Sized:** Each section has clear purpose
- **Not Too Granular:** Avoid 20+ tiny components (overhead)
- **Not Too Coarse:** Each section can be tested independently
- **Domain-Aligned:** Matches user mental model

**Alternative Considered:**
- **Micro-Components (10+ sections):** Rejected - Excessive complexity
- **Monolithic Section:** Rejected - Defeats composition pattern
- **Two Sections (Info + Compliance):** Rejected - Too coarse

---

### Decision 4: Submissions Section as Wrapper

**Choice:** Create SubmissionsSection that composes existing SubmissionsSummaryCard and RecentSubmissionsTable.

**Rationale:**
- **Reuse Existing Code:** Don't rebuild what works
- **Consistent API:** Section components have same interface
- **Data Fetching Isolation:** SubmissionsSection handles its own hooks
- **Error Boundaries:** Can wrap submissions in error boundary

**Implementation:**
```typescript
export function SubmissionsSection({ practitionerId, variant }: SubmissionsSectionProps) {
  return (
    <div className="space-y-4">
      <h3>Hoạt động đã ghi nhận</h3>
      <SubmissionsSummaryCard practitionerId={practitionerId} />
      <RecentSubmissionsTable practitionerId={practitionerId} limit={variant === 'compact' ? 5 : 10} />
      <Button onClick={() => navigate(`/submissions?practitionerId=${practitionerId}`)}>
        Xem tất cả hoạt động
      </Button>
    </div>
  );
}
```

---

### Decision 5: Parent Owns Data Fetching

**Choice:** Parent components (Sheet, Profile) fetch practitioner data. Sections are pure presentational.

**Rationale:**
- **Separation of Concerns:** Data vs presentation
- **Performance:** Single data fetch, not per-section
- **Error Handling:** Centralized at parent level
- **Loading States:** Parent controls loading UI
- **Testing:** Sections can be tested with mock data

**Exception:** SubmissionsSection fetches its own data (submissions are separate API).

**Data Flow:**
```
Parent Component
  ↓ (fetch practitioner data)
API Response
  ↓ (pass to sections)
Section Components (pure presentation)
```

**Alternative Considered:**
- **Sections Fetch Own Data:** Rejected - Multiple API calls, loading states complex

---

### Decision 6: Progressive Disclosure ("View Full Details" Button)

**Choice:** Add prominent button in sheet that navigates to standalone page.

**Rationale:**
- **Clear Path:** Users understand how to see more
- **Preserves Both UX:** Sheet for quick view, page for deep analysis
- **Industry Standard:** Common pattern (e.g., email preview → full email)
- **No Modal Stacking:** Avoids sheet + modal complexity

**Placement:** Top of sheet content, before sections.

**Styling:**
- **Variant:** `medical` (blue gradient)
- **Size:** `lg` for prominence
- **Icon:** `Maximize` or `ExternalLink`
- **Label:** "Xem Hồ Sơ Đầy Đủ"
- **Full-Width:** On mobile devices

**Alternative Considered:**
- **Auto-Redirect:** Rejected - Removes choice from user
- **Modal Overlay:** Rejected - Poor UX (modal over modal)
- **Tabs in Sheet:** Rejected - Doesn't leverage standalone page

---

### Decision 7: Edit via Sheet Overlay (Standalone Page)

**Choice:** Standalone page opens edit form in sheet overlay, not inline editing.

**Rationale:**
- **Reuse Form:** PractitionerForm component already exists
- **Consistent Pattern:** Same as list view edit
- **Preserve Layout:** Don't destroy 3-column grid for editing
- **Modal Pattern:** Users understand sheet = temporary task

**Implementation:**
```typescript
const [showEditSheet, setShowEditSheet] = useState(false);

<BasicInfoSection
  practitioner={data}
  variant="full"
  showEdit={canEdit}
  onEdit={() => setShowEditSheet(true)}
/>

<Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
  <SheetContent>
    <PractitionerForm ... />
  </SheetContent>
</Sheet>
```

**Alternative Considered:**
- **Inline Editing:** Rejected - Breaks layout, complex state management
- **Separate Edit Page:** Rejected - Adds navigation complexity

---

### Decision 8: TypeScript Interfaces in Shared Types File

**Choice:** Create `practitioner-detail-sections/types.ts` with shared interfaces.

**Rationale:**
- **Single Source of Truth:** Prevents type drift
- **Compile-Time Safety:** TypeScript catches mismatches
- **IDE Support:** Autocomplete, type hints
- **Documentation:** Types serve as contract

**Shared Types:**
```typescript
// types.ts
export type SectionVariant = 'compact' | 'full';

export interface PractitionerDetailData {
  MaNhanVien: string;
  HoVaTen: string;
  ChucDanh?: string;
  KhoaPhong?: string;
  TrangThaiLamViec: 'DangLamViec' | 'TamHoan' | 'DaNghi';
  SoCCHN?: string;
  NgayCapCCHN?: Date;
  Email?: string;
  DienThoai?: string;
  // ... other fields
}

export interface ComplianceStatusData {
  totalCredits: number;
  requiredCredits: number;
  compliancePercentage: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

export interface BaseSectionProps {
  variant?: SectionVariant;
}
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    User Interface Layer                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────────┐   │
│  │ PractitionerList    │      │ DonVi Dashboard         │   │
│  │ (Data Grid)         │      │                         │   │
│  └──────────┬──────────┘      └──────────┬──────────────┘   │
│             │                             │                  │
│             │ Row Click                   │ "Chi tiết"       │
│             ↓                             ↓                  │
│  ┌──────────────────────┐      ┌─────────────────────────┐  │
│  │ Detail Sheet (Quick) │      │ Standalone Page (Full)  │  │
│  │ - Compact variant    │──┐   │ - Full variant          │  │
│  │ - "View Full" button │  │   │ - Edit via sheet        │  │
│  └──────────────────────┘  │   │ - Submissions section   │  │
│             ↓               │   └─────────────────────────┘  │
│             └───────────────┘               ↑                │
│                 Navigates to ───────────────┘                │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                  Section Components Layer                    │
│  (Shared between Sheet and Standalone Page)                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ BasicInfoSection│  │ LicenseInfoSection│                 │
│  │ - Name, title   │  │ - CCHN, date     │                  │
│  │ - Variants      │  │ - Variants       │                  │
│  └─────────────────┘  └──────────────────┘                  │
│                                                               │
│  ┌─────────────────┐  ┌──────────────────┐                  │
│  │ ContactInfo     │  │ ComplianceStatus │                  │
│  │ Section         │  │ Section          │                  │
│  └─────────────────┘  └──────────────────┘                  │
│                                                               │
│  ┌──────────────────────────────────────┐                   │
│  │ SubmissionsSection                   │                   │
│  │ - Summary Card                       │                   │
│  │ - Recent Table                       │                   │
│  │ - "View All" Button                  │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                             │
                             ↓
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────────────────────────┐                   │
│  │ TanStack Query Hooks                 │                   │
│  │ - usePractitionerData                │                   │
│  │ - usePractitionerSubmissionsSummary  │                   │
│  │ - usePractitionerRecentSubmissions   │                   │
│  └──────────────────────────────────────┘                   │
│                    │                                          │
│                    ↓                                          │
│  ┌──────────────────────────────────────┐                   │
│  │ API Endpoints                        │                   │
│  │ - GET /api/practitioners/:id         │                   │
│  │ - GET /api/submissions/summary       │                   │
│  │ - GET /api/submissions (filtered)    │                   │
│  └──────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

---

## Risks / Trade-offs

### Risk 1: Performance Overhead from Component Composition

**Risk:** Additional component layers could slow rendering.

**Likelihood:** Very Low
**Impact:** Low
**Mitigation:**
- Use React.memo for section components
- Shallow prop passing (avoid deep nesting)
- Measure with React DevTools Profiler
- Benchmark: <500ms page load (same as current)

**Trade-off Accepted:** Minimal overhead for major maintainability gain.

---

### Risk 2: Breaking Changes During Refactor

**Risk:** Accidentally break existing functionality while refactoring.

**Likelihood:** Low
**Impact:** High

**Mitigation:**
- **Incremental Migration:** Refactor one view at a time
- **Thorough Testing:** Manual + automated tests
- **Rollback Plan:** Each phase can be independently reverted
- **Code Review:** Peer review before merge
- **Feature Flags:** Not needed (safe refactor)

**Trade-off Accepted:** Small risk for long-term code quality.

---

### Risk 3: TypeScript Type Complexity

**Risk:** Shared types become overly complex or hard to maintain.

**Likelihood:** Low
**Impact:** Low

**Mitigation:**
- Keep interfaces simple and focused
- Use TypeScript utility types (Pick, Omit) for variants
- Document type usage in JSDoc
- Strict TypeScript mode catches errors early

**Trade-off Accepted:** Initial type setup cost for ongoing safety.

---

### Risk 4: User Confusion from Navigation Changes

**Risk:** Users don't understand new "View Full Details" workflow.

**Likelihood:** Very Low
**Impact:** Low

**Mitigation:**
- **Clear Button Label:** "Xem Hồ Sơ Đầy Đủ" (unambiguous)
- **Prominent Placement:** Top of sheet, hard to miss
- **Industry Pattern:** Users understand preview → full detail
- **Preserve Existing Paths:** DonVi dashboard link unchanged

**Trade-off Accepted:** Progressive disclosure improves UX for most users.

---

## Migration Plan

### Phase 1: Extract Sections (Safe, Additive)

**Actions:**
1. Create `practitioner-detail-sections/` directory
2. Implement section components with tests
3. Deploy without using them yet

**Risk:** None (additive change)
**Rollback:** Not needed (no-op)
**Validation:** Components exist, tests pass

---

### Phase 2: Update Sheet View (Low Risk)

**Actions:**
1. Refactor `PractitionerDetailSheet` to use sections
2. Add "View Full Details" button
3. Test thoroughly

**Risk:** Low (sheet behavior changes)
**Rollback:** Revert sheet component only
**Validation:** Sheet displays correctly, navigation works

---

### Phase 3: Update Standalone Page (Medium Risk)

**Actions:**
1. Refactor `PractitionerProfile` to use sections
2. Add submissions integration
3. Add edit sheet overlay
4. Test all entry points

**Risk:** Medium (page behavior changes, submissions added)
**Rollback:** Revert profile component only
**Validation:** Standalone page matches requirements, submissions work

---

### Phase 4: Cleanup (Safe)

**Actions:**
1. Remove old duplicate code
2. Update documentation
3. Monitor production

**Risk:** None (cleanup only)
**Rollback:** Not needed
**Validation:** No unused code remains

---

## Open Questions

### Q1: Should sections handle their own error boundaries?

**Recommendation:** Yes, wrap each section in React ErrorBoundary.

**Rationale:** Prevents cascade failure. If submissions section fails, other sections still work.

**Implementation:**
```typescript
<ErrorBoundary fallback={<ErrorAlert />}>
  <SubmissionsSection ... />
</ErrorBoundary>
```

---

### Q2: Should we add React.memo to all section components?

**Recommendation:** Start without memo, add if profiler shows re-render issues.

**Rationale:** Premature optimization. Data changes infrequently (practitioner info is mostly static).

**Benchmark:** If re-renders exceed 100ms, memoize.

---

### Q3: Should compact variant show fewer submission rows (3 vs 5)?

**Recommendation:** Keep 5 rows in both variants. Adjust spacing/font only.

**Rationale:** Consistency. 5 rows is manageable in sheet view.

**Alternative:** Make row count configurable via prop if needed later.

---

### Q4: Should we extract status badge logic into utility?

**Recommendation:** Yes, create `getStatusBadge()` utility.

**Rationale:** Used in multiple places (status, compliance). DRY principle.

**Implementation:**
```typescript
// utils/badge-helpers.ts
export function getWorkStatusBadge(status: WorkStatus): ReactNode {
  // Badge rendering logic
}

export function getComplianceBadge(complianceStatus: ComplianceStatus): ReactNode {
  // Badge rendering logic
}
```

---

## Success Metrics

### Code Quality Metrics

- [ ] **Code Duplication:** Reduce from ~60% to <5%
- [ ] **Lines of Code:** Reduce total LOC in detail views by ~40%
- [ ] **TypeScript Errors:** Zero new errors
- [ ] **Test Coverage:** Maintain or improve coverage (>80%)

### Performance Metrics

- [ ] **Page Load Time:** <500ms (no regression)
- [ ] **Re-render Count:** <10 renders on initial load
- [ ] **Bundle Size:** Neutral or reduced (code reuse)

### User Experience Metrics

- [ ] **Feature Parity:** Both views show identical information
- [ ] **Navigation Flow:** Sheet → Standalone → Submissions works smoothly
- [ ] **Error Rate:** No increase in client errors
- [ ] **User Feedback:** Positive (if collected)

---

## Implementation Checklist

See `tasks.md` for detailed implementation steps.

---

## References

- **React Composition Docs:** https://react.dev/learn/passing-props-to-a-component
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/handbook/2/objects.html
- **TanStack Query:** https://tanstack.com/query/latest
- **Component Composition Pattern:** https://kentcdodds.com/blog/compound-components-with-react-hooks
- **Related Commits:**
  - 38aa878 - feat: integrate submissions preview in practitioner detail sheet
  - d171b29 - Enhance practitioner submissions drilldown and archive spec
