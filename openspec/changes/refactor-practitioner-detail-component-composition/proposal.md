# Proposal: Refactor Practitioner Detail Views with Component Composition

**Change ID:** `refactor-practitioner-detail-component-composition`
**Status:** Pending Approval
**Created:** 2025-11-17
**Author:** Claude AI Assistant

---

## Why

### Problem Statement

The practitioner detail functionality currently has **two separate implementations** that duplicate significant code and create maintenance burden:

1. **PractitionerDetailSheet** (`src/components/practitioners/practitioner-detail-sheet.tsx`)
   - Used in the `/practitioners` page as a slide-out panel
   - Recently enhanced with submissions integration (commit 38aa878)
   - Modern, responsive design
   - Includes: basic info, license info, contact info, compliance status, **submissions preview**

2. **PractitionerProfile** (`src/app/(authenticated)/practitioners/[id]/page.tsx`)
   - Standalone full-page view accessed from DonVi dashboard's "Chi tiết" button
   - Different layout (3-column grid with sidebar)
   - **Missing** the new submissions integration features
   - More spacious, better for detailed analysis and printing

**Current Pain Points:**

1. **Code Duplication:** Both components render the same data (practitioner info, compliance status) with different layouts
2. **Feature Drift:** Recent submissions integration was added to the sheet but not the standalone page
3. **Inconsistent UX:** Users see different information depending on which entry point they use
4. **Maintenance Burden:** Updates must be made in two places, increasing risk of bugs and inconsistency
5. **User Confusion:** DonVi dashboard links to standalone page which lacks the enhanced features

### Business Impact

- **Developer Efficiency:** Changes to practitioner detail logic must be duplicated across two components
- **Feature Inconsistency:** Recent work (submissions integration) is not available on standalone page
- **User Experience:** Users accessing via dashboard get inferior experience compared to sheet view
- **Technical Debt:** Duplicate code increases long-term maintenance costs

---

## What Changes

### High-Level Overview

**Refactor practitioner detail views using Component Composition pattern** to eliminate code duplication while maintaining both UX patterns (sheet preview and full-page detail).

### Specific Changes

#### 1. Extract Shared Section Components (New)

Create reusable section components in `src/components/practitioners/practitioner-detail-sections/`:

- **BasicInfoSection** - Practitioner name, title, work status
- **LicenseInfoSection** - CCHN number and issue date
- **ContactInfoSection** - Email and phone
- **ComplianceStatusSection** - Credits progress, compliance percentage, status badges
- **SubmissionsSection** - Summary card, recent table, "View All" button (already exists as separate components)

Each section accepts:
- `practitioner` data object
- `variant?: 'compact' | 'full'` for layout density control

#### 2. Update PractitionerDetailSheet (Refactor)

Convert to use shared section components:
- Replace inline info rendering with section components
- Use `variant="compact"` for space-efficient layout
- Add prominent **"View Full Details →"** button at top
- Simplify to focus on quick preview use case
- Keep existing edit functionality

#### 3. Update PractitionerProfile (Major Enhancement)

Convert to use shared section components:
- Replace inline info rendering with section components
- Use `variant="full"` for spacious layout
- **Add missing submissions integration** (SubmissionsSection)
- Maintain 3-column grid layout for better information hierarchy
- Add edit functionality via sheet overlay (reuse existing form)

#### 4. Update Navigation Flow

- DonVi dashboard "Chi tiết" → `/practitioners/[id]` (standalone page)
- Practitioners list row click → Sheet view opens
- Sheet "View Full Details" button → `/practitioners/[id]` (standalone page)
- Standalone page back button → Returns to originating page

#### 5. Cleanup

- Remove duplicate code from both original components
- Consolidate data fetching logic
- Ensure consistent TypeScript interfaces

---

## Impact

### Affected Specifications

- **Modified:** `practitioner-management` - Adding component composition requirements and standalone page enhancements

### Affected Code

**New Components:**
- `src/components/practitioners/practitioner-detail-sections/basic-info-section.tsx`
- `src/components/practitioners/practitioner-detail-sections/license-info-section.tsx`
- `src/components/practitioners/practitioner-detail-sections/contact-info-section.tsx`
- `src/components/practitioners/practitioner-detail-sections/compliance-status-section.tsx`
- `src/components/practitioners/practitioner-detail-sections/submissions-section.tsx`

**Refactored Components:**
- `src/components/practitioners/practitioner-detail-sheet.tsx` - Use section components, add "View Full" button
- `src/components/practitioners/practitioner-profile.tsx` - Use section components, add submissions

