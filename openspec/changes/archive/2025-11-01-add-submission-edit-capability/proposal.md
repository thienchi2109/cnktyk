# Add Submission Edit Capability for Unit Admins

## Why

Currently, DonVi (Unit Admin) users can only create new activity submissions and approve/reject existing submissions. If a submission contains incorrect data, the only workaround is to reject it and create a new submission, which:
- Creates audit trail confusion (duplicate/rejected entries)
- Loses the original submission context and timestamps
- Wastes time for both unit admins and practitioners
- Cannot preserve approval workflow state for minor corrections

This change adds the ability for unit admins to edit activity submission data (GhiNhanHoatDong) while the submission is in "ChoDuyet" (pending approval) status, improving operational efficiency and data quality.

## What Changes

- **Add PATCH endpoint** `/api/submissions/[id]` for updating submission data fields
- **Add edit form UI** accessible from submission detail view for DonVi role
- **Add validation rules** ensuring only ChoDuyet submissions can be edited
- **Add audit logging** for all edit operations via NhatKyHeThong
- **Update activity-submission spec** with ADDED requirements for edit capability
- **Restrict edit scope** to submission data only (not approval status - use existing PUT endpoint)

## Impact

### Affected Specs
- `activity-submission` - Adding edit capability requirements

### Affected Code
- `src/app/api/submissions/[id]/route.ts` - New PATCH handler
- `src/app/(authenticated)/don-vi/submissions/[id]/page.tsx` - Add edit form/modal
- `src/lib/db/repositories/ghi-nhan-hoat-dong.ts` - Add update method
- `src/lib/validations/submission.ts` - Add update validation schema
- `tests/api/submissions/edit.test.ts` - New test file for edit operations

### Security Considerations
- Tenant isolation enforced via WHERE clause (MaDonVi match)
- Only ChoDuyet status submissions editable
- Audit log every edit with before/after state
- DonVi can only edit submissions within their unit
- SoYTe cannot edit (read-only governance role)
- NguoiHanhNghe cannot edit (submissions managed by unit)

### Breaking Changes
None - this is additive functionality only.
