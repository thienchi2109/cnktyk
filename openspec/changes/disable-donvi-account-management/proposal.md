## Why
DonVi (Unit Admin) users currently have full account management capabilities which need to be temporarily disabled for operational/policy reasons while retaining the ability to re-enable this functionality in the future.

## What Changes
- **BREAKING**: Remove DonVi role access to the account/user management interface
- Add feature flag system to control DonVi account management access
- Display friendly message to DonVi users when they attempt to access disabled features
- Maintain SoYTe (Department of Health) full account management access
- Ensure graceful degradation without breaking existing functionality

## Impact
- Affected specs: `user-management`, `role-based-access-control`
- Affected code:
  - `middleware.ts` (route protection)
  - `src/app/(authenticated)/users/page.tsx` (permission checks)
  - `src/components/layout/responsive-navigation.tsx` (navigation menu)
  - Environment variables (feature flag configuration)
- Users affected: DonVi role users will see friendly message instead of user management interface
- No database schema changes required
- Reversible via environment variable configuration