**Updated Pages:**
- `src/app/(authenticated)/practitioners/[id]/page.tsx` - Ensure uses refactored PractitionerProfile
- `src/components/dashboard/unit-admin-dashboard.tsx` - Verify "Chi tiết" button navigation

**Potentially Affected:**
- `src/hooks/use-practitioner-recent-submissions.ts` - May need to be used by standalone page
- `src/hooks/use-practitioner-submissions-summary.ts` - May need to be used by standalone page

### RBAC Considerations

- No changes to RBAC enforcement
- Both views already enforce role-based access control
- Shared components will receive RBAC-filtered data from parent

### Data Flow

```
User opens detail view (sheet or page)
    ↓
Parent component fetches practitioner data
    ↓
Passes data to shared section components
    ↓
Section components render with appropriate variant
    ↓
SubmissionsSection independently fetches submissions data
    ↓
Display complete practitioner profile
```

**Progressive Disclosure Flow:**
```
Practitioners List
    ↓ (click row)
PractitionerDetailSheet (compact preview)
    ↓ (click "View Full Details")
PractitionerProfile (full-page standalone)
```

---

## Benefits

### For Developers
- ✅ **Single Source of Truth:** Changes made once in section components
- ✅ **Reduced Code:** Eliminate ~60% of duplicate rendering logic
- ✅ **Type Safety:** Shared interfaces prevent inconsistencies
- ✅ **Easier Testing:** Test sections independently
- ✅ **Clear Separation:** Layout vs content concerns separated

### For Users
- ✅ **Consistent Experience:** Same information in both views
- ✅ **Enhanced Standalone Page:** Gets submissions integration previously missing
- ✅ **Progressive Disclosure:** Sheet → Full page is natural workflow
- ✅ **Better Performance:** Standalone page benefits from optimized sections

### For Product
- ✅ **Feature Parity:** Both entry points get same capabilities
- ✅ **Maintainability:** Easier to add new sections in future
- ✅ **Flexibility:** Can create new views (e.g., print layout) easily

---

## Technical Approach

### Implementation Strategy: Component Composition Pattern

**Pattern:** Extract shared presentation logic into focused, reusable components that accept data and variant prop.

**Example Section Component:**

