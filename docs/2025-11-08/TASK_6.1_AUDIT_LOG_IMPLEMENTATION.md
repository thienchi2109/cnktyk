# Task 6.1: Audit Log Entry Implementation Plan

**Date:** 2025-11-08
**Task Reference:** openspec/changes/refactor-cohort-bulk-submission/tasks.md#L117-L124
**Status:** Ready for Implementation

---

## Executive Summary

Task 6.1 requires implementing proper audit logging for the bulk submission creation feature. While audit logging is **already partially implemented**, it needs to be enhanced to:

1. Use the `logAction` helper method instead of direct `create()` calls
2. Add sample practitioner IDs (first 10)
3. Include additional metadata (unitId, actorRole)
4. Define action constants for consistency

**Current State:** ⚠️ Audit logging exists but uses ad-hoc writes
**Target State:** ✅ Proper audit logging using helper methods with complete metadata

---

## Current Implementation Analysis

### Existing Audit Log Code

**File:** `src/app/api/submissions/bulk-create/route.ts:214-232`

```typescript
await nhatKyHeThongRepo.create({
  MaTaiKhoan: user.id,
  HanhDong: 'BULK_SUBMISSION_CREATE',
  Bang: 'GhiNhanHoatDong',
  KhoaChinh: null,
  DiaChiIP: null,
  NoiDung: {
    activityId: payload.MaDanhMuc,
    activityName: activity.TenDanhMuc,
    cohortMode: normalizedSelection.mode,
    cohortFilters: normalizedSelection.filters,
    totalSelected: practitioners.length,
    totalExcluded: normalizedSelection.excludedIds.length,
    created: insertResult.inserted.length,
    skipped: duplicateIdList.length,
    failed: errors.length,
    actorRole: user.role,
  },
});
```

### Issues with Current Implementation

| Issue | Description | Task Reference |
|-------|-------------|----------------|
| ❌ **Ad-hoc write** | Using `create()` directly instead of `logAction()` helper | 6.1.7 |
| ❌ **Missing sample IDs** | No sample practitioner IDs stored | 6.1.4 |
| ❌ **Missing unitId** | User's unitId not included in details | Design doc requirement |
| ⚠️ **No constant** | Action string is hardcoded, not a constant | 6.1.1 |
| ❌ **No IP address** | DiaChiIP is always null | Best practice |

### Available Helper Method

**File:** `src/lib/db/repositories.ts:1844-1860`

```typescript
async logAction(
  userId: string | null,
  action: string,
  table: string,
  primaryKey: string,
  content: Record<string, any>,
  ipAddress?: string | null
): Promise<NhatKyHeThong> {
  return this.create({
    MaTaiKhoan: userId,
    HanhDong: action,
    Bang: table,
    KhoaChinh: primaryKey,
    NoiDung: content,
    DiaChiIP: ipAddress ?? null,
  });
}
```

**Benefits of using `logAction`:**
- ✅ Consistent parameter order
- ✅ Clearer intent in code
- ✅ Easier to mock in tests
- ✅ Follows repository pattern

---

## Design Requirements

### From Design Document (design.md:695-718)

Expected audit log structure:

```typescript
{
  action: 'BULK_SUBMISSION_CREATE',
  actor: user.id,
  actorRole: user.role,
  unitId: user.unitId,
  timestamp: new Date().toISOString(),
  details: {
    activityId: MaDanhMuc,
    activityName: activity.TenDanhMuc,
    cohortMode: 'all' | 'manual',
    cohortFilters: { ... },
    totalCandidates: 50,
    excludedCount: 3,
    created: 45,
    skipped: 2,
    samplePractitionerIds: ['uuid1', 'uuid2', ...],  // ⬅️ MISSING
  },
}
```

### From Proposal Document (proposal.md:169-185)

Audit logging should track:
- ✅ Action type: `BULK_SUBMISSION_CREATE`
- ✅ Actor: User ID performing the action
- ✅ Activity details: ID and name
- ✅ Cohort details: Mode, filters, counts
- ✅ Operation results: Created, skipped, excluded counts
- ❌ Sample practitioner IDs: First 10 practitioners

