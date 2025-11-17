# Implementation Tasks

**Change ID:** `refactor-practitioner-detail-component-composition`
**Status:** Pending Approval

---

## Pre-Implementation Checklist

- [ ] Proposal approved by project maintainer
- [ ] OpenSpec validation passes
- [ ] No conflicting changes in `openspec/changes/`
- [ ] Current code reviewed to understand both implementations

---

## Phase 1: Extract Shared Section Components

### 1.1 Create Section Components Directory
- [ ] Create directory: `src/components/practitioners/practitioner-detail-sections/`
- [ ] Create barrel export: `index.ts` for clean imports

### 1.2 Create BasicInfoSection Component
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/basic-info-section.tsx`
- [ ] Define TypeScript interface `BasicInfoSectionProps`
- [ ] Accept props: `practitioner`, `variant`, `showEdit`, `onEdit`
- [ ] Render: Name, title (ChucDanh), department (KhoaPhong), work status badge
- [ ] Support `compact` variant (smaller spacing, text sizes)
- [ ] Support `full` variant (spacious layout)
- [ ] Add conditional edit button
- [ ] Use icons: `User`, `Edit`
- [ ] Apply glassmorphic card styling
- [ ] Write JSDoc documentation

### 1.3 Create LicenseInfoSection Component
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/license-info-section.tsx`
- [ ] Define TypeScript interface `LicenseInfoSectionProps`
- [ ] Accept props: `practitioner`, `variant`
- [ ] Render: CCHN number, issue date (formatted)
- [ ] Handle null/undefined values gracefully
- [ ] Support both variants
- [ ] Use icons: `Award`, `Calendar`
- [ ] Apply consistent styling
- [ ] Write JSDoc documentation

### 1.4 Create ContactInfoSection Component
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/contact-info-section.tsx`
- [ ] Define TypeScript interface `ContactInfoSectionProps`
- [ ] Accept props: `practitioner`, `variant`
- [ ] Render: Email, phone number
- [ ] Handle missing contact info (show "Chưa cung cấp")
- [ ] Support both variants
- [ ] Use icons: `Building`, `Mail`, `Phone`
- [ ] Apply consistent styling
- [ ] Make email/phone clickable (mailto:/tel: links)
- [ ] Write JSDoc documentation

### 1.5 Create ComplianceStatusSection Component
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/compliance-status-section.tsx`
- [ ] Define TypeScript interface `ComplianceStatusSectionProps`
- [ ] Accept props: `complianceStatus`, `variant`
- [ ] Render: Compliance percentage, progress bar, credits (current/required)
- [ ] Show compliance icon (CheckCircle/Clock/AlertTriangle)
- [ ] Color-code based on status (green/yellow/red)
- [ ] Display "Còn thiếu" credits calculation
- [ ] Show contextual alerts for at_risk and non_compliant
- [ ] Support both variants (compact has smaller progress bar)
- [ ] Use icons: `Award`, `TrendingUp`, status icons
- [ ] Apply consistent styling
- [ ] Write JSDoc documentation

### 1.6 Create SubmissionsSection Component
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/submissions-section.tsx`
- [ ] Define TypeScript interface `SubmissionsSectionProps`
- [ ] Accept props: `practitionerId`, `variant`, `userRole`
- [ ] Render: SubmissionsSummaryCard + RecentSubmissionsTable + "View All" button
- [ ] Import existing components:
  - `SubmissionsSummaryCard`
  - `RecentSubmissionsTable`
- [ ] Support both variants (compact shows fewer rows, full shows more)
- [ ] Add "Xem tất cả hoạt động" button with navigation
- [ ] Use icons: `FileText`, `ArrowRight`
- [ ] Handle loading/error states
- [ ] Write JSDoc documentation

### 1.7 Create Barrel Export
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/index.ts`
- [ ] Export all section components:
  ```typescript
  export { BasicInfoSection } from './basic-info-section';
  export { LicenseInfoSection } from './license-info-section';
  export { ContactInfoSection } from './contact-info-section';
  export { ComplianceStatusSection } from './compliance-status-section';
  export { SubmissionsSection } from './submissions-section';
  ```

### 1.8 Create Shared Type Definitions
- [ ] Create file: `src/components/practitioners/practitioner-detail-sections/types.ts`
- [ ] Define shared interfaces:
  - `PractitionerDetailData` (full practitioner object)
  - `SectionVariant` type: `'compact' | 'full'`
  - `ComplianceStatusData` interface
- [ ] Export for use across sections

