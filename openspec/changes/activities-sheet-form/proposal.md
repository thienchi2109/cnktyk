# Refactor Activities Page: Replace Modal with Sheet Form

## Change Summary
Replace the current `GlassModal`-based ActivityForm with a right-sliding sheet form, following the established pattern from the practitioners page for better UX and consistency.

## Current State Analysis

### Issues with Current Modal Approach
- **Modal Blocker**: Full-screen overlay blocks context from the activities list
- **Poor UX for Large Forms**: Activity form has many fields that feel cramped in modal
- **Lost Context**: Users cannot see the activities list while creating/editing
- **Mobile Unfriendly**: Modal takes full screen on mobile, no sense of "slide"
- **Inconsistent Pattern**: Other pages (practitioners) use superior sheet pattern

### Current Implementation (`src/app/(authenticated)/activities/page.tsx`)
```tsx
// Current modal approach - blocks entire screen
{showCreateModal && (
  <GlassModal
    isOpen={showCreateModal}
    onClose={handleModalClose}
    title={selectedActivity ? 'Chỉnh sửa hoạt động' : 'Thêm hoạt động mới'}
    size="lg"
  >
    <ActivityForm activity={selectedActivity} mode={selectedActivity ? 'edit' : 'create'} />
  </GlassModal>
)}
```

### Target Reference: Practitioners Sheet Pattern
- **Component**: `PractitionerDetailSheet` (`src/components/practitioners/practitioner-detail-sheet.tsx`)
- **UI Framework**: Radix UI Sheet with custom styling
- **Slide Direction**: Right-side slide-out panel
- **Width**: `w-full sm:max-w-3xl` responsive sizing
- **Pattern**: Detail view → Edit mode toggle within same sheet

## Proposed Implementation

### 1. Create ActivityFormSheet Component
**File**: `src/components/activities/activity-form-sheet.tsx`

Based on `PractitionerDetailSheet` pattern:
- Uses `Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`
- Right-side slide with `sm:max-w-3xl` width for form space
- Toggle between view/edit modes within sheet
- Maintain all current ActivityForm functionality

### 2. Update ActivityForm Component
**File**: `src/components/activities/activity-form.tsx`

Add `variant` prop support:
- `variant?: 'modal' | 'sheet'` (default: 'modal' for backward compatibility)
- When `variant="sheet"`: Remove card wrapper, adjust padding, use simpler layout
- Keep all existing form validation, permissions, scope logic

### 3. Refactor Activities Page
**File**: `src/app/(authenticated)/activities/page.tsx`

Replace GlassModal with ActivityFormSheet:
```tsx
// New sheet approach - slides from right, maintains context
{showCreateSheet && (
  <ActivityFormSheet
    activityId={selectedActivity?.MaDanhMuc}
    open={showCreateSheet}
    onOpenChange={setShowCreateSheet}
    mode={selectedActivity ? 'edit' : 'create'}
    userRole={userRole}
    unitId={session.user.unitId}
    permissions={permissions}
    onUpdate={() => {
      // Refresh activities list without full page reload
      window.location.reload(); // TODO: Replace with proper state update
    }}
  />
)}
```

### 4. Enhance ActivitiesList Integration
**File**: `src/components/activities/activities-list.tsx`

Update action buttons to trigger sheet instead of modal:
- Create button: Opens sheet in create mode
- Edit button: Opens sheet in edit mode
- Maintain current permissions-based visibility

## Technical Details

### Sheet Component Usage
```tsx
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription
} from '@/components/ui/sheet';

// Sheet configuration (matching practitioners pattern)
<Sheet open={open} onOpenChange={onOpenChange}>
  <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
    <SheetHeader>
      <SheetTitle>
        {mode === 'create' ? 'Thêm hoạt động mới' : 'Chỉnh sửa hoạt động'}
      </SheetTitle>
      <SheetDescription>
        {mode === 'create'
          ? 'Tạo hoạt động mới cho danh mục'
          : 'Cập nhật thông tin hoạt động'
        }
      </SheetDescription>
    </SheetHeader>

    <div className="mt-6">
      <ActivityForm
        variant="sheet"
        activity={activity}
        mode={mode}
        onSubmit={handleSubmit}
        onCancel={() => onOpenChange(false)}
      />
    </div>
  </SheetContent>
</Sheet>
```

