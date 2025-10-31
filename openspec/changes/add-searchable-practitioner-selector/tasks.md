## 1. Utility Components
- [ ] 1.1 Create ScrollArea component (`src/components/ui/scroll-area.tsx`)
  - [ ] 1.1.1 Implement scroll container with overflow handling
  - [ ] 1.1.2 Add scrollbar styling matching glassmorphism theme
  - [ ] 1.1.3 Support height prop for fixed-height containers
- [ ] 1.2 Create search utility functions (`src/lib/practitioners/search.ts`)
  - [ ] 1.2.1 Implement fuzzy search by name, ID, and certification number
  - [ ] 1.2.2 Add diacritics-insensitive Vietnamese text matching
  - [ ] 1.2.3 Optimize for 100+ item performance

## 2. Component Implementation
- [ ] 2.1 Create PractitionerSelector component (`src/components/ui/practitioner-selector.tsx`)
  - [ ] 2.1.1 Implement Dialog wrapper with DialogTrigger showing selected value
  - [ ] 2.1.2 Add Input field for search in DialogContent
  - [ ] 2.1.3 Add ScrollArea with practitioner list
  - [ ] 2.1.4 Render each practitioner with enhanced details (name, position, ID, certification)
  - [ ] 2.1.5 Add controlled value prop and onValueChange callback
  - [ ] 2.1.6 Implement keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
  - [ ] 2.1.7 Add empty state when no results match search
  - [ ] 2.1.8 Style with glassmorphism theme matching existing UI
  - [ ] 2.1.9 Add loading state support
  - [ ] 2.1.10 Implement auto-focus on search input when dialog opens

## 3. Integration
- [ ] 3.1 Update ActivitySubmissionForm component
  - [ ] 3.1.1 Replace Select with PractitionerSelector in DonVi practitioner selection section
  - [ ] 3.1.2 Pass practitioners array as prop to selector
  - [ ] 3.1.3 Wire onValueChange to form setValue('MaNhanVien', ...)
  - [ ] 3.1.4 Preserve error message display for validation failures
  - [ ] 3.1.5 Remove old Select and SelectContent imports
  - [ ] 3.1.6 Add Dialog import from ui/dialog
- [ ] 3.2 Verify form submission logic unchanged
- [ ] 3.3 Test with React Hook Form integration
- [ ] 3.4 Test mobile responsiveness (dialog vs dropdown behavior)

## 4. Testing
- [ ] 4.1 Create unit tests (`tests/components/practitioner-selector.test.tsx`)
  - [ ] 4.1.1 Test search filtering with various queries
  - [ ] 4.1.2 Test keyboard navigation in dialog
  - [ ] 4.1.3 Test selection updates controlled value and closes dialog
  - [ ] 4.1.4 Test empty state when no matches
  - [ ] 4.1.5 Test with 100+ practitioners for performance
  - [ ] 4.1.6 Test Vietnamese diacritics handling
  - [ ] 4.1.7 Test dialog open/close behavior
  - [ ] 4.1.8 Test Escape key closes dialog without selection
- [ ] 4.2 Update activity-submission-form tests
  - [ ] 4.2.1 Update snapshots/assertions for new selector component
  - [ ] 4.2.2 Test form validation still works with selector
  - [ ] 4.2.3 Test dialog interaction in form context
- [ ] 4.3 Manual testing
  - [ ] 4.3.1 Test with development dataset (100+ practitioners)
  - [ ] 4.3.2 Verify search response time <100ms
  - [ ] 4.3.3 Test keyboard-only workflow (Tab, Arrow keys, Enter, Escape)
  - [ ] 4.3.4 Test screen reader announcements with NVDA/VoiceOver
  - [ ] 4.3.5 Test on mobile viewport (dialog should be full-screen friendly)
  - [ ] 4.3.6 Test scroll behavior with 200+ practitioners

## 5. Documentation and Polish
- [ ] 5.1 Add JSDoc comments to PractitionerSelector component
- [ ] 5.2 Update component props TypeScript interface with detailed descriptions
- [ ] 5.3 Verify reduced motion support (disable animations when prefers-reduced-motion)
- [ ] 5.4 Add code comments explaining Vietnamese diacritics normalization

## 6. Validation
- [ ] 6.1 Run typecheck: `npm run typecheck`
- [ ] 6.2 Run linter: `npm run lint`
- [ ] 6.3 Run test suite: `npm run test`
- [ ] 6.4 Build check: `npm run build:check`
- [ ] 6.5 Validate OpenSpec: `openspec validate add-searchable-practitioner-selector --strict`
