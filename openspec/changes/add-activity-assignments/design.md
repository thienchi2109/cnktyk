# Design: Activity Assignments (Mandatory Training)

## Context

Healthcare units need to assign mandatory CPD activities (e.g., COVID-19 training, annual certifications) to groups of practitioners and track completion. Currently, the system supports only voluntary, practitioner-initiated submissions. This design adds a complementary workflow where admins **assign** activities proactively, creating accountability and compliance tracking.

### Key Stakeholders
- **DonVi Admins**: Assign mandatory training, track compliance
- **Practitioners (NguoiHanhNghe)**: Receive assignments, complete required activities
- **SoYTe**: System-wide mandatory training assignments, cross-unit reporting
- **Auditors**: Verify compliance with training requirements

### Constraints
- Must integrate with existing catalog (`DanhMucHoatDong`) and submissions (`GhiNhanHoatDong`)
- Reuse Cohort Builder component for practitioner selection
- Preserve tenant isolation (DonVi cannot assign to other units)
- Support 500+ bulk assignments without performance degradation

---

## Goals / Non-Goals

### Goals
- ✅ Enable bulk assignment of catalog activities to practitioner cohorts
- ✅ Track assignment status (not started, in progress, completed, overdue)
- ✅ Link assignments to submissions for credit tracking
- ✅ Provide admin dashboard for compliance monitoring
- ✅ Automated reminders for upcoming/overdue deadlines
- ✅ Reuse existing Cohort Builder UI for selection
- ✅ Support optional deadlines (flexibility for different training types)

### Non-Goals
- ❌ Recurring assignments (annual cycles) → Future enhancement
- ❌ Training calendar/scheduling integration → Separate feature
- ❌ Auto-assignment rules (e.g., "All nurses get X") → Future enhancement
- ❌ Completion certificates (PDF generation) → Separate feature
- ❌ External training provider integration (SCORM) → Different domain
- ❌ Points/gamification → Not aligned with compliance focus

---

## Data Model

### New Table: `GanHoatDong` (Activity Assignments)

```sql
CREATE TABLE "GanHoatDong" (
  "MaGan" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "MaDanhMuc" UUID NOT NULL REFERENCES "DanhMucHoatDong"("MaDanhMuc") ON DELETE RESTRICT,
  "MaNhanVien" UUID NOT NULL REFERENCES "NhanVien"("MaNhanVien") ON DELETE CASCADE,
  "MaDonVi" UUID NOT NULL REFERENCES "DonVi"("MaDonVi") ON DELETE CASCADE,
  "NgayGan" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "HanHoanThanh" DATE NULL,
  "TrangThai" assignment_status NOT NULL DEFAULT 'ChuaHoanThanh',
  "NguoiGan" UUID NOT NULL REFERENCES "TaiKhoan"("MaTaiKhoan") ON DELETE SET NULL,
  "GhiChu" TEXT NULL,
  "MaGhiNhan" UUID NULL REFERENCES "GhiNhanHoatDong"("MaGhiNhan") ON DELETE SET NULL,
  CONSTRAINT unique_assignment_per_practitioner UNIQUE ("MaDanhMuc", "MaNhanVien")
);

CREATE TYPE assignment_status AS ENUM (
  'ChuaHoanThanh',  -- Not started (no submission yet)
  'DangThucHien',   -- In progress (submission created, pending approval)
  'ChoXacNhan',     -- Submitted (alias for DangThucHien when TrangThaiDuyet = 'ChoDuyet')
  'DaHoanThanh',    -- Completed (submission approved, TrangThaiDuyet = 'DaDuyet')
  'QuaHan'          -- Overdue (computed: HanHoanThanh < now() AND TrangThai != 'DaHoanThanh')
);

-- Indexes for performance
CREATE INDEX idx_gan_hoat_dong_donvi_status 
  ON "GanHoatDong" ("MaDonVi", "TrangThai");

CREATE INDEX idx_gan_hoat_dong_nhanvien 
  ON "GanHoatDong" ("MaNhanVien", "TrangThai", "HanHoanThanh");

CREATE INDEX idx_gan_hoat_dong_danhmuc 
  ON "GanHoatDong" ("MaDanhMuc");

CREATE INDEX idx_gan_hoat_dong_deadline 
  ON "GanHoatDong" ("HanHoanThanh") WHERE "TrangThai" != 'DaHoanThanh';
```