---

## Task Breakdown

### 6.1.1 Define `BULK_SUBMISSION_CREATE` Action Constant

**Status:** Not implemented

**Current:** Hardcoded string in API
```typescript
HanhDong: 'BULK_SUBMISSION_CREATE',
```

**Target:** Constant defined in a central location

**Options:**

#### Option A: Define in types file (Recommended)
```typescript
// src/types/audit-actions.ts
export const AUDIT_ACTIONS = {
  // Submission actions
  SUBMISSION_CREATE: 'SUBMISSION_CREATE',
  SUBMISSION_UPDATE: 'SUBMISSION_UPDATE',
  SUBMISSION_APPROVE: 'SUBMISSION_APPROVE',
  SUBMISSION_REJECT: 'SUBMISSION_REJECT',
  BULK_SUBMISSION_CREATE: 'BULK_SUBMISSION_CREATE',

  // Activity catalog actions
  ACTIVITY_CREATE: 'ACTIVITY_CREATE',
  ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',
  ACTIVITY_DELETE: 'ACTIVITY_DELETE',

  // ... other actions
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
```

#### Option B: Define in bulk-submission types
```typescript
// src/types/bulk-submission.ts
export const BULK_SUBMISSION_ACTIONS = {
  CREATE: 'BULK_SUBMISSION_CREATE',
} as const;
```

**Recommendation:** Option A - Centralized audit actions for consistency across the app.

---

### 6.1.2 Log Entry with Cohort Selection Details

**Status:** ✅ Already implemented

Current implementation includes:
- `cohortMode`: 'all' or 'manual'
- `cohortFilters`: Filter criteria
- `totalSelected`: Number of practitioners selected
- `totalExcluded`: Number of excluded practitioners

**No action needed** - Already complete.

---

### 6.1.3 Include Activity Info, Counts, Filters

**Status:** ✅ Already implemented

Current implementation includes:
- `activityId`: Activity catalog ID
- `activityName`: Activity name
- `created`: Number of submissions created
- `skipped`: Number of duplicates skipped
- `failed`: Number of errors

**No action needed** - Already complete.

---

### 6.1.4 Store Sample Practitioner IDs (First 10)

**Status:** ❌ Not implemented

**Current:** No sample IDs stored

**Target:** Store first 10 practitioner IDs for audit trail

**Implementation:**
```typescript
const samplePractitionerIds = practitioners
  .slice(0, 10)
  .map(p => p.MaNhanVien);

// Include in NoiDung
NoiDung: {
  // ... existing fields
  samplePractitionerIds,
}
```

**Why store sample IDs:**
- Audit verification: "Which practitioners were enrolled?"
- Troubleshooting: "Did the right people get enrolled?"
- Compliance: "Show me who was in the cohort"
- Not storing all IDs to avoid JSONB bloat (10 is sufficient for sampling)

---

### 6.1.5 Add Timestamp and Actor Information

**Status:** ⚠️ Partially implemented

**Current implementation:**
- ✅ Timestamp: Automatically added by database (`ThoiGian` column default)
- ✅ Actor: `MaTaiKhoan` field stores user ID
- ✅ Actor role: Included in `NoiDung.actorRole`
- ❌ UnitId: Not included

**Target:** Add user's unitId to details

**Implementation:**
```typescript
NoiDung: {
  // ... existing fields
  unitId: user.unitId,
  actorRole: user.role,
}
```

**Why store unitId:**
- Multi-tenant audit: "Which unit performed this action?"
- Compliance reporting: "Show bulk enrollments by unit"
- Troubleshooting: "Which admin from which unit created this?"

---

### 6.1.6 Test Audit Log Retrieval

**Status:** ❌ Not implemented

