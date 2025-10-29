# Disable DonVi Account Management Feature

## Quick Reference

**Change ID**: `disable-donvi-account-management`  
**Status**: Proposal (awaiting approval)  
**Type**: Feature flag / Access control modification  
**Impact**: Breaking change for DonVi role users

## Summary

Temporarily disable account management functionality for DonVi (Unit Admin) role users while maintaining the ability to re-enable it via environment variable configuration. SoYTe (Department of Health) users retain full access.

## Key Features

- ✅ Feature flag controlled via `ENABLE_DONVI_ACCOUNT_MANAGEMENT` environment variable
- ✅ Multi-layer protection (middleware, API, UI)
- ✅ Friendly Vietnamese/English messaging for disabled feature
- ✅ Navigation menu automatically hides when disabled
- ✅ Quick re-enablement without code changes
- ✅ No database schema changes required

## Files Changed

- `middleware.ts` - Route protection logic
- `src/app/(authenticated)/users/page.tsx` - Permission checks
- `src/components/layout/responsive-navigation.tsx` - Menu visibility
- `src/app/api/users/route.ts` - API endpoint protection
- `src/lib/features/flags.ts` - **NEW** Feature flag utility
- `.env.example` - Environment variable documentation
- `.env.production.template` - Production configuration

## To Enable/Disable

### Disable (Default)
```bash
# In your environment or .env file
ENABLE_DONVI_ACCOUNT_MANAGEMENT=false
# OR simply don't set the variable
```

### Enable
```bash
# In your environment or .env file
ENABLE_DONVI_ACCOUNT_MANAGEMENT=true
```

After changing, redeploy or restart the application.

## Validation

✅ Proposal validated with `openspec validate disable-donvi-account-management --strict`

## Next Steps

1. **Review & Approve** this proposal
2. **Implement** tasks in `tasks.md`
3. **Test** thoroughly with both DonVi and SoYTe users
4. **Deploy** with feature flag set to desired state
5. **Document** in user-facing documentation
6. **Archive** this change after deployment

## Related Documentation

- [Proposal](./proposal.md) - Why and what changes
- [Tasks](./tasks.md) - Implementation checklist
- [Design](./design.md) - Technical decisions and trade-offs
- [Spec Delta](./specs/user-management/spec.md) - Requirements changes

## Support

For questions about this change, refer to the design.md file or contact the development team.