### Updated Table: `GhiNhanHoatDong`

```sql
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN "MaGan" UUID NULL REFERENCES "GanHoatDong"("MaGan") ON DELETE SET NULL;

CREATE INDEX idx_ghi_nhan_hoat_dong_magan 
  ON "GhiNhanHoatDong" ("MaGan");
```

### Design Decisions

#### 1. Bidirectional FK vs. One-Way Link
**Decision**: Bidirectional FKs (`GanHoatDong.MaGhiNhan` ↔ `GhiNhanHoatDong.MaGan`)

**Rationale**:
- From assignment: quickly find linked submission for status display
- From submission: identify which assignment is being fulfilled
- Enables cascade updates (submission approval → assignment completion)

**Alternatives Considered**:
- One-way FK only (`GhiNhanHoatDong.MaGan`): Simpler, but requires JOIN to find submission from assignment
- Junction table: Over-engineered for 1:1 relationship

#### 2. Status Enum vs. Computed Status
**Decision**: Store `TrangThai` enum, compute `QuaHan` in queries

**Rationale**:
- Storing status enables fast filtering without date comparisons
- `QuaHan` is ephemeral (today's "pending" is tomorrow's "overdue")
- Computed status avoids cron job to update stale rows

**SQL for Computed Status**:
```sql
SELECT *,
  CASE 
    WHEN "HanHoanThanh" < CURRENT_DATE AND "TrangThai" != 'DaHoanThanh' THEN 'QuaHan'
    ELSE "TrangThai"::text
  END AS effective_status
FROM "GanHoatDong";
```

**Alternatives Considered**:
- Cron job to update overdue rows: Creates write load, stale during day
- Only computed status (no enum): Slower queries, complex filtering

#### 3. Unique Constraint Scope
**Decision**: `UNIQUE(MaDanhMuc, MaNhanVien)` allows same practitioner multiple assignments of different activities

**Rationale**:
- Prevents duplicate "COVID Training" assignment to same person
- Allows "COVID Training" + "Fire Safety" to same person
- Simplifies idempotent bulk operations

**Alternatives Considered**:
- `UNIQUE(MaNhanVien)`: Too restrictive, practitioners can have multiple assignments
- No constraint: Allows duplicates, creates confusion

#### 4. Cascade Behavior
**Decision**:
- `ON DELETE RESTRICT` for `MaDanhMuc`: Prevent catalog deletion if active assignments exist
- `ON DELETE CASCADE` for `MaNhanVien`: Delete assignments if practitioner removed
- `ON DELETE SET NULL` for `MaGhiNhan`: Preserve assignment if submission deleted

**Rationale**:
- Catalog protection: Ensure assignment integrity
- Practitioner cleanup: Automatic garbage collection
- Submission resilience: Assignment persists for audit trail

---

## API Design

### POST `/api/assignments/bulk`
**Purpose**: Create multiple assignments from cohort selection

**Request**:
```typescript
{
  MaDanhMuc: string; // UUID of catalog activity
  cohort: {
    mode: 'all' | 'manual';
    selectedIds: string[]; // manual mode
    excludedIds: string[]; // all mode
    filters: {
      search?: string;
      trangThai?: string;
      chucDanh?: string;
      khoaPhong?: string;
    };
  };
  HanHoanThanh?: string; // ISO date, optional
  GhiChu?: string; // optional admin notes
}
```

**Response**:
```typescript
{
  created: number;
  skipped: number; // duplicates
  duplicates: string[]; // practitioner IDs already assigned
  assignmentIds: string[];
  message: string;
}
```

**Error Cases**:
- 400: Invalid catalog ID, cohort resolves to 0 practitioners
- 403: DonVi attempting to assign to other unit
- 404: Catalog activity not found
- 500: Database transaction failure