**Required tests:**
1. Verify audit log entry is created after bulk enrollment
2. Verify all fields are populated correctly
3. Verify sample practitioner IDs are limited to 10
4. Verify audit log can be retrieved by user
5. Verify audit log can be filtered by action type
6. Verify audit log cannot be modified or deleted

**Test plan:** See [Testing Strategy](#testing-strategy) section below.

---

### 6.1.7 Use `nhatKyHeThongRepo.logAction` Helper

**Status:** ❌ Not implemented

**Current:**
```typescript
await nhatKyHeThongRepo.create({
  MaTaiKhoan: user.id,
  HanhDong: 'BULK_SUBMISSION_CREATE',
  Bang: 'GhiNhanHoatDong',
  KhoaChinh: null,
  DiaChiIP: null,
  NoiDung: { ... },
});
```

**Target:**
```typescript
await nhatKyHeThongRepo.logAction(
  user.id,
  AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
  'GhiNhanHoatDong',
  null, // No single primary key for bulk operation
  {
    activityId: payload.MaDanhMuc,
    activityName: activity.TenDanhMuc,
    cohortMode: normalizedSelection.mode,
    cohortFilters: normalizedSelection.filters,
    totalSelected: practitioners.length,
    totalExcluded: normalizedSelection.excludedIds.length,
    created: insertResult.inserted.length,
    skipped: duplicateIdList.length,
    failed: errors.length,
    actorRole: user.role,
    unitId: user.unitId,
    samplePractitionerIds: practitioners.slice(0, 10).map(p => p.MaNhanVien),
  },
  ipAddress, // Extract from request
);
```

**Benefits:**
- Consistent with other audit log calls
- Clearer parameter names
- Easier to test and mock

---

## Implementation Plan

### Step 1: Create Audit Actions Constants File

**File:** `src/types/audit-actions.ts` (new file)

```typescript
/**
 * Centralized audit action constants for the CNKTYKLT platform
 *
 * Usage:
 *   await nhatKyHeThongRepo.logAction(
 *     userId,
 *     AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
 *     ...
 *   );
 */
export const AUDIT_ACTIONS = {
  // Submission actions
  SUBMISSION_CREATE: 'SUBMISSION_CREATE',
  SUBMISSION_UPDATE: 'SUBMISSION_UPDATE',
  SUBMISSION_DELETE: 'SUBMISSION_DELETE',
  SUBMISSION_APPROVE: 'SUBMISSION_APPROVE',
  SUBMISSION_REJECT: 'SUBMISSION_REJECT',
  BULK_SUBMISSION_CREATE: 'BULK_SUBMISSION_CREATE',

  // Activity catalog actions
  ACTIVITY_CREATE: 'ACTIVITY_CREATE',
  ACTIVITY_UPDATE: 'ACTIVITY_UPDATE',
  ACTIVITY_DELETE: 'ACTIVITY_DELETE',

  // User actions
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  USER_CREATE: 'USER_CREATE',
  USER_UPDATE: 'USER_UPDATE',

  // Credit rule actions
  CREDIT_RULE_UPDATE: 'CREDIT_RULE_UPDATE',

  // System actions
  SYSTEM_BACKUP: 'SYSTEM_BACKUP',
  SYSTEM_RESTORE: 'SYSTEM_RESTORE',
} as const;

export type AuditAction = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS];
```

**Estimated time:** 15 minutes

---

### Step 2: Extract IP Address from Request

**File:** `src/app/api/submissions/bulk-create/route.ts`

Add utility function to extract client IP:

```typescript
function getClientIp(request: NextRequest): string | null {
  // Try various headers (Cloudflare, nginx, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');

  if (cfConnectingIp) return cfConnectingIp;
  if (forwarded) return forwarded.split(',')[0].trim();
  if (realIp) return realIp;

  return null;
}
```

**Note:** For server-side API routes, getting the true client IP depends on deployment setup (Vercel, nginx, Cloudflare, etc.). This utility handles common cases.

**Estimated time:** 10 minutes

---

### Step 3: Update Bulk Create API to Use `logAction` Helper

**File:** `src/app/api/submissions/bulk-create/route.ts`

**Changes needed:**

1. Import audit actions constant:
```typescript
import { AUDIT_ACTIONS } from '@/types/audit-actions';
```

2. Extract IP address early in the handler:
```typescript
export async function POST(request: NextRequest): Promise<NextResponse<...>> {
  try {
    const ipAddress = getClientIp(request);
    // ... rest of handler
```

3. Replace audit log creation (lines 214-232) with `logAction`:
```typescript
// OLD (delete this):
await nhatKyHeThongRepo.create({
  MaTaiKhoan: user.id,
  HanhDong: 'BULK_SUBMISSION_CREATE',
  Bang: 'GhiNhanHoatDong',
  KhoaChinh: null,
  DiaChiIP: null,
  NoiDung: {
    activityId: payload.MaDanhMuc,
    activityName: activity.TenDanhMuc,
    cohortMode: normalizedSelection.mode,
    cohortFilters: normalizedSelection.filters,
    totalSelected: practitioners.length,
    totalExcluded: normalizedSelection.excludedIds.length,
    created: insertResult.inserted.length,
    skipped: duplicateIdList.length,
    failed: errors.length,
    actorRole: user.role,
  },
});

// NEW (replace with this):
await nhatKyHeThongRepo.logAction(
  user.id,
  AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
  'GhiNhanHoatDong',
  null, // No single primary key for bulk operations
  {
    // Activity information
    activityId: payload.MaDanhMuc,
    activityName: activity.TenDanhMuc,

    // Cohort selection details
    cohortMode: normalizedSelection.mode,
    cohortFilters: normalizedSelection.filters,
    totalSelected: practitioners.length,
    totalExcluded: normalizedSelection.excludedIds.length,

    // Operation results
    created: insertResult.inserted.length,
    skipped: duplicateIdList.length,
    failed: errors.length,

    // Actor information
    actorRole: user.role,
    unitId: user.unitId,

    // Sample practitioner IDs (first 10 for audit trail)
    samplePractitionerIds: practitioners
      .slice(0, 10)
      .map(p => p.MaNhanVien),
  },
  ipAddress,
);
```

**Estimated time:** 20 minutes

---

### Step 4: Add Helper Function to Repository (Optional Enhancement)

**File:** `src/lib/db/repositories.ts`

For better developer experience, add a specialized helper in `NhatKyHeThongRepository`:

```typescript
export class NhatKyHeThongRepository extends BaseRepository<...> {
  // ... existing methods ...

  /**
   * Log a bulk submission creation operation
   * Specialized helper with type-safe parameters
   */
  async logBulkSubmissionCreate(params: {
    userId: string;
    activityId: string;
    activityName: string;
    cohortMode: 'all' | 'manual';
    cohortFilters: Record<string, any>;
    totalSelected: number;
    totalExcluded: number;
    created: number;
    skipped: number;
    failed: number;
    actorRole: string;
    unitId: string | null;
    samplePractitionerIds: string[];
    ipAddress?: string | null;
  }): Promise<NhatKyHeThong> {
    return this.logAction(
      params.userId,
      'BULK_SUBMISSION_CREATE',
      'GhiNhanHoatDong',
      null,
      {
        activityId: params.activityId,
        activityName: params.activityName,
        cohortMode: params.cohortMode,
        cohortFilters: params.cohortFilters,
        totalSelected: params.totalSelected,
        totalExcluded: params.totalExcluded,
        created: params.created,
        skipped: params.skipped,
        failed: params.failed,
        actorRole: params.actorRole,
        unitId: params.unitId,
        samplePractitionerIds: params.samplePractitionerIds,
      },
      params.ipAddress,
    );
  }
}
```

**Benefits:**
- Type-safe parameters
- Self-documenting API
- Easier to use in tests
- Can validate parameters before logging

**Usage in bulk-create API:**
```typescript
await nhatKyHeThongRepo.logBulkSubmissionCreate({
  userId: user.id,
  activityId: payload.MaDanhMuc,
  activityName: activity.TenDanhMuc,
  cohortMode: normalizedSelection.mode,
  cohortFilters: normalizedSelection.filters,
  totalSelected: practitioners.length,
  totalExcluded: normalizedSelection.excludedIds.length,
  created: insertResult.inserted.length,
  skipped: duplicateIdList.length,
  failed: errors.length,
  actorRole: user.role,
  unitId: user.unitId,
  samplePractitionerIds: practitioners.slice(0, 10).map(p => p.MaNhanVien),
  ipAddress,
});
```

**Estimated time:** 30 minutes (optional - can defer to later)

---

## Testing Strategy

### Unit Tests

**File:** `tests/lib/db/audit-logging.test.ts` (new file)

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { nhatKyHeThongRepo } from '@/lib/db/repositories';
import { AUDIT_ACTIONS } from '@/types/audit-actions';

describe('Audit Logging - Bulk Submission Create', () => {
  it('should create audit log entry with all required fields', async () => {
    const testUserId = 'user-123';
    const testActivityId = 'activity-456';

    const auditLog = await nhatKyHeThongRepo.logAction(
      testUserId,
      AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
      'GhiNhanHoatDong',
      null,
      {
        activityId: testActivityId,
        activityName: 'COVID-19 Safety Training',
        cohortMode: 'all',
        cohortFilters: { trangThai: 'DangLamViec' },
        totalSelected: 50,
        totalExcluded: 3,
        created: 45,
        skipped: 2,
        failed: 0,
        actorRole: 'DonVi',
        unitId: 'unit-789',
        samplePractitionerIds: ['p1', 'p2', 'p3'],
      },
      '192.168.1.1',
    );

    expect(auditLog.MaTaiKhoan).toBe(testUserId);
    expect(auditLog.HanhDong).toBe(AUDIT_ACTIONS.BULK_SUBMISSION_CREATE);
    expect(auditLog.Bang).toBe('GhiNhanHoatDong');
    expect(auditLog.DiaChiIP).toBe('192.168.1.1');
    expect(auditLog.NoiDung).toBeDefined();
    expect(auditLog.NoiDung?.activityId).toBe(testActivityId);
    expect(auditLog.NoiDung?.samplePractitionerIds).toHaveLength(3);
  });

  it('should limit sample practitioner IDs to 10', async () => {
    const manyPractitioners = Array.from({ length: 100 }, (_, i) => `p${i}`);
    const sampleIds = manyPractitioners.slice(0, 10);

    const auditLog = await nhatKyHeThongRepo.logAction(
      'user-123',
      AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
      'GhiNhanHoatDong',
      null,
      {
        activityId: 'activity-456',
        activityName: 'Test Activity',
        cohortMode: 'all',
        cohortFilters: {},
        totalSelected: 100,
        totalExcluded: 0,
        created: 100,
        skipped: 0,
        failed: 0,
        actorRole: 'DonVi',
        unitId: 'unit-789',
        samplePractitionerIds: sampleIds,
      },
    );

    expect(auditLog.NoiDung?.samplePractitionerIds).toHaveLength(10);
  });

  it('should prevent audit log modification', async () => {
    const auditLog = await nhatKyHeThongRepo.logAction(
      'user-123',
      AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
      'GhiNhanHoatDong',
      null,
      { test: 'data' },
    );

    await expect(
      nhatKyHeThongRepo.update(auditLog.MaNhatKy, { HanhDong: 'MODIFIED' })
    ).rejects.toThrow('Audit logs cannot be modified');
  });

  it('should prevent audit log deletion', async () => {
    const auditLog = await nhatKyHeThongRepo.logAction(
      'user-123',
      AUDIT_ACTIONS.BULK_SUBMISSION_CREATE,
      'GhiNhanHoatDong',
      null,
      { test: 'data' },
    );

    await expect(
      nhatKyHeThongRepo.delete(auditLog.MaNhatKy)
    ).rejects.toThrow('Audit logs cannot be deleted');
  });
});
```

### Integration Tests

**File:** `tests/api/submissions/bulk-create.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/submissions/bulk-create/route';
import { nhatKyHeThongRepo } from '@/lib/db/repositories';

describe('POST /api/submissions/bulk-create - Audit Logging', () => {
  it('should create audit log entry after successful bulk creation', async () => {
    // Arrange
    const requestBody = {
      MaDanhMuc: 'test-activity-id',
      cohort: {
        mode: 'manual',
        selectedIds: ['practitioner-1', 'practitioner-2'],
        excludedIds: [],
        filters: {},
        totalFiltered: 2,
      },
    };

    const mockRequest = new Request('http://localhost/api/submissions/bulk-create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': '203.0.113.1',
      },
      body: JSON.stringify(requestBody),
    });

    // Act
    const response = await POST(mockRequest);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(201);
    expect(data.success).toBe(true);

    // Verify audit log was created
    const auditLogs = await nhatKyHeThongRepo.findByAction(
      'BULK_SUBMISSION_CREATE',
      { limit: 1 }
    );

    expect(auditLogs).toHaveLength(1);
    const auditLog = auditLogs[0];

    expect(auditLog.HanhDong).toBe('BULK_SUBMISSION_CREATE');
    expect(auditLog.NoiDung?.activityId).toBe('test-activity-id');
    expect(auditLog.NoiDung?.created).toBe(2);
    expect(auditLog.NoiDung?.samplePractitionerIds).toBeDefined();
    expect(auditLog.DiaChiIP).toBe('203.0.113.1');
  });
});
```

### Manual Testing Checklist

- [ ] Create a bulk enrollment with 50+ practitioners
- [ ] Verify audit log entry is created in database
- [ ] Check that sample practitioner IDs contains exactly 10 IDs
- [ ] Verify unitId is stored in NoiDung
- [ ] Verify IP address is captured correctly
- [ ] Check audit log viewer UI shows the entry
- [ ] Attempt to modify audit log (should fail)
- [ ] Attempt to delete audit log (should fail)
- [ ] Filter audit logs by action type
- [ ] Export audit logs to CSV and verify data

---

## Database Schema

### NhatKyHeThong Table

**Table:** `NhatKyHeThong` (Audit Log)

```sql
CREATE TABLE IF NOT EXISTS "NhatKyHeThong" (
  "MaNhatKy"   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaTaiKhoan" UUID,                                       -- Actor user ID
  "HanhDong"   TEXT,                                       -- Action type (e.g., 'BULK_SUBMISSION_CREATE')
  "Bang"       TEXT,                                       -- Table affected (e.g., 'GhiNhanHoatDong')
  "KhoaChinh"  TEXT,                                       -- Primary key of affected row (null for bulk)
  "NoiDung"    JSONB,                                      -- Detailed metadata (flexible structure)
  "ThoiGian"   TIMESTAMPTZ NOT NULL DEFAULT now(),        -- Timestamp (auto-generated)
  "DiaChiIP"   TEXT,                                       -- Client IP address
  CONSTRAINT fk_nk_taikhoan FOREIGN KEY ("MaTaiKhoan")
    REFERENCES "TaiKhoan" ("MaTaiKhoan")
    ON UPDATE CASCADE
    ON DELETE SET NULL
);
```

### Sample NoiDung Structure for Bulk Create

```json
{
  "activityId": "uuid-123",
  "activityName": "COVID-19 Safety Training - Dec 2025",
  "cohortMode": "all",
  "cohortFilters": {
    "trangThai": "DangLamViec",
    "chucDanh": "Bác sĩ"
  },
  "totalSelected": 50,
  "totalExcluded": 3,
  "created": 45,
  "skipped": 2,
  "failed": 0,
  "actorRole": "DonVi",
  "unitId": "unit-uuid-789",
  "samplePractitionerIds": [
    "practitioner-uuid-1",
    "practitioner-uuid-2",
    "practitioner-uuid-3",
    "practitioner-uuid-4",
    "practitioner-uuid-5",
    "practitioner-uuid-6",
    "practitioner-uuid-7",
    "practitioner-uuid-8",
    "practitioner-uuid-9",
    "practitioner-uuid-10"
  ]
}
```

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/types/audit-actions.ts` | **Create** | Define audit action constants |
| `src/app/api/submissions/bulk-create/route.ts` | **Modify** | Update audit logging to use `logAction` helper |
| `tests/lib/db/audit-logging.test.ts` | **Create** | Unit tests for audit logging |
| `tests/api/submissions/bulk-create.test.ts` | **Modify** | Add integration test for audit log creation |
| `openspec/changes/refactor-cohort-bulk-submission/tasks.md` | **Modify** | Mark task 6.1 items as completed |

