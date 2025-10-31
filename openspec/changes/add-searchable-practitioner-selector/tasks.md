## 1. Utility Components and Hooks
- [ ] 1.1 Create ScrollArea component (`src/components/ui/scroll-area.tsx`)
  - [ ] 1.1.1 Implement scroll container with overflow handling
  - [ ] 1.1.2 Add scrollbar styling matching glassmorphism theme
  - [ ] 1.1.3 Support height prop for fixed-height containers
- [ ] 1.2 Create debounce hook (`src/hooks/use-debounced-value.ts`)
  - [ ] 1.2.1 Implement useDebouncedValue hook with configurable delay (default 300ms)
  - [ ] 1.2.2 Add cleanup logic to prevent memory leaks
  - [ ] 1.2.3 Write unit tests for debounce behavior
- [ ] 1.3 Create TanStack Query hook for practitioners (`src/hooks/use-practitioners.ts`)
  - [ ] 1.3.1 Implement usePractitioners hook with query configuration
  - [ ] 1.3.2 Set staleTime to 5 minutes, gcTime to 10 minutes
  - [ ] 1.3.3 Add error handling and retry logic
  - [ ] 1.3.4 Enable background refetch on window focus
  - [ ] 1.3.5 Write unit tests for cache behavior
- [ ] 1.4 Create search utility functions (`src/lib/practitioners/search.ts`)
  - [ ] 1.4.1 Implement fuzzy search by name, ID, and certification number
  - [ ] 1.4.2 Add diacritics-insensitive Vietnamese text matching
  - [ ] 1.4.3 Optimize for 100+ item performance with debouncing

## 2. Component Implementation
- [ ] 2.1 Create PractitionerSelector component (`src/components/ui/practitioner-selector.tsx`)
  - [ ] 2.1.1 Implement Dialog wrapper with DialogTrigger showing selected value
  - [ ] 2.1.2 Add Input field for search in DialogContent
  - [ ] 2.1.3 Integrate useDebouncedValue hook for search input (300ms delay)
  - [ ] 2.1.4 Add loading spinner during debounce period
  - [ ] 2.1.5 Add ScrollArea with practitioner list
  - [ ] 2.1.6 Render each practitioner with enhanced details (name, position, ID, certification)
  - [ ] 2.1.7 Add controlled value prop and onValueChange callback
  - [ ] 2.1.8 Implement keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  - [ ] 2.1.9 Add empty state when no results match search
  - [ ] 2.1.10 Style with glassmorphism theme matching existing UI
  - [ ] 2.1.11 Add loading state support from TanStack Query
  - [ ] 2.1.12 Implement auto-focus on search input when dialog opens
  - [ ] 2.1.13 Display search result count ("Hiển thị X kết quả")

## 3. Integration
- [ ] 3.1 Update submissions page to use TanStack Query
  - [ ] 3.1.1 Modify `src/app/(authenticated)/submissions/new/page.tsx` to use usePractitioners hook
  - [ ] 3.1.2 Add QueryClientProvider wrapping if not already present
  - [ ] 3.1.3 Handle loading and error states from TanStack Query
  - [ ] 3.1.4 Keep server-side fetch for SEO/initial load, add client-side for interactivity
- [ ] 3.2 Update ActivitySubmissionForm component
  - [ ] 3.2.1 Replace Select with PractitionerSelector in DonVi practitioner selection section
  - [ ] 3.2.2 Integrate with usePractitioners hook for data fetching
  - [ ] 3.2.3 Wire onValueChange to form setValue('MaNhanVien', ...)
  - [ ] 3.2.4 Preserve error message display for validation failures
  - [ ] 3.2.5 Remove old Select and SelectContent imports
  - [ ] 3.2.6 Add Dialog import from ui/dialog
  - [ ] 3.2.7 Add loading skeleton while TanStack Query fetches data
- [ ] 3.3 Verify form submission logic unchanged
- [ ] 3.4 Test with React Hook Form integration
- [ ] 3.5 Test mobile responsiveness (dialog vs dropdown behavior)
- [ ] 3.6 Test cache behavior (open/close dialog multiple times)

## 4. Testing
- [ ] 4.1 Create unit tests for hooks
  - [ ] 4.1.1 Test useDebouncedValue with different delay values (`tests/hooks/use-debounced-value.test.ts`)
  - [ ] 4.1.2 Test debounce cancellation on unmount
  - [ ] 4.1.3 Test usePractitioners caching behavior (`tests/hooks/use-practitioners.test.ts`)
  - [ ] 4.1.4 Test TanStack Query refetch on window focus
  - [ ] 4.1.5 Test error handling and retry logic
- [ ] 4.2 Create unit tests for component (`tests/components/practitioner-selector.test.tsx`)
  - [ ] 4.2.1 Test debounced search filtering with various queries
  - [ ] 4.2.2 Test search applies after 300ms delay, not immediately
  - [ ] 4.2.3 Test keyboard navigation in dialog
  - [ ] 4.2.4 Test selection updates controlled value and closes dialog
  - [ ] 4.2.5 Test empty state when no matches
  - [ ] 4.2.6 Test with 100+ practitioners for performance
  - [ ] 4.2.7 Test Vietnamese diacritics handling
  - [ ] 4.2.8 Test dialog open/close behavior
  - [ ] 4.2.9 Test Escape key closes dialog without selection
  - [ ] 4.2.10 Test loading state from TanStack Query
  - [ ] 4.2.11 Test cache hit scenario (no loading on 2nd open)
- [ ] 4.3 Update activity-submission-form tests
  - [ ] 4.3.1 Update snapshots/assertions for new selector component
  - [ ] 4.3.2 Test form validation still works with selector
  - [ ] 4.3.3 Test dialog interaction in form context
  - [ ] 4.3.4 Test TanStack Query integration in form
- [ ] 4.4 Manual testing
  - [ ] 4.3.1 Test with development dataset (100+ practitioners)
  - [ ] 4.3.2 Verify search response time <100ms
  - [ ] 4.3.3 Test keyboard-only workflow (Tab, Arrow keys, Enter, Escape)
  - [ ] 4.3.4 Test screen reader announcements with NVDA/VoiceOver
  - [ ] 4.3.5 Test on mobile viewport (dialog should be full-screen friendly)
  - [ ] 4.3.6 Test scroll behavior with 200+ practitioners

## 5. Documentation and Polish
- [ ] 5.1 Add JSDoc comments to PractitionerSelector component
- [ ] 5.2 Add JSDoc comments to usePractitioners and useDebouncedValue hooks
- [ ] 5.3 Update component props TypeScript interface with detailed descriptions
- [ ] 5.4 Verify reduced motion support (disable animations when prefers-reduced-motion)
- [ ] 5.5 Add code comments explaining Vietnamese diacritics normalization
- [ ] 5.6 Add code comments explaining debounce strategy and timing choice (300ms)
- [ ] 5.7 Document TanStack Query cache configuration (staleTime, gcTime)

## 6. Validation
- [ ] 6.1 Run typecheck: `npm run typecheck`
- [ ] 6.2 Run linter: `npm run lint`
- [ ] 6.3 Run test suite: `npm run test`
- [ ] 6.4 Build check: `npm run build:check`
- [ ] 6.5 Validate OpenSpec: `openspec validate add-searchable-practitioner-selector --strict`
