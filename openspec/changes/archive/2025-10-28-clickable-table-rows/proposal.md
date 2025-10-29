## Why
Current UX requires users to find and click small action buttons (Eye icon) in the rightmost column to view details. This:
- Reduces discoverability (users may not notice the small icons)
- Increases click precision requirements (small clickable areas)
- Diverges from common data table patterns where entire rows are clickable
- Creates inconsistent UX across similar applications

Making entire rows clickable provides:
- Larger click targets (full row width vs small icon)
- Better discoverability (more intuitive interaction pattern)
- Faster navigation (click anywhere on row)
- Consistent with modern table UX patterns (Gmail, Notion, Linear, etc.)

## What Changes
Make table rows clickable to open detail sheets/pages across all data tables in the app.

### Scope: All Data Tables
The following tables will be updated:

1. **Practitioners List** (`practitioners-list.tsx`)
   - Currently: Eye icon button opens detail sheet
   - Change: Click row → opens `PractitionerDetailSheet`
   - Keep: Edit, Delete actions remain as separate buttons

2. **Users List** (`user-list.tsx`)
   - Currently: Eye icon button opens detail view
   - Change: Click row → triggers `onViewUser(user)`
   - Keep: Edit, Delete actions remain as separate buttons

3. **Submissions List** (`submissions-list.tsx`)
   - Currently: Eye icon button calls `onViewSubmission`
   - Change: Click row → triggers `onViewSubmission(submissionId)`
   - Keep: Selection checkboxes, bulk actions remain

4. **Activities List** (`activities-list.tsx`)
   - Currently: No detail view (admin catalog management only)
   - Change: Click row → opens activity detail modal/sheet
   - Keep: Edit, Delete actions remain as separate buttons (admin only)

5. **Credit History Table** (`credit-history-table.tsx`)
   - Currently: No row actions
   - Change: Click row → opens credit detail modal with full activity info
   - New: Create credit detail modal component

6. **Notification List** (`notification-list.tsx`)
   - Currently: Whole card is clickable via "Xem" button
   - Change: No change needed (already clickable)

### Interaction Pattern
- **Primary action**: Click row (except on interactive elements) → open detail
- **Secondary actions**: Button clicks (Edit, Delete, checkboxes) → specific action
- **Visual feedback**: 
  - Hover state: subtle background change + cursor pointer
  - Active row: no special styling (opens detail immediately)
  - Preserve existing hover styles where present

### Technical Approach
- Add `onClick` handler to `<tr>` elements
- Exclude clicks on buttons, links, checkboxes from row click
- Use `event.stopPropagation()` on action buttons
- Add `cursor-pointer` class and enhance hover states
- Maintain keyboard accessibility (Enter key support where needed)

## Impact
### Affected Components
- `src/components/practitioners/practitioners-list.tsx`
- `src/components/users/user-list.tsx`
- `src/components/submissions/submissions-list.tsx`
- `src/components/activities/activities-list.tsx`
- `src/components/credits/credit-history-table.tsx`

### Backward Compatibility
- No breaking changes
- Eye icon buttons can be removed (redundant) or kept initially for transition
- All existing actions remain functional

### User Experience
**Before**: User must:
1. Scan to rightmost column
2. Find small Eye icon button
3. Click precisely on small target

**After**: User can:
1. Click anywhere on row
2. Instant navigation to detail view
3. Or use specific action buttons as before

### Performance
- Minimal impact (onclick handler addition)
- No new component rendering
- Same detail sheets/modals as before

### Accessibility
- Maintain all existing keyboard navigation
- Add Enter key support for row navigation where missing
- Screen readers: announce row as clickable
- No impact on existing button accessibility

## Out of Scope
- Changing detail sheet/modal implementations
- Adding new detail views where none exist (except credit history)
- Removing existing action buttons in this change (can be separate cleanup)
- Mobile-specific touch interactions (inherit from existing patterns)

## Success Criteria
- Users can click any row to view details
- Action buttons (Edit, Delete, etc.) still work independently  
- Hover state clearly indicates clickability
- No regression in existing functionality
- Keyboard navigation remains intact