### 1.9 Unit Tests for Section Components
- [ ] Create test file: `tests/components/practitioner-detail-sections/basic-info-section.test.tsx`
- [ ] Test compact vs full variant rendering
- [ ] Test edit button visibility
- [ ] Test with missing optional fields
- [ ] Create test file: `tests/components/practitioner-detail-sections/compliance-status-section.test.tsx`
- [ ] Test all compliance statuses (compliant/at_risk/non_compliant)
- [ ] Test progress bar calculation
- [ ] Verify all tests pass: `npm run test`

---

## Phase 2: Refactor PractitionerDetailSheet

### 2.1 Update Imports
- [ ] Open file: `src/components/practitioners/practitioner-detail-sheet.tsx`
- [ ] Import section components from barrel export
- [ ] Import `useRouter` from next/navigation for "View Full Details" button
- [ ] Add icons: `ExternalLink`, `Maximize`

### 2.2 Replace Inline Rendering with Sections
- [ ] Replace "Thông tin cơ bản" section → `<BasicInfoSection variant="compact" />`
- [ ] Replace "Thông tin chứng chỉ" section → `<LicenseInfoSection variant="compact" />`
- [ ] Replace "Thông tin liên hệ" section → `<ContactInfoSection variant="compact" />`
- [ ] Replace "Trạng thái tuân thủ" section → `<ComplianceStatusSection variant="compact" />`
- [ ] Keep existing SubmissionsSection (already componentized)

### 2.3 Add "View Full Details" Button
- [ ] Add button at top of sheet content (before edit button area)
- [ ] Style as prominent CTA: `variant="medical"`, `size="lg"`
- [ ] Icon: `Maximize` or `ExternalLink`
- [ ] Label: "Xem Hồ Sơ Đầy Đủ" or "View Full Details"
- [ ] On click: `router.push(`/practitioners/${practitionerId}`)`
- [ ] Hide button when in edit mode
- [ ] Make button full-width on mobile

### 2.4 Simplify Component Logic
- [ ] Remove duplicate rendering code (now in sections)
- [ ] Keep data fetching logic
- [ ] Keep edit mode toggle
- [ ] Keep form integration for editing
- [ ] Verify loading states still work
- [ ] Verify error states still work

### 2.5 Update Props Interface
- [ ] Ensure all required data passed to section components
- [ ] Pass `variant="compact"` consistently
- [ ] Pass `showEdit` based on user role and edit mode
- [ ] Pass `onEdit` callback to trigger edit sheet

### 2.6 Test Refactored Sheet
- [ ] Test opening sheet from practitioners list
- [ ] Test all sections render correctly
- [ ] Test edit functionality still works
- [ ] Test "View Full Details" button navigation
- [ ] Test loading states
- [ ] Test error states
- [ ] Test empty state (practitioner with no data)
- [ ] Verify no visual regressions

---

## Phase 3: Enhance PractitionerProfile (Standalone Page)

### 3.1 Update Imports
- [ ] Open file: `src/components/practitioners/practitioner-profile.tsx`
- [ ] Import section components from barrel export
- [ ] Import `SubmissionsSection` (previously missing)
- [ ] Ensure all icons imported

### 3.2 Replace Inline Rendering with Sections
- [ ] Replace "Thông tin cơ bản" card → `<BasicInfoSection variant="full" />`
- [ ] Replace "Thông tin liên hệ" card → `<ContactInfoSection variant="full" />`
- [ ] Replace license info rendering → `<LicenseInfoSection variant="full" />`
- [ ] Replace compliance status → `<ComplianceStatusSection variant="full" />`
- [ ] **ADD NEW:** Insert `<SubmissionsSection variant="full" />` after compliance

### 3.3 Add Submissions Integration (Previously Missing)
- [ ] Add SubmissionsSection in main content area (lg:col-span-2)
- [ ] Position after existing sections (before "Recent Activities" if present)
- [ ] Pass `practitionerId={params.id}`
- [ ] Pass `variant="full"`
- [ ] Pass `userRole={session.user.role}`
- [ ] Remove old "Recent Activities" section (replaced by SubmissionsSection)

### 3.4 Add Edit Functionality via Sheet
- [ ] Import `Sheet`, `SheetContent`, `SheetHeader` from UI components
- [ ] Import `PractitionerForm` component
- [ ] Add state: `const [showEditSheet, setShowEditSheet] = useState(false)`
- [ ] Pass `showEdit={canEdit}` to BasicInfoSection
- [ ] Pass `onEdit={() => setShowEditSheet(true)}` to BasicInfoSection
- [ ] Render Sheet component at bottom:
  ```tsx
  <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
    <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Chỉnh sửa người hành nghề</SheetTitle>
      </SheetHeader>
      <PractitionerForm
        initialData={practitioner}
        units={units}
        mode="edit"
        variant="sheet"
        userRole={userRole}
        onSuccess={() => {
          setShowEditSheet(false);
          fetchPractitioner();
        }}
        onCancel={() => setShowEditSheet(false)}
      />
    </SheetContent>
  </Sheet>
  ```