**Implementation**:
1. Resolve cohort to practitioner IDs (reuse cohort resolver)
2. Validate all practitioners belong to user's unit (DonVi) or user is SoYTe
3. Filter out duplicates using `UNIQUE(MaDanhMuc, MaNhanVien)`
4. Bulk INSERT with `ON CONFLICT DO NOTHING`
5. Trigger notifications for newly created assignments
6. Audit log bulk operation with cohort metadata

### GET `/api/assignments/my-assignments`
**Purpose**: List practitioner's assigned activities

**Query Params**:
```typescript
?status=all|pending|completed|overdue
&sort=deadline|assigned
&limit=20
&page=1
```

**Response**:
```typescript
{
  assignments: Array<{
    MaGan: string;
    activity: {
      MaDanhMuc: string;
      TenDanhMuc: string;
      LoaiHoatDong: string;
      YeuCauMinhChung: boolean;
    };
    NgayGan: string;
    HanHoanThanh: string | null;
    TrangThai: string;
    effectiveStatus: 'ChuaHoanThanh' | 'DangThucHien' | 'DaHoanThanh' | 'QuaHan';
    daysRemaining: number | null;
    submission: {
      MaGhiNhan: string;
      TrangThaiDuyet: string;
    } | null;
  }>;
  stats: {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
  };
  pagination: { page, limit, total, totalPages };
}
```

**Implementation**:
- JOIN `GanHoatDong` with `DanhMucHoatDong` and `GhiNhanHoatDong`
- Compute `effectiveStatus` and `daysRemaining` in SQL
- Filter by `MaNhanVien = practitionerId` (derived from auth)
- Apply status filter, sort by deadline or assigned date

### GET `/api/assignments/tracking`
**Purpose**: Admin dashboard for compliance monitoring

**Query Params**:
```typescript
?catalogId=uuid // filter by activity
&unitId=uuid // filter by unit (SoYTe only)
&status=all|pending|completed|overdue
&deadline=upcoming|overdue|all
&limit=50
&page=1
```

**Response**:
```typescript
{
  assignments: Array<{
    MaGan: string;
    practitioner: {
      MaNhanVien: string;
      HoVaTen: string;
      ChucDanh: string;
    };
    activity: {
      TenDanhMuc: string;
    };
    NgayGan: string;
    HanHoanThanh: string | null;
    TrangThai: string;
    effectiveStatus: string;
  }>;
  stats: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
    overdue: number;
    completionRate: number; // percentage
  };
  byCatalog: Array<{
    MaDanhMuc: string;
    TenDanhMuc: string;
    total: number;
    completed: number;
    completionRate: number;
  }>;
  pagination: { page, limit, total, totalPages };
}
```

**Implementation**:
- JOIN `GanHoatDong` with `NhanVien`, `DanhMucHoatDong`
- Enforce tenant scope: `WHERE GanHoatDong.MaDonVi = user.unitId` (DonVi)
- Aggregate stats using window functions
- Group by catalog for breakdown stats

---

## State Machine

### Assignment Lifecycle

```
┌─────────────────┐
│  ChuaHoanThanh  │ ← Initial state on creation
└────────┬────────┘
         │
         │ Practitioner creates submission
         ↓
┌─────────────────┐
│  DangThucHien   │ ← Submission exists, pending approval
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌────────┐  ┌──────────────┐
│ Reject │  │ DaHoanThanh  │ ← Submission approved
└───┬────┘  └──────────────┘
    │            (Terminal state)
    ↓
┌─────────────────┐
│  ChuaHoanThanh  │ ← Reset on rejection
└────────┬────────┘
         │
         │ Deadline passes without completion
         ↓
    ┌──────────┐
    │  QuaHan  │ ← Computed, not stored
    └──────────┘
```

### Transition Rules

| From            | To             | Trigger                                  | Side Effects                     |
|-----------------|----------------|------------------------------------------|----------------------------------|
| ChuaHoanThanh   | DangThucHien   | Submission created with `MaGan`          | Set `MaGhiNhan`, notification    |
| DangThucHien    | DaHoanThanh    | Submission approved                      | Credits counted, notification    |
| DangThucHien    | ChuaHoanThanh  | Submission rejected                      | Clear `MaGhiNhan`, notification  |
| ChuaHoanThanh   | QuaHan         | `HanHoanThanh < now()` (computed)        | Trigger overdue notification     |
| DangThucHien    | QuaHan         | `HanHoanThanh < now()` (computed)        | Escalation notification          |

