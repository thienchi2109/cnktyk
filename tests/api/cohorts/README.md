# Cohorts API Tests

## Overview
This directory contains tests for the `/api/cohorts/*` endpoints, particularly focusing on bulk submission functionality.

## Test Files

### `apply.test.ts`
Tests for the `POST /api/cohorts/apply` endpoint that handles bulk activity submission creation.

**Key Test Coverage:**

1. **Schema Validation (Fix for Bulk Submission Validation Error)**
   - ✅ Accepts requests WITH optional `LoaiHoatDong` and `YeuCauMinhChung` fields
   - ✅ Accepts requests WITHOUT optional fields (backward compatibility)
   - ✅ Validates field types when provided (string for LoaiHoatDong, boolean for YeuCauMinhChung)
   - ✅ Handles partial optional fields correctly

2. **Basic Validation**
   - Authentication (401 for unauthenticated users)
   - Authorization (403 for non-DonVi/SoYTe roles)
   - Required field validation (TenHoatDong)
   - Data type validation (UUIDs, datetimes, numeric values)
   - Range validation (non-negative credits)

3. **Happy Path Scenarios**
   - Manual mode selection (specific practitioners)
   - "All" mode selection (filtered cohorts)
   - Duplicate handling (partial success)
   - Empty result handling

4. **Real-world Integration**
   - Exact payload from bulk submission wizard (reproduces the bug scenario)
   - Different activity types (HoiThao, NghienCuu, etc.)

## Running Tests

```bash
# Run all cohorts API tests
npm test -- tests/api/cohorts/

# Run only apply endpoint tests
npm test -- tests/api/cohorts/apply.test.ts

# Run in watch mode
npm run test:watch -- tests/api/cohorts/apply.test.ts
```

## Bug Fix Context

**Issue:** At step 3 (preview and confirm) of the bulk submission wizard, DonVi users received a "Validation error" when trying to create bulk submissions.

**Root Cause:** The wizard sent `LoaiHoatDong` and `YeuCauMinhChung` fields that weren't defined in the API's Zod schema.

**Fix:** Added these fields as optional to the schema in `/api/cohorts/apply/route.ts`

**Tests Added:** `apply.test.ts` contains specific tests to verify:
- The bug scenario is fixed (test: "handles exact payload from bulk submission wizard at step 3")
- Fields are properly optional
- Type validation works correctly
- Backward compatibility is maintained

## Test Structure

Each test file follows this structure:
- Mocks for dependencies (auth, database)
- Helper functions for making requests
- UUID constants for consistent test data
- Grouped test suites using `describe` blocks
- Individual test cases using `it` blocks

## Dependencies

- `vitest` - Test runner
- `vi` - Mocking utilities
- Next.js request/response mocks
