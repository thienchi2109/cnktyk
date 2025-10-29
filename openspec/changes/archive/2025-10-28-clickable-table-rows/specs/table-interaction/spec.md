## ADDED Requirements

### Requirement: Clickable Table Rows
The system SHALL make data table rows fully clickable to open detail views, providing larger click targets and improved discoverability.

#### Scenario: Click row to open detail view
- GIVEN a data table with rows (practitioners, users, submissions, activities, credits)
- WHEN the user clicks anywhere on a row
- THEN the system MUST open the detail view/sheet for that record
- AND the click MUST be ignored if it occurs on interactive elements (buttons, checkboxes, links)

#### Scenario: Visual feedback for clickable rows
- GIVEN a data table with clickable rows
- WHEN the user hovers over a row
- THEN the system MUST display a pointer cursor
- AND the system MUST apply a subtle background color change
- AND the hover effect MUST NOT interfere with existing hover styles on cells

#### Scenario: Action buttons work independently
- GIVEN a clickable table row with action buttons (Edit, Delete)
- WHEN the user clicks an action button
- THEN the system MUST execute only the button's action
- AND the system MUST NOT open the detail view
- AND the button click MUST use `event.stopPropagation()` to prevent row click

#### Scenario: Selection checkboxes work independently
- GIVEN a table with selection checkboxes (e.g., submissions list)
- WHEN the user clicks a checkbox
- THEN the system MUST only toggle the selection state
- AND the system MUST NOT open the detail view
- AND the checkbox click MUST use `event.stopPropagation()` to prevent row click

#### Scenario: Keyboard navigation support
- GIVEN a focused table row
- WHEN the user presses Enter key
- THEN the system MUST open the detail view for that row
- AND the system MUST maintain focus management for accessibility
- AND tab navigation through buttons MUST still work

#### Scenario: Existing Eye icon button behavior
- GIVEN a table row with an existing Eye icon button
- WHEN the user clicks the Eye icon
- THEN the system MUST open the detail view (same as clicking the row)
- AND the Eye icon MAY be removed in future cleanup (redundant with clickable row)
- OR the Eye icon MAY be kept for user familiarity during transition

## MODIFIED Requirements

### Requirement: Table Row Hover States
The existing hover states SHALL be preserved and enhanced to indicate clickability.

#### Scenario: Practitioners table hover
- Current: `className="hover:bg-gray-50/30 transition-colors"`
- Enhanced: Add `cursor-pointer` class
- Result: Row shows hover + pointer cursor

#### Scenario: Users table hover
- Current: `className="hover:bg-gray-50/30 transition-colors"`
- Enhanced: Add `cursor-pointer` class
- Result: Row shows hover + pointer cursor

#### Scenario: Submissions table hover  
- Current: Row has hover styling
- Enhanced: Add `cursor-pointer` class + ensure no conflict with checkbox clicks

#### Scenario: Activities table hover
- Current: TableRow component (shadcn/ui default hover)
- Enhanced: Add explicit hover state + cursor-pointer

#### Scenario: Credit history table hover
- Current: `className="hover:bg-white/10 transition-colors"`
- Enhanced: Add `cursor-pointer` class

## NEW Component

### Requirement: Credit Detail Modal
A new modal component SHALL be created to display full credit/activity details when a credit history row is clicked.

#### Scenario: Display credit activity details
- WHEN user clicks a credit history row
- THEN system MUST show modal with:
  - Activity name and type
  - Credit hours/points
  - Approval status and date
  - Approver information (if approved/rejected)
  - Evidence/proof documents (if any)
  - Activity dates and duration
  - Notes/comments

#### Scenario: Close credit detail modal
- GIVEN an open credit detail modal
- WHEN user clicks close button or presses Escape
- THEN the modal MUST close
- AND no data MUST be persisted

## Technical Constraints

### Constraint: Event Propagation
- Row click handlers MUST check `event.target` to identify interactive elements
- Interactive elements (button, a, input, checkbox) MUST call `event.stopPropagation()`
- Alternative: Use event delegation with CSS selectors to exclude interactive areas

### Constraint: Accessibility
- Clickable rows MUST have `role="button"` or appropriate ARIA label
- Keyboard Enter key MUST trigger same action as click
- Screen readers MUST announce rows as clickable/interactive
- Focus indicators MUST be clearly visible

### Constraint: Performance
- onClick handlers MUST be memoized to prevent unnecessary re-renders
- Event listeners MUST NOT cause layout thrashing
- Hover states MUST use CSS transitions for smooth visual feedback

### Constraint: Mobile Support
- Touch events MUST work the same as mouse clicks
- Tap targets MUST meet minimum size requirements (already satisfied by full row)
- No special mobile-only behavior needed (existing responsive design)

## Validation

### Test Case: Row click opens detail
```typescript
// Given: Practitioner table with rows
// When: User clicks on row
// Then: PractitionerDetailSheet opens with correct ID
expect(handleRowClick).toHaveBeenCalledWith(practitioner.MaNhanVien);
```

### Test Case: Button click doesn't trigger row click
```typescript
// Given: Row with Edit button
// When: User clicks Edit button
// Then: Only edit action fires, not row click
expect(onEditUser).toHaveBeenCalled();
expect(onViewUser).not.toHaveBeenCalled();
```

### Test Case: Checkbox click doesn't trigger row click
```typescript
// Given: Submissions row with checkbox
// When: User clicks checkbox
// Then: Only selection toggles, not detail view
expect(toggleSelect).toHaveBeenCalled();
expect(onViewSubmission).not.toHaveBeenCalled();
```

### Test Case: Enter key opens detail
```typescript
// Given: Focused table row
// When: User presses Enter
// Then: Detail view opens
fireEvent.keyDown(row, { key: 'Enter' });
expect(openDetail).toHaveBeenCalled();
```
