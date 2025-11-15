# Design Document: UI Button and Typography Refactoring

## Context

The current application uses:
1. **Glassmorphism buttons** with backdrop-blur effects and semi-transparent backgrounds
2. **System font stack** for typography (system-ui, -apple-system, BlinkMacSystemFont, etc.)

### Stakeholders
- End users: Healthcare practitioners, unit administrators, SoYTe reviewers
- Development team: Frontend maintainability and consistency
- Accessibility: WCAG compliance requirements

### Constraints
- Must maintain existing healthcare color scheme (medical-blue, medical-green)
- Cannot break existing functionality during migration
- Must work across all supported browsers

## Goals / Non-Goals

### Goals
- Improve text readability and UI clarity
- Meet WCAG AA accessibility standards for contrast ratios
- Establish consistent, professional design system
- Reduce CSS complexity and improve rendering performance
- Create cohesive brand identity with Inter font
- Maintain all existing functionality

### Non-Goals
- Complete design system overhaul (only buttons and fonts)
- Changing color palette or theme
- Modifying layout or spacing systems
- Updating form inputs or other UI components (future work)

## Decisions

### Decision 1: Replace Button with shadcn Button

**Rationale:**
- **Accessibility**: Glassmorphism creates low contrast that fails WCAG standards. Semi-transparent buttons with backdrop blur make text harder to read, especially for users with visual impairments.
- **Professional Appearance**: Healthcare compliance systems benefit from clear, authoritative UI rather than trendy aesthetic effects.
- **Performance**: Backdrop-blur is expensive to render, especially on lower-end devices.
- **Consistency**: shadcn Button is already used in dialogs and forms, creating inconsistency with glassmorphism buttons.
- **Maintainability**: Standard solid buttons are easier to theme and debug.

**Implementation:**
```tsx
// Before
import { Button } from '@/components/ui/glass-button';
<Button variant="secondary" size="sm">Action</Button>

// After
import { Button } from '@/components/ui/button';
<Button variant="outline" size="sm">Action</Button>
```

**Alternatives Considered:**
1. **Keep Button, improve contrast**: Would still have readability issues and performance overhead
2. **Hybrid approach**: Creates inconsistency and maintenance burden
3. **Custom design system**: Overkill for current needs, shadcn provides battle-tested components

### Decision 2: Adopt Inter Font

**Rationale:**
- **Readability**: Inter is designed specifically for UI, with excellent legibility at small sizes
- **Professional**: Used by major enterprise applications (GitHub, Stripe, Vercel)
- **Open Source**: Free, no licensing concerns
- **Vietnamese Support**: Full Latin Extended character set for Vietnamese diacritics
- **Performance**: Optimized with next/font/google for automatic font optimization
- **Brand Consistency**: Creates cohesive identity vs. generic system fonts

**Implementation:**
```tsx
// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-inter',
});

<body className={inter.className}>
```

**Alternatives Considered:**
1. **Keep system fonts**: Lacks brand identity, inconsistent across OS
2. **Use Geist (Vercel)**: Good option but Inter is more established for UI
3. **Roboto**: Too common, less modern than Inter
4. **Custom font**: Unnecessary expense and complexity

### Decision 3: Add Medical Theme Variants to Button

**Rationale:**
- Preserve existing medical color scheme
- Provide semantic button variants for healthcare context
- Maintain visual hierarchy

**Implementation:**
```tsx
// Add to button.tsx variants
medical: "bg-medical-blue text-white hover:bg-medical-blue/90",
"medical-secondary": "bg-medical-green text-white hover:bg-medical-green/90",
```

**Usage Guidelines:**
- Use `variant="medical"` for primary actions that advance a workflow (submit, approve, confirm). This variant should appear once per view to preserve hierarchy.
- Use `variant="medical-secondary"` for constructive secondary actions such as “Ghi nhận hoạt động” or “Tạo mới” when they complement the primary action.
- Continue to use `variant="outline"` for neutral actions (cancel, filter toggles) and `variant="ghost"` for icon-only or low-emphasis controls.
- Disabled states inherit the base Button opacity treatment; avoid using color-only cues by pairing disabled buttons with helper text when necessary.

### Decision 4: Remove Legacy Glass Button

**Rationale:**
- Migration is complete across the application, so keeping the old component only adds confusion
- Eliminates duplicate styling systems and dead code
- Forces future work to rely on the consolidated `Button` API

**Implementation:**
- Delete `src/components/ui/glass-button.tsx`
- Remove the export from `src/components/ui/index.ts`
- Replace all remaining imports and usages with the updated `Button` variants

## Risks / Trade-offs

### Risk 1: Visual Breaking Changes
**Impact**: Users may notice interface changes
**Mitigation**:
- Visual regression testing before deployment
- Gradual rollout if possible
- Document changes in release notes

### Risk 2: Missed Button Instances
**Impact**: Inconsistent UI if some instances remain
**Mitigation**:
- Comprehensive grep/search for all Button usage
- TypeScript will catch most import issues
- Code review checklist

### Risk 3: Font Loading Performance
**Impact**: FOIT (Flash of Invisible Text) during load
**Mitigation**:
- Use next/font optimization with `display: 'swap'`
- Font files will be self-hosted and optimized automatically
- Preload critical font files

### Risk 4: Accessibility Regression
**Impact**: Could inadvertently create new a11y issues
**Mitigation**:
- Run automated accessibility audits (axe-core, Lighthouse)
- Manual keyboard navigation testing
- Screen reader testing

## Migration Plan

### Phase 1: Setup (Non-Breaking)
1. Install Inter font
2. Add medical variants to Button component
3. Test new components in isolation

### Phase 2: Component Migration
1. Start with submissions page (most critical user flow)
2. Migrate dashboard components
3. Migrate remaining pages
4. Each migration as separate commit for easy rollback

### Phase 3: Cleanup
1. Add deprecation notice to Button
2. Remove unused glassmorphism CSS
3. Update documentation

### Rollback Plan
If critical issues arise:
1. Revert font changes: restore system font stack in layout.tsx
2. Revert button changes: git revert specific commits
3. Each migration commit is atomic for easy selective rollback

## Open Questions

- ~~Should we add loading states to new Button variants?~~ → Yes, Button already supports this
- ~~Do we need to update Storybook/component docs?~~ → Yes, added to tasks
- Should we create a comprehensive design system spec for future UI work? → Future consideration