```typescript
// basic-info-section.tsx
interface BasicInfoSectionProps {
  practitioner: {
    HoVaTen: string;
    ChucDanh?: string;
    KhoaPhong?: string;
    TrangThaiLamViec: 'DangLamViec' | 'TamHoan' | 'DaNghi';
  };
  variant?: 'compact' | 'full';
  showEdit?: boolean;
  onEdit?: () => void;
}

export function BasicInfoSection({
  practitioner,
  variant = 'full',
  showEdit = false,
  onEdit
}: BasicInfoSectionProps) {
  const spacing = variant === 'compact' ? 'space-y-2' : 'space-y-4';
  const textSize = variant === 'compact' ? 'text-sm' : 'text-base';

  return (
    <div className={`space-y-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="w-5 h-5" />
          Thông tin cơ bản
        </h3>
        {showEdit && onEdit && (
          <Button onClick={onEdit} size={variant === 'compact' ? 'sm' : 'default'}>
            <Edit className="w-4 h-4" />
            Chỉnh sửa
          </Button>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 p-4 bg-gray-50 rounded-lg ${spacing}`}>
        {/* Render practitioner info */}
      </div>
    </div>
  );
}
```

**Usage in Sheet:**
```typescript
<BasicInfoSection practitioner={practitioner} variant="compact" />
```

**Usage in Standalone Page:**
```typescript
<BasicInfoSection
  practitioner={practitioner}
  variant="full"
  showEdit={canEdit}
  onEdit={() => setShowEditSheet(true)}
/>
```

### Why Component Composition?

- **DRY Principle:** Don't Repeat Yourself - one implementation, multiple uses
- **React Best Practice:** Composition over inheritance
- **Maintainable:** Changes propagate automatically to all consumers
- **Testable:** Section components can be unit tested independently
- **Flexible:** Easy to add variants, new sections, or rearrange layouts

### Alternatives Considered

#### Alternative 1: Keep Duplication, Manually Sync
**Rejected:** Increases maintenance burden, prone to drift

#### Alternative 2: Single Component with Complex Props
**Rejected:** Creates "god component" with too many responsibilities

#### Alternative 3: Higher-Order Component (HOC)
**Rejected:** Less intuitive than composition, harder to type in TypeScript

#### Alternative 4: Render Props Pattern
**Rejected:** More complex than needed for this use case

---

## Dependencies

### Required
- Existing practitioner data fetching hooks ✅ Already exists
- Existing submissions integration hooks ✅ Already exists
- React 19 composition features ✅ Already in use
- TypeScript strict mode ✅ Already enabled

### No New Dependencies Required
- All existing libraries support this pattern
- No performance implications
- No breaking changes to APIs

---

## Migration Plan

### Phase 1: Extract Sections (Safe, Additive)
1. Create section components directory
2. Implement section components with tests
3. No changes to existing views yet

### Phase 2: Update Sheet View (Low Risk)
1. Refactor PractitionerDetailSheet to use sections
2. Add "View Full Details" button
3. Test thoroughly before merging

### Phase 3: Update Standalone Page (Medium Risk)
1. Refactor PractitionerProfile to use sections
2. Add submissions integration
3. Update navigation flows
4. Test all entry points

### Phase 4: Cleanup (Safe)
1. Remove old duplicate code
2. Update documentation
3. Monitor for issues

### Rollback Strategy
- Each phase can be rolled back independently
- Section components are additive (don't break existing code)
- Feature flags not needed (safe refactor)

---

## Open Questions

1. **Section granularity:** Should we create more fine-grained sections (e.g., separate compliance chart from compliance summary)?
   - **Recommendation:** Start with 5 main sections, split later if needed

2. **Edit functionality:** Should standalone page use inline editing or sheet overlay?
   - **Recommendation:** Sheet overlay to reuse existing form component

3. **Loading states:** Should sections handle their own loading or parent component?
   - **Recommendation:** Parent handles data fetching, sections receive ready data

4. **Error boundaries:** Should each section have error boundary?
   - **Recommendation:** Yes, prevents cascade failure

---

## Success Criteria

- [ ] Zero code duplication between sheet and standalone views
- [ ] Both views display identical information (with different layouts)
- [ ] Standalone page has submissions integration matching sheet
- [ ] "View Full Details" button navigates from sheet to standalone page
- [ ] DonVi dashboard "Chi tiết" button links to enhanced standalone page
- [ ] All existing functionality preserved (edit, delete, navigation)
- [ ] TypeScript compilation succeeds with no new errors
- [ ] No performance regression (page load <500ms)
- [ ] All tests pass (existing + new section tests)

---

## Timeline Estimate

- **Phase 1 - Extract Sections:** 90 minutes
  - BasicInfoSection: 15 min
  - LicenseInfoSection: 10 min
  - ContactInfoSection: 10 min
  - ComplianceStatusSection: 20 min
  - SubmissionsSection wrapper: 15 min
  - Tests: 20 min

- **Phase 2 - Refactor Sheet:** 30 minutes
  - Update to use sections: 15 min
  - Add "View Full" button: 5 min
  - Testing: 10 min

- **Phase 3 - Enhance Standalone:** 45 minutes
  - Update to use sections: 20 min
  - Add submissions integration: 15 min
  - Testing: 10 min

- **Phase 4 - Cleanup:** 15 minutes
  - Remove old code: 5 min
  - Documentation: 5 min
  - Final testing: 5 min

- **Total:** ~3 hours

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Breaking existing views during refactor | High | Low | Incremental migration, thorough testing each phase |
| Performance degradation from component overhead | Medium | Very Low | React memoization, shallow prop passing |
| TypeScript type mismatches | Low | Low | Strict interfaces, compile-time checks |
| User confusion from changed navigation | Medium | Low | Maintain existing entry points, add progressive disclosure |
| Incomplete feature migration | Medium | Low | Checklist validation, side-by-side comparison |

---

## Follow-Up Work (Future)

- **Print-optimized view:** Create third variant using same sections
- **PDF export:** Generate practitioner report from section data
- **Mobile-optimized layout:** Add responsive variants
- **Accessibility audit:** Ensure all sections meet WCAG 2.1 AA
- **Animation polish:** Add smooth transitions between views
- **Breadcrumb navigation:** Show user path (list → sheet → page)

---

## References

- **Related Commit:** 38aa878 - feat: integrate submissions preview in practitioner detail sheet
- **Related Commit:** d171b29 - Enhance practitioner submissions drilldown and archive spec
- **Existing Spec:** openspec/specs/practitioner-management/spec.md
- **React Composition Docs:** https://react.dev/learn/passing-props-to-a-component
- **Similar Pattern Used In:** Dashboard unit detail views (src/components/dashboard/)
