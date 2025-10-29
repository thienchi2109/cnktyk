# Changelog

## [Unreleased] - 2025-10-20

### Added
- LoadingNotice component: `src/components/ui/loading-notice.tsx` (accessible spinner + message; size and alignment variants)

### Changed
- Standardized loading notifications across lists and sheets:
  - Lists: Submissions, Practitioners, Users, Activities, Notifications now use LoadingNotice (replacing table/list skeletons). Chart skeletons remain.
  - Sheets: ActivitySubmissionForm shows catalog loading; SubmissionReview and PractitionerDetailSheet show detail loading.

### Fixed
- Escaped quotes in `src/components/practitioners/bulk-import-sheet.tsx` to satisfy `react/no-unescaped-entities`.

### Testing
- TypeScript: 0 errors
- ESLint: 0 errors (warnings non-blocking)

## [Unreleased] - 2025-10-16

### Added

#### Loading Overlay Component
- **New Component**: `src/components/auth/loading-overlay.tsx`
  - Glassmorphism-style loading overlay with smooth animations
  - Progressive step indicators showing authentication flow
  - Shimmer animation effect for modern visual appeal
  - Backdrop blur effect for elegant UI blocking during login

#### Development Tools
- **Dev Accounts Script**: `scripts/create-dev-accounts.ts`
  - Automated script to create/reset development accounts
  - Creates three role-based accounts: Admin (SoYTe), Unit Manager (DonVi), and Practitioner (NguoiHanhNghe)
  - All accounts use simple password '1234' for development convenience
  - Properly hashes passwords using bcrypt
  - Includes environment validation and error handling

#### Login Page Enhancements
- **Quick Login Panel**: Collapsible development account selector
  - Beautiful glassmorphism cards for each role
  - Color-coded by role (blue for Admin, green for Unit Manager, purple for Practitioner)
  - One-click auto-fill functionality for rapid testing
  - Clearly marked as development-only with reminder to remove before production
  - Smooth expand/collapse animation with ChevronDown indicator

### Fixed

#### Authentication Issues
- **401 Error Resolution**: Eliminated confusing NextAuth client-side session fetch errors
  - Implemented server-side session fetching in root layout
  - Session now passed to client SessionProvider, preventing initial 401 errors
  - Improved user experience by removing error console spam on first page load
  
- **Login Failure for Changed Usernames**: 
  - Created script to reset/update dev accounts with correct credentials
  - Fixed password hashing compatibility issues
  - Verified authentication flow end-to-end

#### TypeScript Configuration
- **Build Errors Fixed**: Resolved 62 TypeScript errors in `.next/types/validator.ts`
  - Excluded `.next` directory from TypeScript compilation
  - Removed `.next/types/**/*.ts` from include patterns
  - Added explicit exclusion for generated build artifacts
  - TypeCheck now passes cleanly with 0 errors

#### UI/UX Improvements
- **JSX Syntax Error**: Fixed missing closing `</div>` tag in login page
  - Corrected nested div structure
  - Verified proper component hierarchy
  - Production build now successful

### Changed

#### Authentication Flow
- **Session Management**: Migrated from client-side to server-side session initialization
  - `src/app/layout.tsx`: Now fetches session server-side and passes to SessionProvider
  - `src/components/providers/session-provider.tsx`: Updated to accept initial session prop
  - `src/lib/auth/config.ts`: Enhanced session callback with detailed role information
  - Improved performance by reducing client-side API calls

#### Styling
- **Global CSS Animations**: `src/app/globals.css`
  - Added shimmer animation keyframes for loading states
  - Enhanced glassmorphism effects with proper backdrop filters
  - Improved animation timing functions for smoother transitions

### Technical Details

#### Files Modified
1. `src/app/auth/signin/page.tsx`
   - Added LoadingOverlay component integration
   - Created collapsible dev accounts panel with role-based quick login
   - Fixed JSX closing tag error
   - Enhanced form submission with loading states

2. `src/app/layout.tsx`
   - Added server-side session fetching using `auth()`
   - Pass session to SessionProvider to prevent client-side initial fetch

3. `src/app/globals.css`
   - Added `@keyframes shimmer` for loading animations
   - Enhanced glass effect utilities

4. `src/components/providers/session-provider.tsx`
   - Updated to accept optional `session` prop
   - Pass session to NextAuth SessionProvider

5. `src/lib/auth/config.ts`
   - Enhanced session callback with role information
   - Improved type safety for user object

6. `tsconfig.json`
   - Excluded `.next` and `out` directories from compilation
   - Removed `.next/types/**/*.ts` from include patterns
   - Fixed 62 TypeScript validation errors

#### New Files
1. `src/components/auth/loading-overlay.tsx`
   - Premium glassmorphism loading overlay
   - 3-step progress indicator
   - Shimmer animation effects

2. `scripts/create-dev-accounts.ts`
   - Development account creation/reset utility
   - Bcrypt password hashing
   - Three pre-configured role accounts

### Testing
- ✅ TypeScript compilation: 0 errors
- ✅ ESLint: 0 errors, 213 warnings (non-blocking)
- ✅ Production build: Successful
- ✅ Authentication: All three dev accounts verified working
- ✅ UI/UX: Loading overlay displays correctly during login
- ✅ Session management: No 401 errors on initial page load

### Dependencies
No new production dependencies added. All features use existing packages:
- `next-auth` for authentication
- `lucide-react` for icons
- `tailwindcss` for styling
- Existing UI component library

### Notes
- Development quick-login panel must be removed before production deployment
- All dev accounts use password '1234' - suitable only for development
- TypeScript strict mode maintained throughout
- No breaking changes to existing functionality
