## 1. Practitioners List
- [x] 1.1 Add `onClick` handler to `<tr>` elements that calls `setSelectedPractitionerId` and `setShowDetailSheet(true)`
- [x] 1.2 Add `cursor-pointer` class to clickable rows
- [x] 1.3 Add `event.stopPropagation()` to all action buttons (Eye, Edit, Delete if present)
- [x] 1.4 Optionally remove Eye icon button (now redundant) or keep for transition period
- [x] 1.5 Test: Click row opens detail sheet
- [x] 1.6 Test: Click Edit button does not open detail sheet

## 2. Users List
- [x] 2.1 Add `onClick` handler to `<tr>` elements that calls `onViewUser(user)`
- [x] 2.2 Add `cursor-pointer` class to clickable rows
- [x] 2.3 Add `event.stopPropagation()` to action buttons (Eye, Edit, Delete)
- [x] 2.4 Optionally remove Eye icon button or keep for transition
- [x] 2.5 Test: Click row opens user detail
- [x] 2.6 Test: Click Edit/Delete buttons work independently

## 3. Submissions List
- [x] 3.1 Add `onClick` handler to `<tr>` elements that calls `handleViewSubmission(submission.MaGhiNhan)`
- [x] 3.2 Add `cursor-pointer` class to clickable rows
- [x] 3.3 Add `event.stopPropagation()` to selection checkbox
- [x] 3.4 Add `event.stopPropagation()` to Eye icon button
- [x] 3.5 Add `event.stopPropagation()` to download evidence button
- [x] 3.6 Optionally remove Eye icon button or keep for transition
- [x] 3.7 Test: Click row opens submission detail
- [x] 3.8 Test: Click checkbox only toggles selection
- [x] 3.9 Test: Bulk selection still works

## 4. Activities List
- [x] 4.1 Create `ActivityDetailSheet` or `ActivityDetailModal` component
  - Display activity name, type, credit conversion rate
  - Display validity period (HieuLucTu, HieuLucDen)
  - Display requirements (evidence required, min/max hours)
  - Display status badge
- [x] 4.2 Add state for `selectedActivityId` and `showActivityDetail`
- [x] 4.3 Add `onClick` handler to `<TableRow>` that opens detail modal
- [x] 4.4 Add `cursor-pointer` styling to rows
- [x] 4.5 Add `event.stopPropagation()` to Edit and Delete buttons (admin only)
- [x] 4.6 Test: Click row opens activity detail
- [x] 4.7 Test: Edit/Delete buttons work independently (admin only)

## 5. Credit History Table
- [x] 5.1 Create `CreditDetailModal` component
  - Display full activity information
  - Display credit calculation details
  - Display approval workflow (approver, date, notes)
  - Display evidence files (if FileMinhChungUrl exists)
  - Add close button
- [x] 5.2 Add state for `selectedCreditId` and `showCreditDetail` in parent component
- [x] 5.3 Add `onClick` handler to `<tr>` that opens credit detail modal
- [x] 5.4 Add `cursor-pointer` class to rows
- [x] 5.5 Pass necessary props from parent (practitioner profile or wherever used)
- [x] 5.6 Test: Click row opens credit detail modal
- [x] 5.7 Test: Modal displays correct information

## 6. Keyboard Accessibility
- [x] 6.1 Add `onKeyDown` handlers to detect Enter key on focused rows
- [x] 6.2 Add `tabIndex={0}` to clickable rows to make them focusable
- [x] 6.3 Add ARIA labels: `aria-label="Xem chi tiết [tên]"` to rows
- [x] 6.4 Test: Tab navigation through tables
- [x] 6.5 Test: Enter key opens detail view
- [x] 6.6 Test: Tab to action buttons still works

## 7. Visual Feedback
- [x] 7.1 Verify hover states work on all tables
- [x] 7.2 Ensure cursor pointer is visible on hover
- [x] 7.3 Test hover doesn't conflict with action button hover
- [x] 7.4 Verify focus indicators are visible for keyboard navigation
- [x] 7.5 Test on different screen sizes (mobile, tablet, desktop)

## 8. Testing & QA
- [x] 8.1 Unit tests: Row click handlers
- [x] 8.2 Unit tests: Event propagation (buttons don't trigger row click)
- [x] 8.3 Integration tests: Each table's click-to-detail flow
- [x] 8.4 Accessibility tests: Keyboard navigation, screen reader
- [x] 8.5 Manual testing: Click various parts of rows
- [x] 8.6 Manual testing: Verify all action buttons still work
- [x] 8.7 Regression tests: Existing functionality unaffected

## 9. Documentation
- [x] 9.1 Update component documentation/comments
- [x] 9.2 Add JSDoc for new onClick handlers
- [x] 9.3 Document the event propagation pattern for future reference
- [x] 9.4 Update user-facing docs/help (if any) about new interaction

## 10. Cleanup (Optional Follow-up)
- [x] 10.1 Remove Eye icon buttons after user adoption period
- [x] 10.2 Simplify action column layout (fewer columns)
- [x] 10.3 Consider removing "Thao Tác" header if only Edit/Delete remain
- [x] 10.4 Performance audit: Check for unnecessary re-renders
