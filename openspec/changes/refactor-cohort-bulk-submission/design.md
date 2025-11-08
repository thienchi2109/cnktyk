# Design: Refactor Cohort Builder for Bulk Submission Creation

## Context

The cohort builder currently exists but lacks integration with the activity catalog and submission creation workflow. This design adds bulk submission creation capability to enable unit admins to enroll practitioners in mandatory training activities efficiently.

### Key Stakeholders

- **DonVi Admins:** Primary users - enroll practitioners in mandatory training
- **Practitioners (NguoiHanhNghe):** Recipients - receive bulk-created submissions to complete
- **SoYTe:** System admins - bulk-enroll across units for system-wide training
- **Auditors:** Review enrollment audit trail for compliance

### Constraints

- Reuse existing cohort builder component (minimal UI changes)
- No database schema changes (use existing GhiNhanHoatDong table)
- Maintain backward compatibility with individual submission flow
- Support 500+ bulk submissions without performance degradation
- Must work with existing DanhMucHoatDong catalog

---

## Goals / Non-Goals

### Goals

- ✅ Enable bulk submission creation from cohort selection
- ✅ Integrate activity catalog selection into cohort builder
- ✅ Prevent duplicate submissions for same practitioner + activity
- ✅ Respect evidence requirements (YeuCauMinhChung)
- ✅ Audit trail for bulk enrollment operations
- ✅ Maintain tenant isolation (DonVi cannot cross units)

### Non-Goals

- ❌ Notification system (separate feature)
- ❌ Assignment entity with deadlines (future: add-activity-assignments)
- ❌ Automated approval workflow
- ❌ Recurring enrollment
- ❌ Training session management

---

## Data Model

### No Schema Changes Required

Existing `GhiNhanHoatDong` table supports bulk creation:

```sql
CREATE TABLE "GhiNhanHoatDong" (
  "MaGhiNhan" UUID PRIMARY KEY,
  "MaNhanVien" UUID NOT NULL REFERENCES "NhanVien",
  "MaDanhMuc" UUID NULL REFERENCES "DanhMucHoatDong", -- ✓ Link to catalog
  "TenHoatDong" TEXT NOT NULL,
  "TrangThaiDuyet" approval_status DEFAULT 'ChoDuyet', -- ✓ Status control
  "FileMinhChungUrl" TEXT NULL, -- ✓ Evidence uploaded later
  "NguoiNhap" UUID NOT NULL REFERENCES "TaiKhoan", -- ✓ Admin who created
  "NgayGhiNhan" TIMESTAMPTZ DEFAULT now(),
  ...
);
```

### Duplicate Prevention Strategy

**Hybrid Approach (Chosen)**

1. **Pre-flight query** to surface duplicates for the response payload
```typescript
const existing = await db.query(`
  SELECT "MaNhanVien"
  FROM "GhiNhanHoatDong"
  WHERE "MaDanhMuc" = $1
    AND "MaNhanVien" = ANY($2)
`, [catalogId, practitionerIds]);

const duplicateIds = new Set(existing.map(row => row.MaNhanVien));
const candidates = practitionerIds.filter(id => !duplicateIds.has(id));
```

2. **Database enforcement** using `ON CONFLICT DO NOTHING` (paired with a partial unique index) to guarantee idempotency even under concurrent requests
```sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_submission_per_activity
  ON "GhiNhanHoatDong" ("MaNhanVien", "MaDanhMuc")
  WHERE "MaDanhMuc" IS NOT NULL;
```

**Why:**
- ✅ Guarantees we never create duplicate submissions even if a second request races past the pre-flight query
- ✅ Still returns meaningful duplicate reporting via the pre-flight query
- ⚠️ Requires migration + repository update to apply `ON CONFLICT DO NOTHING RETURNING *`

**Fallback:** If the migration cannot land immediately, keep the partial unique index on the backlog but still run `ON CONFLICT DO NOTHING` which protects against duplicates within the same deployment window.

---

## API Design

### POST `/api/submissions/bulk-create`

#### Request Body

