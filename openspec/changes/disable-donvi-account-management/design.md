## Context
The platform currently grants DonVi (Unit Admin) role full account management capabilities. There is a business requirement to temporarily disable this functionality while maintaining the ability to re-enable it quickly without code changes. The solution must provide clear user feedback and maintain security boundaries.

## Goals / Non-Goals
### Goals
- Temporarily disable DonVi account management access via configuration
- Provide clear, friendly messaging to affected users
- Enable quick re-enablement through environment variable change
- Maintain SoYTe (Department of Health) unrestricted access
- No database migrations or schema changes

### Non-Goals
- Not removing the code or functionality permanently
- Not changing SoYTe permissions or access
- Not implementing fine-grained per-user feature flags
- Not creating a UI-based feature flag management system

## Decisions

### Decision 1: Environment Variable Feature Flag
**Choice**: Use `ENABLE_DONVI_ACCOUNT_MANAGEMENT` environment variable (default: false)

**Why**:
- Simple deployment-time configuration
- No runtime UI needed for flag management
- Aligns with existing Cloudflare Pages/Workers deployment pattern
- Easy to enable/disable via environment variable update

**Alternatives considered**:
- Database-based feature flags → Rejected (adds complexity, requires schema changes)
- Per-user feature flags → Rejected (over-engineered for this requirement)
- Hardcoded removal → Rejected (difficult to re-enable)

### Decision 2: Multi-Layer Protection
**Choice**: Implement checks at middleware, API route, and UI component levels

**Why**:
- Defense in depth: prevents unauthorized access even if one layer fails
- Clear separation of concerns: security (middleware/API) vs UX (UI)
- Graceful degradation: users get friendly messages, not broken pages

**Implementation**:
```typescript
// src/lib/features/flags.ts
export const isDonViAccountManagementEnabled = (): boolean => {
  return process.env.ENABLE_DONVI_ACCOUNT_MANAGEMENT === 'true';
};
```

### Decision 3: Friendly User Messaging
**Choice**: Display informative alert component instead of 403 error page

**Why**:
- Better UX: explains why feature is unavailable
- Reduces support burden: users understand it's temporary
- Maintains professional appearance of the platform

**Message template**:
```
"Chức năng quản lý tài khoản tạm thời chưa khả dụng cho vai trò Quản trị viên đơn vị. 
Vui lòng liên hệ Sở Y Tế nếu bạn cần hỗ trợ."

(Account management functionality is temporarily unavailable for Unit Admin role. 
Please contact Department of Health if you need assistance.)
```

### Decision 4: Navigation Menu Conditional Rendering
**Choice**: Hide "Users" menu item for DonVi when feature disabled

**Why**:
- Prevents user confusion from seeing inaccessible menu items
- Cleaner UI experience
- Still shows for SoYTe users (always enabled)

## Risks / Trade-offs

### Risk 1: Feature flag misconfiguration
**Mitigation**: 
- Default to `false` (disabled) for safety
- Clear documentation in .env.example and README
- Validation in feature flag utility function

### Risk 2: Inconsistent state during deployment
**Mitigation**:
- Environment variables set before deployment
- Feature flag checked at request time (not cached)
- Atomic deployment via Cloudflare Pages

### Risk 3: Users may not understand why feature is disabled
**Mitigation**:
- Clear Vietnamese and English messaging
- Contact information for support (SoYTe)
- Visible alert component with appropriate icon

## Migration Plan

### Enablement Steps
1. Set `ENABLE_DONVI_ACCOUNT_MANAGEMENT=false` in production environment
2. Deploy updated code with feature flag checks
3. Verify DonVi users see friendly message
4. Monitor for support requests

### Re-enablement Steps
1. Update environment variable: `ENABLE_DONVI_ACCOUNT_MANAGEMENT=true`
2. Redeploy or trigger environment reload (Cloudflare Pages)
3. Verify DonVi users can access account management
4. Monitor functionality

### Rollback Plan
If issues occur:
1. Revert to previous deployment
2. OR set `ENABLE_DONVI_ACCOUNT_MANAGEMENT=true` to restore access
3. Debug and fix issues in development

## Open Questions
- [ ] Should we log when DonVi users attempt to access disabled features? (Recommendation: Yes, for analytics)
- [ ] Should we notify DonVi users via in-app notification? (Recommendation: Optional, depends on timeline)
- [ ] What is the expected duration of this restriction? (For documentation purposes)
