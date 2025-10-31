## 1. Utility Components and Hooks
- [x] 1.1 Create ScrollArea component (`src/components/ui/scroll-area.tsx`)
  - [x] 1.1.1 Implement scroll container with overflow handling
  - [x] 1.1.2 Add scrollbar styling matching glassmorphism theme
  - [x] 1.1.3 Support height prop for fixed-height containers
- [x] 1.2 Create debounce hook (`src/hooks/use-debounced-value.ts`)
  - [x] 1.2.1 Implement useDebouncedValue hook with configurable delay (default 300ms)
  - [x] 1.2.2 Add cleanup logic to prevent memory leaks
  - [x] 1.2.3 Write unit tests for debounce behavior
- [x] 1.3 Create TanStack Query hook for practitioners (`src/hooks/use-practitioners.ts`)
  - [x] 1.3.1 Implement usePractitioners hook with query configuration
  - [x] 1.3.2 Set staleTime to 5 minutes, gcTime to 10 minutes
  - [x] 1.3.3 Add error handling and retry logic
  - [x] 1.3.4 Enable background refetch on window focus
  - [x] 1.3.5 Write unit tests for cache behavior
- [x] 1.4 Create search utility functions (`src/lib/practitioners/search.ts`)
  - [x] 1.4.1 Implement fuzzy search by name, ID, and certification number
  - [x] 1.4.2 Add diacritics-insensitive Vietnamese text matching
  - [x] 1.4.3 Optimize for 100+ item performance with debouncing

## 2. Component Implementation
- [x] 2.1 Create PractitionerSelector component (`src/components/ui/practitioner-selector.tsx`)
  - [x] 2.1.1 Implement Dialog wrapper with DialogTrigger showing selected value
  - [x] 2.1.2 Add Input field for search in DialogContent
  - [x] 2.1.3 Integrate useDebouncedValue hook for search input (300ms delay)
  - [x] 2.1.4 Add loading spinner during debounce period
  - [x] 2.1.5 Add ScrollArea with practitioner list
  - [x] 2.1.6 Render each practitioner with enhanced details (name, position, ID, certification)
  - [x] 2.1.7 Add controlled value prop and onValueChange callback
  - [x] 2.1.8 Implement keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  - [x] 2.1.9 Add empty state when no results match search
  - [x] 2.1.10 Style with glassmorphism theme matching existing UI
  - [x] 2.1.11 Add loading state support from TanStack Query
  - [x] 2.1.12 Implement auto-focus on search input when dialog opens
  - [x] 2.1.13 Display search result count ("Hiển thị X kết quả")

## 3. Integration
- [x] 3.1 Update submissions page to use TanStack Query
  - [x] 3.1.1 Modify `src/app/(authenticated)/submissions/new/page.tsx` to use usePractitioners hook
  - [x] 3.1.2 Add QueryClientProvider wrapping if not already present
  - [x] 3.1.3 Handle loading and error states from TanStack Query
  - [x] 3.1.4 Keep server-side fetch for SEO/initial load, add client-side for interactivity
- [x] 3.2 Update ActivitySubmissionForm component
  - [x] 3.2.1 Replace Select with PractitionerSelector in DonVi practitioner selection section
  - [x] 3.2.2 Integrate with usePractitioners hook for data fetching
  - [x] 3.2.3 Wire onValueChange to form setValue('MaNhanVien', ...)
  - [x] 3.2.4 Preserve error message display for validation failures
  - [x] 3.2.5 Remove old Select and SelectContent imports
  - [x] 3.2.6 Add Dialog import from ui/dialog
  - [x] 3.2.7 Add loading skeleton while TanStack Query fetches data
- [x] 3.3 Verify form submission logic unchanged
- [x] 3.4 Test with React Hook Form integration
- [x] 3.5 Test mobile responsiveness (dialog vs dropdown behavior)
- [x] 3.6 Test cache behavior (open/close dialog multiple times)

## 4. Testing
- [x] 4.1 Create unit tests for hooks
  - [x] 4.1.1 Test useDebouncedValue with different delay values (`tests/hooks/use-debounced-value.test.ts`)
  - [x] 4.1.2 Test debounce cancellation on unmount
  - [x] 4.1.3 Test usePractitioners caching behavior (`tests/hooks/use-practitioners.test.ts`)
  - [x] 4.1.4 Test TanStack Query refetch on window focus
  - [x] 4.1.5 Test error handling and retry logic
- [x] 4.2 Create unit tests for component (`tests/components/practitioner-selector.test.tsx`)
  - [x] 4.2.1 Test debounced search filtering with various queries
  - [x] 4.2.2 Test search applies after 300ms delay, not immediately
  - [x] 4.2.3 Test keyboard navigation in dialog
  - [x] 4.2.4 Test selection updates controlled value and closes dialog
  - [x] 4.2.5 Test empty state when no matches
  - [x] 4.2.6 Test with 100+ practitioners for performance
  - [x] 4.2.7 Test Vietnamese diacritics handling
  - [x] 4.2.8 Test dialog open/close behavior
  - [x] 4.2.9 Test Escape key closes dialog without selection
  - [x] 4.2.10 Test loading state from TanStack Query
  - [x] 4.2.11 Test cache hit scenario (no loading on 2nd open)
- [x] 4.3 Update activity-submission-form tests
  - [x] 4.3.1 Update snapshots/assertions for new selector component
  - [x] 4.3.2 Test form validation still works with selector
  - [x] 4.3.3 Test dialog interaction in form context
  - [x] 4.3.4 Test TanStack Query integration in form
- [x] 4.4 Manual testing
  - [x] 4.3.1 Test with development dataset (100+ practitioners)
  - [x] 4.3.2 Verify search response time <100ms
  - [x] 4.3.3 Test keyboard-only workflow (Tab, Arrow keys, Enter, Escape)
  - [x] 4.3.4 Test screen reader announcements with NVDA/VoiceOver
  - [x] 4.3.5 Test on mobile viewport (dialog should be full-screen friendly)
  - [x] 4.3.6 Test scroll behavior with 200+ practitioners

## 5. Documentation and Polish
- [x] 5.1 Add JSDoc comments to PractitionerSelector component
- [x] 5.2 Add JSDoc comments to usePractitioners and useDebouncedValue hooks
- [x] 5.3 Update component props TypeScript interface with detailed descriptions
- [x] 5.4 Verify reduced motion support (disable animations when prefers-reduced-motion)
- [x] 5.5 Add code comments explaining Vietnamese diacritics normalization
- [x] 5.6 Add code comments explaining debounce strategy and timing choice (300ms)
- [x] 5.7 Document TanStack Query cache configuration (staleTime, gcTime)

## 6. Validation
- [x] 6.1 Run typecheck: `npm run typecheck`
- [x] 6.2 Run linter: `npm run lint`
- [x] 6.3 Run test suite: `npm run test`
- [x] 6.4 Build check: `npm run build:check`
- [x] 6.5 Validate OpenSpec: `openspec validate add-searchable-practitioner-selector --strict`