```typescript
interface BulkSubmissionRequest {
  // Required: Activity catalog entry
  MaDanhMuc: string; // UUID

  // Required: Cohort selection (from cohort builder)
  cohort: {
    mode: 'all' | 'manual';
    selectedIds: string[]; // Used in manual mode
    excludedIds: string[]; // Used in all mode
    filters: {
      search?: string;
      trangThai?: 'DangLamViec' | 'DaNghi' | 'TamHoan' | 'all';
      chucDanh?: string;
      khoaPhong?: string;
    };
    totalFiltered: number;
  };

  // Optional: Common values for all submissions
  NgayBatDau?: string; // ISO date
  NgayKetThuc?: string; // ISO date
  DonViToChuc?: string;
}
```

#### Response

```typescript
interface BulkSubmissionResponse {
  success: boolean;
  created: number; // Successfully created
  skipped: number; // Duplicates
  failed: number; // Errors
  details: {
    submissionIds: string[]; // Created submission IDs
    duplicates: string[]; // Practitioner IDs with existing submissions
    errors: Array<{
      practitionerId: string;
      error: string;
    }>;
  };
  message: string;
}
```

#### Implementation Flow

```typescript
export async function POST(request: NextRequest) {
  // 1. Authentication & Authorization
  const user = await getCurrentUser();
  if (!['DonVi', 'SoYTe'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Validate Request
  const body = await request.json();
  const { MaDanhMuc, cohort, NgayBatDau, NgayKetThuc, DonViToChuc } = body;

  // 3. Fetch & Validate Activity Catalog
  const activity = await danhMucHoatDongRepo.findById(MaDanhMuc);
  if (!activity) {
    return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
  }
  if (activity.TrangThai !== 'Active') {
    return NextResponse.json({ error: 'Activity not active' }, { status: 400 });
  }
  if (user.role === 'DonVi') {
    const isGlobal = activity.MaDonVi === null;
    if (!isGlobal && activity.MaDonVi !== user.unitId) {
      return NextResponse.json({ error: 'Activity not owned by unit' }, { status: 403 });
    }
  }

  // 4. Resolve Cohort to Practitioner IDs
  const practitionerIds = await resolveCohort(cohort, user);

  // 5. Tenant Validation
  if (user.role === 'DonVi') {
    const invalidIds = await validatePractitionersTenancy(
      practitionerIds,
      user.unitId
    );
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Cannot create submissions for other units' },
        { status: 403 }
      );
    }
  }

  // 6. Duplicate Detection
  const existingSubmissions = await db.query(`
    SELECT "MaNhanVien"
    FROM "GhiNhanHoatDong"
    WHERE "MaDanhMuc" = $1 AND "MaNhanVien" = ANY($2)
  `, [MaDanhMuc, practitionerIds]);

  const duplicateIds = new Set(existingSubmissions.map(r => r.MaNhanVien));
  const candidateIds = practitionerIds.filter(id => !duplicateIds.has(id));

  // 7. Determine Initial Status
  const initialStatus = activity.YeuCauMinhChung ? 'Nhap' : 'ChoDuyet';

  // 8. Bulk Insert
  const submissions = candidateIds.map(practitionerId => ({
    MaNhanVien: practitionerId,
    MaDanhMuc: MaDanhMuc,
    TenHoatDong: activity.TenDanhMuc,
    TrangThaiDuyet: initialStatus,
    NguoiNhap: user.id,
    NgayBatDau: NgayBatDau ? new Date(NgayBatDau) : null,
    NgayKetThuc: NgayKetThuc ? new Date(NgayKetThuc) : null,
    DonViToChuc: DonViToChuc || null,
    SoGioTinChiQuyDoi: activity.TyLeQuyDoi ?? 0,
    HinhThucCapNhatKienThucYKhoa: activity.LoaiHoatDong, // align with catalog defaults
    FileMinhChungUrl: null, // Evidence uploaded later
  }));

  const { inserted, conflicts } = await ghiNhanHoatDongRepo.bulkCreate(submissions);
  conflicts.forEach(id => duplicateIds.add(id));

  // 9. Audit Log
  await nhatKyHeThongRepo.logAction(
    user.id,
    'BULK_SUBMISSION_CREATE',
    MaDanhMuc,
    {
      activityName: activity.TenDanhMuc,
      cohortMode: cohort.mode,
      cohortFilters: cohort.filters,
      totalSelected: practitionerIds.length,
      totalExcluded: cohort.excludedIds?.length || 0,
      created: inserted.length,
      skipped: duplicateIds.size,
      actorRole: user.role,
    }
  );

  // 10. Response
  return NextResponse.json({
    success: true,
    created: inserted.length,
    skipped: duplicateIds.size,
    failed: 0,
    details: {
      submissionIds: inserted.map(s => s.MaGhiNhan),
      duplicates: Array.from(duplicateIds),
      errors: [],
    },
    message: `Đã tạo ${inserted.length} bản ghi, bỏ qua ${duplicateIds.size} bản ghi trùng`,
  });
}
```