---

## Implementation Checklist

### Phase 1: Setup (30 minutes)

- [ ] Create `src/types/audit-actions.ts` with constants
- [ ] Add IP extraction utility function
- [ ] Write unit test scaffolding

### Phase 2: Core Implementation (45 minutes)

- [ ] Update `bulk-create/route.ts` to import constants
- [ ] Extract IP address in POST handler
- [ ] Replace `nhatKyHeThongRepo.create()` with `logAction()`
- [ ] Add sample practitioner IDs (first 10)
- [ ] Add unitId to audit log details
- [ ] Add IP address parameter

### Phase 3: Testing (1 hour)

- [ ] Write unit tests for audit logging
- [ ] Write integration tests for API
- [ ] Manual test bulk enrollment flow
- [ ] Verify audit log in database
- [ ] Test audit log viewer UI

### Phase 4: Documentation (20 minutes)

- [ ] Update tasks.md to mark items complete
- [ ] Add inline code comments
- [ ] Update this document with actual results

**Total Estimated Time:** 2.5 - 3 hours

---

## Success Criteria

✅ Task is complete when:

1. **Constant defined:** `AUDIT_ACTIONS.BULK_SUBMISSION_CREATE` exists and is used
2. **Helper method used:** `logAction()` is called instead of `create()`
3. **Sample IDs stored:** First 10 practitioner IDs are in audit log
4. **Complete metadata:** unitId, actorRole, IP address all captured
5. **Tests pass:** Unit and integration tests verify audit logging
6. **Manual verification:** Audit log appears correctly in database and UI

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **IP address extraction fails** | Low | Use null if IP cannot be determined (already nullable) |
| **JSONB size grows too large** | Low | Limit sample IDs to 10 (prevents bloat) |
| **Breaking existing audit logs** | Medium | New fields are additive, backward compatible |
| **Performance impact** | Low | Audit log is async, doesn't block response |

