## 1. Practitioners List
- [ ] 1.1 Add `onClick` handler to `<tr>` elements that calls `setSelectedPractitionerId` and `setShowDetailSheet(true)`
- [ ] 1.2 Add `cursor-pointer` class to clickable rows
- [ ] 1.3 Add `event.stopPropagation()` to all action buttons (Eye, Edit, Delete if present)
- [ ] 1.4 Optionally remove Eye icon button (now redundant) or keep for transition period
- [ ] 1.5 Test: Click row opens detail sheet
- [ ] 1.6 Test: Click Edit button does not open detail sheet

## 2. Users List
- [ ] 2.1 Add `onClick` handler to `<tr>` elements that calls `onViewUser(user)`
- [ ] 2.2 Add `cursor-pointer` class to clickable rows
- [ ] 2.3 Add `event.stopPropagation()` to action buttons (Eye, Edit, Delete)
- [ ] 2.4 Optionally remove Eye icon button or keep for transition
- [ ] 2.5 Test: Click row opens user detail
- [ ] 2.6 Test: Click Edit/Delete buttons work independently

## 3. Submissions List
- [ ] 3.1 Add `onClick` handler to `<tr>` elements that calls `handleViewSubmission(submission.MaGhiNhan)`
- [ ] 3.2 Add `cursor-pointer` class to clickable rows
- [ ] 3.3 Add `event.stopPropagation()` to selection checkbox
- [ ] 3.4 Add `event.stopPropagation()` to Eye icon button
- [ ] 3.5 Add `event.stopPropagation()` to download evidence button
- [ ] 3.6 Optionally remove Eye icon button or keep for transition
- [ ] 3.7 Test: Click row opens submission detail
- [ ] 3.8 Test: Click checkbox only toggles selection
- [ ] 3.9 Test: Bulk selection still works

## 4. Activities List
- [ ] 4.1 Create `ActivityDetailSheet` or `ActivityDetailModal` component
  - Display activity name, type, credit conversion rate
  - Display validity period (HieuLucTu, HieuLucDen)
  - Display requirements (evidence required, min/max hours)
  - Display status badge
- [ ] 4.2 Add state for `selectedActivityId` and `showActivityDetail`
- [ ] 4.3 Add `onClick` handler to `<TableRow>` that opens detail modal
- [ ] 4.4 Add `cursor-pointer` styling to rows
- [ ] 4.5 Add `event.stopPropagation()` to Edit and Delete buttons (admin only)
- [ ] 4.6 Test: Click row opens activity detail
- [ ] 4.7 Test: Edit/Delete buttons work independently (admin only)

## 5. Credit History Table
- [ ] 5.1 Create `CreditDetailModal` component
  - Display full activity information
  - Display credit calculation details
  - Display approval workflow (approver, date, notes)
  - Display evidence files (if FileMinhChungUrl exists)
  - Add close button
- [ ] 5.2 Add state for `selectedCreditId` and `showCreditDetail` in parent component
- [ ] 5.3 Add `onClick` handler to `<tr>` that opens credit detail modal
- [ ] 5.4 Add `cursor-pointer` class to rows
- [ ] 5.5 Pass necessary props from parent (practitioner profile or wherever used)
- [ ] 5.6 Test: Click row opens credit detail modal
- [ ] 5.7 Test: Modal displays correct information

## 6. Keyboard Accessibility
- [ ] 6.1 Add `onKeyDown` handlers to detect Enter key on focused rows
- [ ] 6.2 Add `tabIndex={0}` to clickable rows to make them focusable
- [ ] 6.3 Add ARIA labels: `aria-label="Xem chi tiết [tên]"` to rows
- [ ] 6.4 Test: Tab navigation through tables
- [ ] 6.5 Test: Enter key opens detail view
- [ ] 6.6 Test: Tab to action buttons still works

## 7. Visual Feedback
- [ ] 7.1 Verify hover states work on all tables
- [ ] 7.2 Ensure cursor pointer is visible on hover
- [ ] 7.3 Test hover doesn't conflict with action button hover
- [ ] 7.4 Verify focus indicators are visible for keyboard navigation
- [ ] 7.5 Test on different screen sizes (mobile, tablet, desktop)

## 8. Testing & QA
- [ ] 8.1 Unit tests: Row click handlers
- [ ] 8.2 Unit tests: Event propagation (buttons don't trigger row click)
- [ ] 8.3 Integration tests: Each table's click-to-detail flow
- [ ] 8.4 Accessibility tests: Keyboard navigation, screen reader
- [ ] 8.5 Manual testing: Click various parts of rows
- [ ] 8.6 Manual testing: Verify all action buttons still work
- [ ] 8.7 Regression tests: Existing functionality unaffected

## 9. Documentation
- [ ] 9.1 Update component documentation/comments
- [ ] 9.2 Add JSDoc for new onClick handlers
- [ ] 9.3 Document the event propagation pattern for future reference
- [ ] 9.4 Update user-facing docs/help (if any) about new interaction

## 10. Cleanup (Optional Follow-up)
- [ ] 10.1 Remove Eye icon buttons after user adoption period
- [ ] 10.2 Simplify action column layout (fewer columns)
- [ ] 10.3 Consider removing "Thao Tác" header if only Edit/Delete remain
- [ ] 10.4 Performance audit: Check for unnecessary re-renders