### Helper Functions

#### Resolve Cohort

```typescript
async function resolveCohort(
  cohort: CohortSelection,
  user: User
): Promise<string[]> {
  const { mode, selectedIds, excludedIds, filters } = cohort;

  if (mode === 'manual') {
    return selectedIds;
  }

  // All mode: server-driven pagination to avoid trusting client-supplied totals
  const pageSize = 500;
  const allIds: string[] = [];
  let page = 1;
  while (true) {
    const batch = await nhanVienRepo.listIdsByFilters({
      unitId: user.role === 'DonVi' ? user.unitId : undefined,
      ...filters,
      page,
      limit: pageSize,
    });
    if (batch.length === 0) break;
    allIds.push(...batch.map((record) => record.MaNhanVien));
    if (batch.length < pageSize) break;
    page += 1;
  }

  return allIds.filter(id => !excludedIds.includes(id));
}
```

#### Validate Tenancy

```typescript
async function validatePractitionersTenancy(
  practitionerIds: string[],
  unitId: string
): Promise<string[]> {
  const result = await db.query(`
    SELECT "MaNhanVien"
    FROM "NhanVien"
    WHERE "MaNhanVien" = ANY($1)
      AND "MaDonVi" != $2
  `, [practitionerIds, unitId]);

  return result.map(r => r.MaNhanVien);
}
```

---

## Repository Changes

### Add `bulkCreate` Method

**File:** `src/lib/db/repositories.ts`

```typescript
class GhiNhanHoatDongRepository {
  // Existing methods...

  /**
   * Bulk create submissions (for mandatory training enrollment)
   */
  async bulkCreate(
    submissions: Array<Omit<CreateGhiNhanHoatDong, 'MaGhiNhan' | 'NgayGhiNhan'>>
  ): Promise<{ inserted: GhiNhanHoatDong[]; conflicts: string[] }> {
    if (submissions.length === 0) {
      return { inserted: [], conflicts: [] };
    }

    const columns = [
      'MaNhanVien',
      'MaDanhMuc',
      'TenHoatDong',
      'TrangThaiDuyet',
      'NguoiNhap',
      'NgayBatDau',
      'NgayKetThuc',
      'DonViToChuc',
      'SoGioTinChiQuyDoi',
      'FileMinhChungUrl',
      'HinhThucCapNhatKienThucYKhoa',
    ];

    const placeholders = submissions
      .map((_, i) => {
        const offset = i * columns.length;
        const row = columns
          .map((__, colIndex) => `$${offset + colIndex + 1}`)
          .join(', ');
        return `(${row})`;
      })
      .join(', ');

    const values = submissions.flatMap(s => [
      s.MaNhanVien,
      s.MaDanhMuc,
      s.TenHoatDong,
      s.TrangThaiDuyet,
      s.NguoiNhap,
      s.NgayBatDau,
      s.NgayKetThuc,
      s.DonViToChuc,
      s.SoGioTinChiQuyDoi,
      s.FileMinhChungUrl,
      s.HinhThucCapNhatKienThucYKhoa,
    ]);

    const result = await this.db.query<GhiNhanHoatDong>(`
      INSERT INTO "GhiNhanHoatDong" (
        ${columns.map(c => `"${c}"`).join(', ')}
      )
      VALUES ${placeholders}
      ON CONFLICT ("MaNhanVien", "MaDanhMuc")
        WHERE "MaDanhMuc" IS NOT NULL
        DO NOTHING
      RETURNING *
    `, values);

    const inserted = result.rows;
    const insertedIds = new Set(inserted.map(row => row.MaNhanVien));
    const conflicts = [...new Set(
      submissions
        .map(s => s.MaNhanVien)
        .filter(id => !insertedIds.has(id))
    )];

    return { inserted, conflicts };
  }
}
```