### Status Query Helpers

```typescript
// Repository method
async findWithEffectiveStatus(filters) {
  return db.query(`
    SELECT 
      *,
      CASE 
        WHEN "HanHoanThanh" IS NOT NULL 
             AND "HanHoanThanh" < CURRENT_DATE 
             AND "TrangThai" != 'DaHoanThanh' 
        THEN 'QuaHan'
        ELSE "TrangThai"::text
      END AS effective_status,
      CASE 
        WHEN "HanHoanThanh" IS NOT NULL 
        THEN "HanHoanThanh" - CURRENT_DATE
        ELSE NULL
      END AS days_remaining
    FROM "GanHoatDong"
    WHERE ...
  `);
}
```

---

## UI/UX Flows

### Admin: Create Bulk Assignment

```
Activities Page → Select catalog entry → "Assign to Practitioners" button
  ↓
Assignment Wizard (Sheet/Modal)
  ↓
Step 1: Confirm Activity
  [✓] COVID-19 Safety Training
  [Next]
  ↓
Step 2: Select Practitioners (Cohort Builder)
  Filters: Department, Title, Status
  [☑] Select all across pages (45 matches)
  Exclusions: [Alice] [Bob]
  [Next: 43 selected]
  ↓
Step 3: Set Details
  Deadline: [📅 2025-12-31] (optional)
  Notes: [Required for all clinical staff] (optional)
  [Next]
  ↓
Step 4: Preview
  Will create: 40 assignments
  Skipped (duplicates): 3
  Sample: Alice, Bob, Charlie...
  [Confirm] [Back]
  ↓
POST /api/assignments/bulk
  ↓
Success: "Assigned to 40 practitioners"
  [View Tracking Dashboard] [Done]
```

### Practitioner: Fulfill Assignment

```
Navigation → "My Assignments" (badge shows 3 pending)
  ↓
My Assignments Page
  Filters: [Status: Pending ▼] [Sort: Deadline ▲]
  ┌──────────────────────────────────────┐
  │ 🔴 COVID-19 Training                 │
  │ Due: 2025-12-31 (28 days)            │
  │ [Start Assignment]                   │
  ├──────────────────────────────────────┤
  │ 🟢 Fire Safety (Completed)           │
  └──────────────────────────────────────┘
  ↓
Click "Start Assignment"
  ↓
Submission Form
  Banner: 📋 Fulfilling assignment: COVID-19 Training • Deadline: Dec 31
  Activity: [COVID-19 Training] (locked)
  Upload Evidence: [Choose File]
  ...
  [Submit]
  ↓
POST /api/submissions { MaGan: "uuid", ... }
  ↓
Success: "Assignment marked as in progress"
Redirect to /my-assignments
  ↓
Status updated to "In Progress"
```

### Admin: Track Compliance

```
Navigation → "Assignments" → "Tracking"
  ↓
Tracking Dashboard
  ┌─────────────────────────────────────┐
  │ 📊 Completion Stats                 │
  │ Total: 120  Completed: 78 (65%)     │
  │ In Progress: 25  Overdue: 17        │
  └─────────────────────────────────────┘
  
  Filters: [Activity: All ▼] [Status: All ▼] [Deadline: Upcoming ▼]
  
  ┌──────────────────────────────────────────────────────────┐
  │ Practitioner  │ Activity          │ Deadline   │ Status  │
  ├──────────────────────────────────────────────────────────┤
  │ Alice Nguyen  │ COVID Training    │ Dec 31     │ 🔴 Overdue │
  │ Bob Tran      │ Fire Safety       │ Jan 15     │ 🟡 Pending │
  │ ...           │ ...               │ ...        │ ...     │
  └──────────────────────────────────────────────────────────┘
  
  [☑ Select Overdue (17)] [Send Reminders] [Export CSV]
  ↓
Click "Send Reminders"
  ↓
POST /api/assignments/bulk-remind { assignmentIds: [...] }
  ↓
Success: "Sent 17 reminders"
```