### 3.5 Update Layout Grid
- [ ] Verify 3-column layout still works: `grid-cols-1 lg:grid-cols-3`
- [ ] Main content: `lg:col-span-2` contains BasicInfo, License, Contact, Submissions
- [ ] Sidebar: `lg:col-span-1` contains Compliance, Quick Stats
- [ ] Ensure responsive behavior (stacks on mobile)

### 3.6 Update Page Header
- [ ] Keep existing back button
- [ ] Keep practitioner name as h1
- [ ] Update edit button to trigger sheet (not inline form)
- [ ] Ensure header matches modern design

### 3.7 Remove Duplicate Code
- [ ] Delete inline rendering for basic info
- [ ] Delete inline rendering for contact info
- [ ] Delete inline rendering for license info
- [ ] Delete inline rendering for compliance
- [ ] Delete old "Recent Activities" table (replaced by SubmissionsSection)
- [ ] Keep only data fetching and section composition

### 3.8 Test Enhanced Standalone Page
- [ ] Test navigation from DonVi dashboard "Chi tiết" button
- [ ] Test all sections render correctly with `variant="full"`
- [ ] Test submissions integration displays (summary + table)
- [ ] Test edit button opens sheet overlay
- [ ] Test edit form submission and data refresh
- [ ] Test "View All Submissions" button navigation
- [ ] Test back button returns to dashboard
- [ ] Test loading states
- [ ] Test error states
- [ ] Test responsive layout (mobile, tablet, desktop)
- [ ] Verify no visual regressions

---

## Phase 4: Update Navigation Flow

### 4.1 Verify DonVi Dashboard Link
- [ ] Open file: `src/components/dashboard/unit-admin-dashboard.tsx`
- [ ] Verify "Chi tiết" button links to: `/practitioners/${practitioner.id}`
- [ ] Test navigation from dashboard to standalone page
- [ ] Verify standalone page displays correctly

### 4.2 Verify Practitioners List Behavior
- [ ] Open file: `src/components/practitioners/practitioners-list.tsx`
- [ ] Verify row click opens PractitionerDetailSheet
- [ ] Verify sheet "View Full Details" button works
- [ ] Test navigation: list → sheet → standalone page
- [ ] Test browser back button flow

### 4.3 Add Breadcrumb or Context (Optional)
- [ ] Consider adding breadcrumb to standalone page: "Người hành nghề > {Name}"
- [ ] OR: Add back link context: "← Quay lại danh sách người hành nghề"
- [ ] Ensure navigation context is clear to user

---

## Phase 5: Cleanup and Polish

### 5.1 Remove Deprecated Code
- [ ] Check for any unused imports in refactored files
- [ ] Remove commented-out code
- [ ] Remove unused helper functions
- [ ] Remove unused state variables

### 5.2 TypeScript & Linting
- [ ] Run: `npm run typecheck` and fix any errors
- [ ] Run: `npm run lint` and address warnings
- [ ] Ensure strict TypeScript compliance
- [ ] Verify no `any` types introduced

### 5.3 Code Documentation
- [ ] Add JSDoc comments to all section components
- [ ] Document `variant` prop behavior
- [ ] Add inline comments for complex logic
- [ ] Update component exports in index files

### 5.4 Update Shared Types
- [ ] Verify all TypeScript interfaces are consistent
- [ ] Export shared types from section types file
- [ ] Ensure PractitionerDetailSheet and PractitionerProfile use same types
- [ ] Document type usage in comments

### 5.5 Performance Optimization
- [ ] Add React.memo to section components if needed
- [ ] Verify no unnecessary re-renders
- [ ] Check bundle size (should decrease due to code reuse)
- [ ] Test page load performance (<500ms)

---

## Phase 6: Testing

### 6.1 Component Unit Tests
- [ ] Test BasicInfoSection with both variants
- [ ] Test LicenseInfoSection with null values
- [ ] Test ContactInfoSection with missing contact info
- [ ] Test ComplianceStatusSection with all statuses
- [ ] Test SubmissionsSection integration
- [ ] Run: `npm run test` and verify all pass

### 6.2 Integration Tests
- [ ] Test PractitionerDetailSheet renders all sections
- [ ] Test PractitionerProfile renders all sections
- [ ] Test data flow from parent to sections
- [ ] Test edit functionality in both views
- [ ] Test navigation between views