### Add `listIdsByFilters` Helper

**File:** `src/lib/db/repositories.ts`

```typescript
class NhanVienRepository {
  async listIdsByFilters({
    unitId,
    search,
    trangThai,
    chucDanh,
    khoaPhong,
    page,
    limit,
  }: {
    unitId?: string;
    search?: string;
    trangThai?: string;
    chucDanh?: string;
    khoaPhong?: string;
    page: number;
    limit: number;
  }): Promise<Array<Pick<NhanVien, 'MaNhanVien'>>> {
    const offset = (page - 1) * limit;
    const filters = [
      unitId ? 'nv."MaDonVi" = $1' : 'TRUE',
      trangThai && trangThai !== 'all' ? 'nv."TrangThaiLamViec" = $2' : 'TRUE',
      chucDanh ? 'nv."ChucDanh" = $3' : 'TRUE',
      khoaPhong ? 'nv."KhoaPhong" = $4' : 'TRUE',
      search ? 'UNACCENT(LOWER(nv."HoVaTen")) LIKE UNACCENT(LOWER($5))' : 'TRUE',
    ].filter(Boolean).join(' AND ');

    return this.db.query(
      `SELECT nv."MaNhanVien"
       FROM "NhanVien" nv
       WHERE ${filters}
       ORDER BY nv."HoVaTen" ASC
       LIMIT $6 OFFSET $7`,
      [unitId ?? null, trangThai ?? null, chucDanh ?? null, khoaPhong ?? null, `%${search ?? ''}%`, limit, offset]
    );
  }
}
```

---

## UI Changes

### File: `bulk-submission-wizard.tsx`

**Rename:** `bulk-assignment-wizard.tsx` → `bulk-submission-wizard.tsx`

**New Structure:**

```typescript
export function BulkSubmissionWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedActivity, setSelectedActivity] = useState<ActivityCatalogItem | null>(null);
  const [cohortSelection, setCohortSelection] = useState<CohortSelection | null>(null);
  const [preview, setPreview] = useState<BulkPreview | null>(null);

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className={step === 1 ? 'font-semibold text-medical-blue' : ''}>
          1. Chọn hoạt động
        </span>
        <span>›</span>
        <span className={step === 2 ? 'font-semibold text-medical-blue' : ''}>
          2. Chọn nhóm
        </span>
        <span>›</span>
        <span className={step === 3 ? 'font-semibold text-medical-blue' : ''}>
          3. Xác nhận
        </span>
      </div>

      {/* Step 1: Activity Selection */}
      {step === 1 && (
        <ActivitySelector
          onSelect={(activity) => {
            setSelectedActivity(activity);
            setStep(2);
          }}
        />
      )}

      {/* Step 2: Cohort Selection */}
      {step === 2 && (
        <>
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Hoạt động đã chọn</h3>
                <p className="text-sm text-gray-600">{selectedActivity?.TenDanhMuc}</p>
              </div>
              <GlassButton variant="secondary" size="sm" onClick={() => setStep(1)}>
                Thay đổi
              </GlassButton>
            </div>
          </GlassCard>

          <CohortBuilder onChange={setCohortSelection} />

          <div className="flex justify-end">
            <GlassButton
              disabled={!cohortSelection || cohortSelection.selectedCount === 0}
              onClick={() => setStep(3)}
            >
              Tiếp tục → Xác nhận
            </GlassButton>
          </div>
        </>
      )}

      {/* Step 3: Preview & Confirm */}
      {step === 3 && (
        <PreviewAndConfirm
          activity={selectedActivity!}
          cohort={cohortSelection!}
          onConfirm={handleBulkCreate}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}
```

### CohortBuilder Component Changes

**No major changes needed** - already supports cohort selection. Activity selection happens at wizard level (step 1), not inside cohort builder.