---

## Performance Considerations

### Query Optimization

1. **Bulk Create**: Use `INSERT ... ON CONFLICT DO NOTHING` to skip duplicates atomically
   ```sql
   INSERT INTO "GanHoatDong" (...)
   VALUES (...), (...), ... -- 500 rows
   ON CONFLICT (MaDanhMuc, MaNhanVien) DO NOTHING
   RETURNING "MaGan";
   ```

2. **Tracking Dashboard**: Use CTE and window functions to avoid N+1 queries
   ```sql
   WITH stats AS (
     SELECT 
       COUNT(*) FILTER (WHERE "TrangThai" = 'DaHoanThanh') AS completed,
       COUNT(*) FILTER (WHERE "TrangThai" = 'ChuaHoanThanh') AS not_started,
       ...
     FROM "GanHoatDong"
     WHERE "MaDonVi" = $1
   )
   SELECT g.*, s.*, n."HoVaTen", dm."TenDanhMuc"
   FROM "GanHoatDong" g
   CROSS JOIN stats s
   JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
   JOIN "DanhMucHoatDong" dm ON g."MaDanhMuc" = dm."MaDanhMuc"
   WHERE g."MaDonVi" = $1
   LIMIT 50 OFFSET 0;
   ```

3. **Deadline Queries**: Partial index for active assignments only
   ```sql
   CREATE INDEX idx_gan_hoat_dong_deadline 
     ON "GanHoatDong" ("HanHoanThanh") 
     WHERE "TrangThai" != 'DaHoanThanh';
   ```

### Caching Strategy

- **Practitioner assignment count**: Cache in Redis with 5-minute TTL
  - Key: `assignment:count:{practitionerId}:{status}`
  - Invalidate on assignment create/update

- **Catalog assignment stats**: Cache for 1 hour
  - Key: `catalog:assignments:{catalogId}`
  - Invalidate on bulk create

### Notification Batching

