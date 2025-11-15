## Why

The current practitioner selection in the submission form (DonVi role) uses a basic dropdown that requires extensive scrolling for units with 100+ practitioners. This creates poor UX where unit admins spend 30+ seconds scrolling through unsorted lists to find a specific practitioner. The lack of search/filter capability and limited visibility of practitioner details (only name + position visible) makes the workflow inefficient and error-prone, especially for large healthcare facilities.

## What Changes

- Replace basic Radix Select with Dialog-based searchable selector using existing primitives
- Add debounced search/filter capability (300ms delay) by practitioner name, ID, or certification number
- Integrate TanStack Query for practitioner list caching and optimistic updates
- Display enhanced practitioner details in dialog list (name, ID, position, certification status)
- Implement keyboard navigation (arrow keys, Enter to select, Escape to close)
- Use ScrollArea for efficient rendering of 100+ items
- Create reusable PractitionerSelector component for use across the application
- Maintain full accessibility (ARIA attributes, screen reader announcements, focus management)
- Preserve existing form validation and submission logic

## Impact

- Affected specs: `activity-submission` (new capability spec)
- Affected code:
  - `src/components/submissions/activity-submission-form.tsx` - Replace Select with PractitionerSelector
  - New file: `src/components/ui/practitioner-selector.tsx` - Dialog-based searchable selector with debounce
  - New file: `src/components/ui/scroll-area.tsx` - Scroll container with virtualization support
  - New file: `src/lib/practitioners/search.ts` - Client-side filtering utilities
  - New file: `src/hooks/use-practitioners.ts` - TanStack Query hook for practitioner list caching
  - `src/app/(authenticated)/submissions/new/page.tsx` - Use TanStack Query for server-side data
- Performance improvements:
  - Selection time: 30+ seconds → <1 second for 100+ item lists
  - Debounced search prevents excessive re-renders (300ms delay)
  - TanStack Query caching eliminates redundant API calls
  - Optimistic updates for instant UI feedback
- Accessibility: Maintains WCAG 2.1 AA compliance with improved keyboard navigation
- No new external dependencies - TanStack Query already in project, uses existing Radix Dialog primitive
- Mobile-friendly: Dialog modal works better than dropdown on small screens
- No breaking changes to API contracts or database schema
- Component is reusable for bulk import wizard and other practitioner selection contexts