---

## Credit Calculation Logic

### Current Logic (Needs Update)

**Problem:** Current logic might calculate credits even without evidence.

### Updated Logic

**File:** `src/lib/db/repositories.ts` (or credit calculation utility)

```typescript
function calculateCredits(
  submission: GhiNhanHoatDong,
  activity: DanhMucHoatDong
): number {
  // Only calculate if approved
  if (submission.TrangThaiDuyet !== 'DaDuyet') {
    return 0;
  }

  // If evidence required, must be present
  if (activity.YeuCauMinhChung && !submission.FileMinhChungUrl) {
    return 0; // ⬅ New check
  }

  // Calculate based on activity rules
  const hours = submission.SoTiet || 0;
  const credits = hours * activity.TyLeQuyDoi;

  // Apply min/max limits
  if (activity.GioToiThieu !== null && credits < activity.GioToiThieu) {
    return 0;
  }
  if (activity.GioToiDa !== null && credits > activity.GioToiDa) {
    return activity.GioToiDa;
  }

  return credits;
}
```

---

## State Machine

### Submission Lifecycle for Bulk-Created Submissions

```
┌─────────────────┐
│  Admin creates  │
│  bulk submission│
└────────┬────────┘
         │
         ├─ YeuCauMinhChung = false
         │  ↓
         │  ┌─────────────┐
         │  │  ChoDuyet   │ ← Ready for admin approval
         │  └──────┬──────┘
         │         │
         │         ↓ Admin approves
         │  ┌─────────────┐
         │  │   DaDuyet   │ ← Credits calculated
         │  └─────────────┘
         │
         └─ YeuCauMinhChung = true
            ↓
            ┌─────────────┐
            │    Nhap     │ ← Draft, awaiting evidence
            └──────┬──────┘
                   │
                   ↓ Practitioner uploads evidence & submits
            ┌─────────────┐
            │  ChoDuyet   │ ← Ready for admin approval
            └──────┬──────┘
                   │
                   ↓ Admin approves
            ┌─────────────┐
            │   DaDuyet   │ ← Credits calculated (evidence present)
            └─────────────┘
```

### Transition Rules

| Current State | User Action                      | Next State | Side Effects                      |
|---------------|----------------------------------|------------|-----------------------------------|
| (none)        | Admin bulk create (no evidence req) | ChoDuyet   | Notification (future)            |
| (none)        | Admin bulk create (evidence req) | Nhap       | Notification (future)            |
| Nhap          | Practitioner uploads evidence    | ChoDuyet   | Update FileMinhChungUrl          |
| ChoDuyet      | Admin approves                   | DaDuyet    | Calculate credits, notification  |
| ChoDuyet      | Admin rejects                    | TuChoi     | Add GhiChuDuyet                  |
| DaDuyet       | (terminal state)                 | N/A        | Credits counted in compliance    |

---

## Performance Considerations

### Bulk Insert Optimization

**Target:** Create 500 submissions in <3 seconds

**Strategy:**
1. **Single INSERT**: Bulk insert all rows in one query (avoid N+1)
2. **Transaction**: Wrap in transaction for atomicity
3. **Batch Size**: If >500, split into batches of 500
4. **Async Job**: For >1000, queue background job with progress indicator

```typescript
async function bulkCreateWithBatching(
  submissions: CreateGhiNhanHoatDong[],
  batchSize = 500
): Promise<GhiNhanHoatDong[]> {
  const results: GhiNhanHoatDong[] = [];

  for (let i = 0; i < submissions.length; i += batchSize) {
    const batch = submissions.slice(i, i + batchSize);
    const batchResults = await ghiNhanHoatDongRepo.bulkCreate(batch);
    results.push(...batchResults);
  }

  return results;
}
```

### Duplicate Check Optimization

**Query:**
```sql
-- Use IN or ANY with index on (MaDanhMuc, MaNhanVien)
SELECT "MaNhanVien"
FROM "GhiNhanHoatDong"
WHERE "MaDanhMuc" = $1
  AND "MaNhanVien" = ANY($2)
```

