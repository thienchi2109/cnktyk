# Task Completion Checklist

## Before Committing Code

### 1. Run Type Checking
```bash
npm run typecheck
```
- Ensure no TypeScript errors
- Fix any type issues before proceeding

### 2. Run Linting
```bash
npm run lint
```
- Skip warnings if minor
- Fix major errors
- Use `npm run lint:fix` for auto-fixable issues

### 3. Remove Debug Code
- Remove all `console.log` statements in production code
- Remove commented-out code blocks
- Clean up temporary debugging variables

### 4. Test Functionality
- Manually test the feature in development
- Test with different user roles if applicable
- Verify error handling and edge cases

### 5. Full Build Check (Recommended)
```bash
npm run build:check
```
- Runs typecheck + lint + build
- Ensures production build succeeds
- Catches build-time issues early

## Code Quality Standards

### Documentation
- Add inline comments for complex logic
- Document non-obvious business rules
- Update README if adding new features

### Security
- Validate all user inputs
- Use parameterized queries for database operations
- Check authorization for protected routes
- Never expose sensitive data in error messages

### Performance
- Optimize database queries
- Use appropriate caching strategies
- Minimize bundle size with code splitting
- Optimize images and assets

### Accessibility
- Ensure WCAG 2.1 AA compliance
- Test keyboard navigation
- Add proper ARIA labels
- Maintain sufficient contrast ratios

## Database Changes

### If Schema Changed
- Update `lib/db/schemas.ts` with new types
- Create migration script in `scripts/`
- Test migration on development database
- Document breaking changes

### If Repositories Changed
- Update repository interfaces
- Test repository methods with `npx tsx scripts/test-repositories.ts`
- Update API routes using the repositories

## Deployment Preparation

### Environment Variables
- Verify all required env vars are documented
- Update `.env.production.template` if needed
- Never commit `.env.local` or `.env.production`

### Production Build
```bash
npm run build
```
- Ensure build completes without errors
- Check build output size
- Verify no development-only code in build

### Pre-Deployment Verification
```bash
npm run verify:production
```
- Runs production environment checks
- Validates configuration
- Checks for common deployment issues
