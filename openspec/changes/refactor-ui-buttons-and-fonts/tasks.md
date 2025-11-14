# Implementation Tasks

## 1. Font System Setup
- [ ] 1.1 Install Inter font via next/font/google
- [ ] 1.2 Update src/app/layout.tsx to use Inter font
- [ ] 1.3 Update globals.css typography variables
- [ ] 1.4 Update tailwind.config.ts font family configuration (if exists)
- [ ] 1.5 Test font rendering across all pages

## 2. Button Component Enhancement
- [ ] 2.1 Add medical theme variants to Button component
  - [ ] 2.1.1 Add `variant="medical"` (primary medical blue)
  - [ ] 2.1.2 Add `variant="medical-secondary"` (medical green)
  - [ ] 2.1.3 Ensure WCAG AA contrast compliance
- [ ] 2.2 Document button variant usage guidelines
- [ ] 2.3 Update Button component TypeScript types

## 3. Component Migration - Submissions
- [ ] 3.1 Replace GlassButton in submissions-list.tsx
  - [ ] 3.1.1 Update dropdown menu trigger button
  - [ ] 3.1.2 Update bulk action buttons (approve, delete)
  - [ ] 3.1.3 Update "Ghi nhận hoạt động" button
  - [ ] 3.1.4 Update "Gán hoạt động cho nhóm" button
- [ ] 3.2 Replace GlassButton in activity-submission-form.tsx
- [ ] 3.3 Replace GlassButton in submission-review.tsx
- [ ] 3.4 Replace GlassButton in bulk-submission-wizard.tsx

## 4. Component Migration - Dashboard
- [ ] 4.1 Replace GlassButton in dashboard components
- [ ] 4.2 Replace GlassButton in doh-dashboard.tsx
- [ ] 4.3 Replace GlassButton in unit-admin-dashboard.tsx

## 5. Component Migration - Other Pages
- [ ] 5.1 Replace GlassButton in evidence management pages
- [ ] 5.2 Replace GlassButton in user management pages
- [ ] 5.3 Replace GlassButton in notification pages
- [ ] 5.4 Replace GlassButton in practitioner pages
- [ ] 5.5 Replace GlassButton in navigation components

## 6. Cleanup
- [ ] 6.1 Remove unused GlassButton component imports
- [ ] 6.2 Mark glass-button.tsx as deprecated (add deprecation notice)
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