**Index:**
```sql
CREATE INDEX idx_ghi_nhan_hoat_dong_danhmuc_nhanvien
  ON "GhiNhanHoatDong" ("MaDanhMuc", "MaNhanVien");
```

---

## Security & Privacy

### RBAC Enforcement

```typescript
// Middleware check
if (!['DonVi', 'SoYTe'].includes(user.role)) {
  throw new ForbiddenError('Only unit admins and SoYTe can bulk create');
}

// Tenancy check (DonVi)
if (user.role === 'DonVi') {
  const allPractitioners = await nhanVienRepo.findByIds(practitionerIds);
  const invalid = allPractitioners.filter(p => p.MaDonVi !== user.unitId);
  if (invalid.length > 0) {
    throw new ForbiddenError('Cannot create submissions for other units');
  }
}
```

### Audit Trail

**Immutable log entry:**
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
    samplePractitionerIds: ['uuid1', 'uuid2', ...],
  },
}
```

---

## Risks & Mitigations

| Risk                          | Impact | Mitigation                                                   |
|-------------------------------|--------|--------------------------------------------------------------|
| Accidental wrong cohort       | High   | Preview step with count + sample names; require confirmation |
| Race condition (duplicates)   | Low    | Transaction isolation; acceptable if rare                    |
| Performance >1000 bulk        | Medium | Batch processing; async job with progress tracking           |
| Credit calc without evidence  | High   | Unit tests; validation logic on approval                     |
| Practitioner confusion        | Medium | Future: notification; UI clarity on "admin-created"          |

---

## Testing Strategy

### Unit Tests

```typescript
describe('BulkSubmissionCreate', () => {
  it('creates submissions for all selected practitioners', async () => {
    const result = await bulkCreate({
      MaDanhMuc: activityId,
      cohort: { mode: 'manual', selectedIds: ['p1', 'p2', 'p3'] },
    });
    expect(result.created).toBe(3);
  });

  it('skips duplicates gracefully', async () => {
    // Pre-create submission for p1
    await createSubmission({ MaNhanVien: 'p1', MaDanhMuc: activityId });

    const result = await bulkCreate({
      MaDanhMuc: activityId,
      cohort: { mode: 'manual', selectedIds: ['p1', 'p2'] },
    });
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(1);
  });

  it('enforces tenancy (DonVi cannot cross units)', async () => {
    await expect(
      bulkCreate({
        MaDanhMuc: activityId,
        cohort: { mode: 'manual', selectedIds: ['other-unit-practitioner'] },
      }, { role: 'DonVi', unitId: 'unit1' })
    ).rejects.toThrow('Cannot create submissions for other units');
  });

  it('sets status to Nhap if evidence required', async () => {
    const activity = { YeuCauMinhChung: true };
    const result = await bulkCreate({ ... });
    const submission = await findById(result.submissionIds[0]);
    expect(submission.TrangThaiDuyet).toBe('Nhap');
  });

  it('calculates zero credits if evidence required but missing', () => {
    const submission = { TrangThaiDuyet: 'DaDuyet', FileMinhChungUrl: null };
    const activity = { YeuCauMinhChung: true, TyLeQuyDoi: 1.5 };
    expect(calculateCredits(submission, activity)).toBe(0);
  });
});
```

---

## Open Questions

1. **Should we allow editing event dates after bulk creation?**
   → **Phase 1:** No bulk edit. **Future:** Add bulk update endpoint.

2. **What if practitioner is deleted after bulk submission created?**
   → **Proposed:** Cascade delete or set to NULL with flag. Review cascade rules.

3. **Should SoYTe be able to bulk-create across multiple units in single call?**
   → **Phase 1:** Single unit per call. **Future:** Multi-unit support.

---

## Success Criteria

### Technical

- ✅ Bulk create 500 submissions in <3 seconds
- ✅ Duplicate detection <100ms for 1000 practitioners
- ✅ Zero credit calculation errors (evidence validation)
- ✅ 100% unit test coverage for bulk create logic
- ✅ <1% API error rate

### Business

- ✅ 70% DonVi adoption within 2 months
- ✅ Avg. enrollment time <2 minutes for 50 practitioners
- ✅ Zero critical bugs in first month
- ✅ Positive feedback from 80%+ pilot users
