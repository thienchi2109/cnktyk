## Why
Unit admins (DonVi) can indirectly access/affect practitioners outside their unit during bulk import:
- Validation queries SoCCHN globally and leaks existence
- Execute import upserts by SoCCHN and can reassign MaDonVi across units via ON CONFLICT, violating tenant isolation

## What Changes
- Strict tenant isolation for import workflow (validate/execute) and repository upsert
- Upsert gating: allow update only when conflict row belongs to same MaDonVi; otherwise reject with clear error
- Validation scoping: only check duplicates within same unit; if SoCCHN exists in another unit, return non-identifying error
- Ignore any client-provided unit hints; server derives unitId from session exclusively

## Impact
- Specs affected: import-security, rbac
- Code: api/import/validate, api/import/execute, ImportService.executeImport, (optional) helper in db layer
- Backward compatibility: Excel schema unchanged; semantics of duplicate handling tightened (now error if SoCCHN belongs to another unit)
