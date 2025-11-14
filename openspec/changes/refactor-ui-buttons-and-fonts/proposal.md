# UI Button and Typography Refactoring

## Why

The current glassmorphism button components (GlassButton) present UX and accessibility challenges:
- Low contrast ratios that may fail WCAG accessibility standards
- Text readability issues due to semi-transparent backgrounds and backdrop blur
- Inconsistent with professional healthcare compliance system aesthetics
- Performance overhead from backdrop-blur rendering
- System font stack lacks cohesive brand identity

## What Changes

- **BREAKING**: Replace all GlassButton components with standard shadcn Button components
- **BREAKING**: Change application font from system font stack to Inter font family
- Migrate button styling from glassmorphism to solid, high-contrast design
- Update button variants to maintain healthcare theme colors (medical-blue, medical-green)
- Improve accessibility with WCAG-compliant contrast ratios
- Enhance visual consistency across all authenticated pages

## Impact

### Affected Specs
- `ui-design-system` (NEW) - Establishes standardized UI component library requirements
- `activity-submission` - Submission list action buttons, form buttons
- `dashboard` - Dashboard action buttons and controls
- `evidence-backup-management` - Evidence management UI buttons

### Affected Code
- `src/components/ui/glass-button.tsx` - Will be deprecated
- `src/components/ui/button.tsx` - Enhanced with medical theme variants
- `src/components/submissions/submissions-list.tsx` - Button migration
- `src/app/layout.tsx` - Font configuration update
- `src/app/globals.css` - Typography system updates
- `tailwind.config.ts` - Font family configuration (if exists)

### Migration Path
- All GlassButton imports → Button imports
- Variant mapping: `GlassButton variant="secondary"` → `Button variant="outline"`
- No data model changes or API changes
- Visual regression testing recommended post-deployment

### User Impact
- Improved readability and accessibility
- Cleaner, more professional interface
- No functional changes to workflows