### ActivityForm Variant Support
```tsx
interface ActivityFormProps {
  // ... existing props
  variant?: 'modal' | 'sheet';
}

export function ActivityForm({ variant = 'modal', ...props }: ActivityFormProps) {
  if (variant === 'sheet') {
    return (
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Form fields without GlassCard wrapper */}
        {/* Reduced padding for sheet context */}
      </form>
    );
  }

  // Existing modal implementation
  return (
    <GlassCard className="p-6">
      {/* Current form implementation */}
    </GlassCard>
  );
}
```

### State Management Improvements
Replace `window.location.reload()` with proper state management:
- Use React Query or similar for optimistic updates
- Invalidate activities list cache on create/update/delete
- Provide better UX with loading states and success feedback

## Benefits

### UX Improvements
- **Maintained Context**: Users see activities list while editing
- **Better Mobile Experience**: Natural slide pattern on touch devices
- **More Space**: Larger form area in sheet vs modal
- **Consistency**: Matches established practitioners pattern
- **Progressive Enhancement**: Can add detail view before edit mode

### Technical Benefits
- **Reusable Component**: Sheet pattern can be used elsewhere
- **Better Performance**: No full-page re-renders
- **Accessibility**: Proper focus management from Radix UI
- **Responsive Design**: Established responsive breakpoints

### Implementation Benefits
- **Low Risk**: Backward compatible with existing ActivityForm
- **Established Pattern**: Copy from working practitioners implementation
- **Incremental**: Can ship sheet while keeping modal as fallback

## Implementation Tasks

### Phase 1: Create Sheet Components
- [ ] Create `ActivityFormSheet` component based on `PractitionerDetailSheet`
- [ ] Add `variant` prop to `ActivityForm` for sheet-specific styling
- [ ] Implement basic sheet functionality with existing form logic

### Phase 2: Update Page Integration
- [ ] Replace `GlassModal` with `ActivityFormSheet` in activities page
- [ ] Update state management (remove `window.location.reload()`)
- [ ] Test create/edit/permissions workflows

### Phase 3: Enhancements
- [ ] Add React Query for proper cache management
- [ ] Implement optimistic updates for better UX
- [ ] Add loading states and success/error feedback

### Phase 4: Testing & Polish
- [ ] Cross-browser and cross-device testing
- [ ] Accessibility testing with screen readers
- [ ] Performance testing for large activities lists
- [ ] User acceptance testing with DonVi and SoYTe users

## Migration Strategy

### Backward Compatibility
- Keep `variant="modal"` as default for existing usages
- No breaking changes to ActivityForm API
- Gradual migration path for other potential modal forms

### Rollout Plan
1. **Feature Flag**: Add sheet form behind feature flag
2. **Dogfooding**: Test with internal users first
3. **Canary Release**: Enable for subset of DonVi users
4. **Full Release**: Replace modal as default for activities page
5. **Cleanup**: Remove modal code once sheet is proven stable

### Success Metrics
- **Reduced Form Abandonment**: Users complete forms more often with better UX
- **Increased Efficiency**: Faster form completion with maintained context
- **Higher Satisfaction**: Better user feedback on activities management
- **Consistency**: Reduced UI pattern inconsistencies across application

## Files to Change

### New Files
- `src/components/activities/activity-form-sheet.tsx` - New sheet component

### Modified Files
- `src/app/(authenticated)/activities/page.tsx` - Replace modal with sheet
- `src/components/activities/activity-form.tsx` - Add variant prop support
- `src/components/activities/activities-list.tsx` - Update button handlers

### Reference Files (No Changes Needed)
- `src/components/ui/sheet.tsx` - Already exists with proper implementation
- `src/components/practitioners/practitioner-detail-sheet.tsx` - Reference for pattern

## Dependencies

### Required Dependencies (Already Available)
- `@radix-ui/react-dialog` - Sheet foundation
- Existing UI components and styling system
- Current form validation and permissions logic

### No Additional Dependencies Needed
- All required UI components already exist
- Form validation and API integration already implemented
- Follows established patterns from practitioners page

## Conclusion

This refactor provides significant UX improvements by adopting the superior sheet pattern already established in the application. The implementation is low-risk since it copies from a working pattern and maintains backward compatibility.

The change aligns with modern mobile-first design principles and provides a better foundation for future enhancements like detail views and progressive disclosure.