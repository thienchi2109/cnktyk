# Implementation Tasks

## 1. Font System Setup
- [x] 1.1 Install Inter font via next/font/google
- [x] 1.2 Update src/app/layout.tsx to use Inter font
- [x] 1.3 Update globals.css typography variables
- [x] 1.4 Update tailwind.config.ts font family configuration (if exists)
- [x] 1.5 Test font rendering across all pages

## 2. Button Component Enhancement
- [x] 2.1 Add medical theme variants to Button component
  - [x] 2.1.1 Add `variant="medical"` (primary medical blue)
  - [x] 2.1.2 Add `variant="medical-secondary"` (medical green)
  - [x] 2.1.3 Ensure WCAG AA contrast compliance
- [x] 2.2 Document button variant usage guidelines
- [x] 2.3 Update Button component TypeScript types

## 3. Component Migration - Submissions
- [ ] 3.1 Replace legacy glass buttons in submissions-list.tsx
  - [x] 3.1.1 Update dropdown menu trigger button
  - [x] 3.1.2 Update bulk action buttons (approve, delete)
  - [x] 3.1.3 Update "Ghi nhận hoạt động" button
  - [x] 3.1.4 Update "Gán hoạt động cho nhóm" button
- [x] 3.2 Replace legacy glass buttons in activity-submission-form.tsx
- [x] 3.3 Replace legacy glass buttons in submission-review.tsx
- [x] 3.4 Replace legacy glass buttons in bulk-submission-wizard.tsx

## 4. Component Migration - Dashboard
- [x] 4.1 Replace legacy glass buttons in dashboard components
- [x] 4.2 Replace legacy glass buttons in doh-dashboard.tsx
- [x] 4.3 Replace legacy glass buttons in unit-admin-dashboard.tsx

## 5. Component Migration - Other Pages
- [x] 5.1 Replace legacy glass buttons in evidence management pages
- [x] 5.2 Replace legacy glass buttons in user management pages
- [x] 5.3 Replace legacy glass buttons in notification pages
- [x] 5.4 Replace legacy glass buttons in practitioner pages
- [x] 5.5 Replace legacy glass buttons in navigation components

## 6. Cleanup
- [x] 6.1 Remove unused legacy button imports
- [x] 6.2 Remove glass-button.tsx component
- [ ] 6.3 Remove glassmorphism CSS if no longer used
- [ ] 6.4 Update component documentation

## 7. Testing
- [ ] 7.1 Visual regression testing on all pages
- [ ] 7.2 Accessibility audit (contrast ratios, keyboard navigation)
- [ ] 7.3 Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] 7.4 Mobile responsive testing
- [ ] 7.5 Test all button states (hover, active, disabled, loading)

## 8. Documentation
- [ ] 8.1 Update component library documentation
- [ ] 8.2 Create migration guide for future developers
- [ ] 8.3 Update design system guidelines