### 6.3 Manual Testing - Sheet View
- [ ] Open practitioner detail sheet from list
- [ ] Verify all sections display correctly
- [ ] Verify compact layout is space-efficient
- [ ] Click "View Full Details" → navigates to standalone page
- [ ] Click edit → form sheet opens
- [ ] Submit edit → data refreshes
- [ ] Test loading states
- [ ] Test error states

### 6.4 Manual Testing - Standalone Page
- [ ] Navigate from DonVi dashboard "Chi tiết"
- [ ] Verify all sections display correctly
- [ ] Verify full layout is spacious and readable
- [ ] Verify submissions section shows summary + table
- [ ] Click "View All Submissions" → navigates to filtered list
- [ ] Click edit → form sheet opens
- [ ] Submit edit → data refreshes
- [ ] Test back button returns to dashboard
- [ ] Test loading states
- [ ] Test error states

### 6.5 Cross-Browser Testing
- [ ] Test in Chrome (latest)
- [ ] Test in Firefox (latest)
- [ ] Test in Safari (latest)
- [ ] Test in Edge (latest)
- [ ] Verify responsive behavior on mobile devices

### 6.6 Accessibility Testing
- [ ] Keyboard navigation works in both views
- [ ] Screen reader announces sections correctly
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA
- [ ] Alt text for icons provided

### 6.7 User Role Testing
- [ ] Test as SoYTe user (can edit any practitioner)
- [ ] Test as DonVi user (can edit own unit only)
- [ ] Test as NguoiHanhNghe user (read-only or self-edit)
- [ ] Test as Auditor user (read-only)
- [ ] Verify RBAC enforced in both views

---

## Phase 7: Documentation and Deployment

### 7.1 Code Documentation
- [ ] Update README if needed
- [ ] Document component composition pattern
- [ ] Add examples of using section components
- [ ] Document `variant` prop usage

### 7.2 User Documentation (Optional)
- [ ] Update user guide if navigation changed
- [ ] Add screenshots of both views
- [ ] Document new "View Full Details" workflow

### 7.3 Pre-Commit Checks
- [ ] All tests pass: `npm run test`
- [ ] TypeScript compiles: `npm run typecheck`
- [ ] Linting clean: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No console errors in dev mode

### 7.4 Git Workflow
- [ ] Create feature branch: `claude/refactor-practitioner-detail-composition-{session-id}`
- [ ] Commit Phase 1: "refactor: extract practitioner detail section components"
- [ ] Commit Phase 2: "refactor: update practitioner detail sheet to use sections"
- [ ] Commit Phase 3: "feat: enhance standalone practitioner page with sections and submissions"
- [ ] Commit Phase 4: "chore: update navigation flow and cleanup"
- [ ] Push to remote
- [ ] Verify CI/CD passes

### 7.5 Create Pull Request
- [ ] Open PR with title: "Refactor: Practitioner Detail Component Composition"
- [ ] Link to OpenSpec proposal in PR description
- [ ] Add before/after screenshots
- [ ] List breaking changes: None (additive refactor)
- [ ] Request review from maintainer

---

## Post-Implementation Tasks

### 8. Archive OpenSpec Change
- [ ] After PR merged and deployed to production
- [ ] Verify both views working correctly in production
- [ ] Run: Archive command (when available)
- [ ] Update specs with new requirements
- [ ] Commit archived change

### 9. Monitor Production
- [ ] Check error logs for new errors
- [ ] Monitor page load performance
- [ ] Gather user feedback
- [ ] Address any issues promptly

---

## Rollback Plan

If critical issues discovered in production:

**Phase 2 Rollback:**
- Revert PractitionerDetailSheet changes
- Original sheet still works (sections are additive)

**Phase 3 Rollback:**
- Revert PractitionerProfile changes
- Standalone page reverts to previous state

**Complete Rollback:**
- Revert entire PR
- Section components remain (unused but harmless)
- No data loss or breaking changes

---

## Success Metrics

After deployment, verify:

- [ ] Zero code duplication between views
- [ ] Both views display identical information
- [ ] Standalone page has submissions integration
- [ ] Navigation flow works seamlessly
- [ ] No performance regression
- [ ] No increase in error rates
- [ ] Positive developer feedback (easier to maintain)
- [ ] Positive user feedback (consistent experience)

---

## Notes

- **Priority:** Medium (code quality and maintainability improvement)
- **Estimated effort:** ~3 hours total
- **Risk level:** Low (incremental refactor with rollback options)
- **Breaking changes:** None (behavior preserved)
- **Performance impact:** Neutral or positive (code reuse)