---

## Future Enhancements

### Phase 2: Enhanced Audit Logging

1. **Audit log filtering UI:** Filter by action type, user, date range
2. **Audit log export:** CSV/JSON export for compliance reporting
3. **Audit log analytics:** Dashboard showing audit trends
4. **Audit log retention:** Archive old logs after X months

### Phase 3: Advanced Features

1. **Audit log diff viewer:** Show before/after for updates
2. **Audit log replay:** Recreate system state from audit trail
3. **Audit log alerts:** Notify admins of suspicious actions
4. **Audit log compliance reports:** Pre-built reports for auditors

---

## References

- **Task Definition:** `openspec/changes/refactor-cohort-bulk-submission/tasks.md:117-124`
- **Design Document:** `openspec/changes/refactor-cohort-bulk-submission/design.md:695-718`
- **Proposal Document:** `openspec/changes/refactor-cohort-bulk-submission/proposal.md:169-185`
- **Repository Implementation:** `src/lib/db/repositories.ts:1822-1926`
- **Current API Implementation:** `src/app/api/submissions/bulk-create/route.ts:214-232`
- **Database Schema:** `.serena/memories/v_1_init_schema.sql:135-145`

---

**Document Version:** 1.0
**Last Updated:** 2025-11-08
**Status:** Ready for Implementation
**Next Review:** After implementation completion
