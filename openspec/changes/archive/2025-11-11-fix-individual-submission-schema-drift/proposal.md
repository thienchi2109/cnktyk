## Why
Single submission creation for DonVi users fails because the API emits file metadata fields (`FileMinhChungSha256`, `FileMinhChungETag`, `FileMinhChungSize`, `VaiTro`) that do not exist in the canonical `GhiNhanHoatDong` table, a drift confirmed against Neon production (`CreationMethod` already exists in the database and must be preserved).

## What Changes
- Align the single submission validation schema and persistence payload with the Neon `GhiNhanHoatDong` schema by removing the unsupported file metadata fields while retaining existing columns such as `CreationMethod`.
- Tighten submission repository typing to remove `as any` casts and ensure compile-time contract checks derived from the verified schema.
- Improve API error handling so database schema mismatches are logged with diagnostic details and surfaced with a specific error code.
- Add regression coverage that exercises individual submission creation against the current schema and guards against re-introducing unsupported columns.

## Impact
- Affected specs: `activity-submission`
- Affected code: `src/app/api/submissions/route.ts`, `src/lib/db/schemas.ts`, `src/lib/db/repositories.ts`, `tests/api/submissions/*`