- Queue notification events (don't send in-band)
- Batch process 100 notifications per job
- Retry failed notifications with exponential backoff

---

## Security & Privacy

### Tenancy Enforcement

```typescript
// Repository guard
async createBulkAssignments(...) {
  // Verify all practitioners belong to user's unit
  const practitionerUnits = await db.query(`
    SELECT DISTINCT "MaDonVi" 
    FROM "NhanVien" 
    WHERE "MaNhanVien" = ANY($1)
  `, [practitionerIds]);
  
  if (practitionerUnits.some(u => u.MaDonVi !== unitId)) {
    throw new ForbiddenError('Cannot assign to practitioners from other units');
  }
  
  // Proceed with insert...
}
```

### Audit Trail

Log all bulk assignment operations:
```typescript
await nhatKyHeThongRepo.log({
  MaTaiKhoan: assignerId,
  HanhDong: 'GAN_HOAT_DONG_HANG_LOAT',
  ChiTiet: {
    MaDanhMuc: catalogId,
    cohort: { mode, filters, selectedCount, excludedCount },
    created: resultCount,
    skipped: skipCount,
    deadline: deadline,
  },
});
```

### Access Control Matrix

| Role           | Bulk Create | View All | View Own | Remind | Delete |
|----------------|-------------|----------|----------|--------|--------|
| SoYTe          | ✓ Global    | ✓        | N/A      | ✓      | ✓      |
| DonVi          | ✓ Unit      | ✓ Unit   | N/A      | ✓ Unit | ✓ Unit |
| NguoiHanhNghe  | ✗           | ✗        | ✓        | ✗      | ✗      |
| Auditor        | ✗           | ✓ Readonly | ✗      | ✗      | ✗      |

---

## Migration Plan

### Forward Migration

```sql
BEGIN;

-- Step 1: Create enum
CREATE TYPE assignment_status AS ENUM (
  'ChuaHoanThanh', 'DangThucHien', 'ChoXacNhan', 'DaHoanThanh', 'QuaHan'
);

-- Step 2: Create table
CREATE TABLE "GanHoatDong" (
  -- (full schema as above)
);

-- Step 3: Add FK to submissions
ALTER TABLE "GhiNhanHoatDong"
  ADD COLUMN "MaGan" UUID NULL 
  REFERENCES "GanHoatDong"("MaGan") ON DELETE SET NULL;

-- Step 4: Create indexes
-- (as above)

COMMIT;
```

### Rollback Migration

```sql
BEGIN;

ALTER TABLE "GhiNhanHoatDong" DROP COLUMN "MaGan";
DROP TABLE "GanHoatDong";
DROP TYPE assignment_status;

COMMIT;
```

### Data Migration (if needed)

No historical data migration required. Feature starts clean slate.

---

## Risks & Mitigations

| Risk                          | Impact | Probability | Mitigation                                                                 |
|-------------------------------|--------|-------------|---------------------------------------------------------------------------|
| Practitioners ignore assignments | High   | Medium      | Automated reminders, deadline tracking, escalation to supervisors         |
| Duplicate assignments (bugs) | Medium | Low         | UNIQUE constraint, idempotent API, integration tests                      |
| Performance degradation      | Medium | Low         | Indexes, pagination, query optimization, load testing                     |
| Notification spam            | Low    | Medium      | Configurable frequency, digest mode, opt-out for completed assignments   |
| Cohort filter bugs           | High   | Low         | Reuse tested component, preview step, dry-run validation                  |
| Timezone confusion           | Low    | Medium      | Store UTC, display local, clear deadline time (e.g., end of day)         |

---

## Alternatives Considered

### Alternative 1: Assignments as Submission Type
**Idea**: Add `LoaiGhiNhan: 'TuNguyen' | 'GanBoi'` field to `GhiNhanHoatDong`

**Pros**: No new table, simpler schema  
**Cons**: Mixes concerns, cannot represent "assigned but not started", complex queries

**Decision**: Rejected. Assignments and submissions are distinct concepts with different lifecycles.

### Alternative 2: Event-Sourced Assignments
**Idea**: Store assignment events (created, started, completed) instead of state

**Pros**: Complete audit trail, time-travel queries  
**Cons**: Complex queries, overkill for simple state machine

**Decision**: Rejected. Current state + audit log sufficient.

### Alternative 3: Assignment as Submission Metadata
**Idea**: Add `MetaDuLieu JSONB` column to `GhiNhanHoatDong` with assignment info

**Pros**: No new table, flexible schema  
**Cons**: Cannot represent unstarted assignments, no referential integrity, poor queryability

**Decision**: Rejected. Assignments need first-class representation.

---

## Open Questions

1. **Q**: Should SoYTe be able to assign catalog entries created by other units?  
   **A**: **Phase 1**: No, only global + own unit catalog. **Future**: Add permission.

2. **Q**: Can practitioners see who else was assigned the same activity?  
   **A**: **No**. Privacy concern. Only show own assignments.

3. **Q**: Should we support partial completion (e.g., 50% done)?  
   **A**: **Phase 1**: No, binary complete/incomplete. **Future**: Progress percentage.

4. **Q**: What if deadline is in the past at assignment time?  
   **A**: Allow, but show warning. Use case: backdating for records.

5. **Q**: Can practitioners un-link a submission from an assignment?  
   **A**: **No**. Once linked, permanent. Admin can delete assignment to reset.

---

## Success Criteria

### Technical
- ✅ Bulk create 500 assignments in <3 seconds
- ✅ Dashboard renders 1000 assignments in <2 seconds
- ✅ Zero UNIQUE constraint violations in production
- ✅ 100% uptime during rollout
- ✅ <1% error rate on assignment APIs

### Business
- ✅ 80% of units use feature within 3 months
- ✅ Admin time reduced from 2 hours → 15 minutes per cycle
- ✅ Compliance rate increases from 65% → 85%
- ✅ Zero "I didn't know" incidents

### User Satisfaction
- ✅ 4/5+ satisfaction rating (post-pilot survey)
- ✅ <5% support tickets related to assignments
- ✅ 70% of reminders lead to submission within 48 hours
