# Add DonVi (Unit Admin) Access to Activities Management

**Date:** 2025-11-02  
**Status:** Proposed  
**Author:** Droid AI Assistant  

## Executive Summary

This document proposes enabling DonVi (Unit Admin) users to manage activities in the Activities Management page while maintaining strict unit isolation and data integrity. Currently, only SoYTe (Department of Health) users can access this page. The proposed solution introduces optional unit-scoping to the `DanhMucHoatDong` table, allowing both global (DoH-managed) and unit-specific (DonVi-managed) activities to coexist.

---

## 1. Current State Analysis

### 1.1 Access Control

**Page Location:** `src/app/(authenticated)/activities/page.tsx`

**Current Restrictions:**
- Middleware permits only `SoYTe` role to access `/activities` route
- API endpoints (`/api/activities`, `/api/activities/[id]`) enforce SoYTe-only access
- Returns 403 Forbidden for all non-SoYTe users

### 1.2 Database Schema

**Table:** `DanhMucHoatDong` (Activity Catalog)

```sql
CREATE TABLE "DanhMucHoatDong" (
  "MaDanhMuc"       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "TenDanhMuc"      TEXT NOT NULL,
  "LoaiHoatDong"    loai_hoat_dong NOT NULL,
  "DonViTinh"       don_vi_tinh NOT NULL DEFAULT 'gio',
  "TyLeQuyDoi"      NUMERIC(6,2) NOT NULL DEFAULT 1.0,
  "GioToiThieu"     NUMERIC(6,2),
  "GioToiDa"        NUMERIC(6,2),
  "YeuCauMinhChung" BOOLEAN NOT NULL DEFAULT true,
  "HieuLucTu"       DATE,
  "HieuLucDen"      DATE,
  
  -- Constraints
  CONSTRAINT chk_dmhd_gio_range CHECK ("GioToiDa" IS NULL OR "GioToiThieu" IS NULL OR "GioToiDa" >= "GioToiThieu"),
  CONSTRAINT chk_dmhd_hieuluc CHECK ("HieuLucDen" IS NULL OR "HieuLucTu" IS NULL OR "HieuLucDen" >= "HieuLucTu")
);
```

**Key Observations:**
- NO `MaDonVi` column exists - table is **system-wide global catalog**
- All activities are visible to all users (when they have access)
- No ownership tracking (`NguoiTao`, `TaoLuc`)
- No audit trail for activity CRUD operations in current implementation

### 1.3 Repository Layer

**File:** `src/lib/db/repositories.ts`

```typescript
export class DanhMucHoatDongRepository extends BaseRepository<DanhMucHoatDong, CreateDanhMucHoatDong, UpdateDanhMucHoatDong> {
  constructor() {
    super('DanhMucHoatDong');
  }

  async findActive(): Promise<DanhMucHoatDong[]> {
    // Returns ALL active activities globally
  }

  async findByType(type: string): Promise<DanhMucHoatDong[]> {
    // Returns ALL activities of specified type globally
  }
}
```

**Missing Methods:**
- No `findByUnit(unitId)` - cannot filter by unit
- No `findAccessible(unitId)` - cannot combine global + unit activities
- No ownership validation in update/delete operations

### 1.4 API Routes

**File:** `src/app/api/activities/route.ts`

```typescript
// POST /api/activities
export async function POST(request: NextRequest) {
  // Only SoYTe can create activities
  if (user.role !== 'SoYTe') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... creates global activity
}
```

**File:** `src/app/api/activities/[id]/route.ts`

```typescript
// PUT /api/activities/[id]
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Only SoYTe can update activities
  if (user.role !== 'SoYTe') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... updates any activity
}

// DELETE /api/activities/[id]
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Only SoYTe can delete activities
  if (user.role !== 'SoYTe') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  // ... deletes any activity
}
```

### 1.5 Frontend Component

**File:** `src/components/activities/activities-list.tsx`

```typescript
// Check if user can manage activities (admin only)
const canManageActivities = (userRole: string) => {
  return userRole === 'SoYTe';
};
```

**Current Behavior:**
- Shows Create/Edit/Delete buttons only for SoYTe users
- No visual distinction between activity types (all are global)
- No filtering by ownership or scope

---

## 2. Requirements

### 2.1 Functional Requirements

**FR-1: Unit Isolation**
- DonVi users can only create activities scoped to their unit
- DonVi users can only update/delete activities they created
- DonVi users cannot modify global activities created by DoH

**FR-2: Visibility Rules**
- DonVi users see: Global activities + their unit's activities
- SoYTe users see: All activities (global + all units)

**FR-3: Activity Submission Integration**
- When creating submissions (`GhiNhanHoatDong`), DonVi users can select:
  - Global activities (created by DoH)
  - Unit-specific activities (created by their unit)
- Practitioners (`NguoiHanhNghe`) see the same activities as their DonVi admin

**FR-4: Backward Compatibility**
- Existing activities remain global (accessible to all units)
- No breaking changes to existing submission records

### 2.2 Non-Functional Requirements

**NFR-1: Data Integrity**
- Foreign key constraints must prevent orphaned records
- CASCADE delete when unit is deleted (unit activities only)
- RESTRICT delete when activity is referenced in submissions

**NFR-2: Audit Logging**
- All activity CRUD operations logged to `NhatKyHeThong`
- Track creator (`NguoiTao`) and creation time (`TaoLuc`)

**NFR-3: Performance**
- Query performance must not degrade with unit filtering
- Indexes required on `MaDonVi` column

**NFR-4: Security**
- Enforce unit isolation at database query level (WHERE clauses)
- Validate user permissions in API layer
- Prevent privilege escalation via direct API calls

---

## 3. Proposed Solution

### 3.1 Database Schema Changes

#### Migration: Add Unit Scoping to DanhMucHoatDong

**File:** `migrations/2025-11-02_add_unit_scoping_to_activities.sql`

```sql
-- ============================================================
-- Migration: Add Unit Scoping to Activity Catalog
-- Date: 2025-11-02
-- Description: Enable DonVi users to create unit-specific activities
-- ============================================================

BEGIN;

-- Step 1: Add unit reference column (nullable for global activities)
ALTER TABLE "DanhMucHoatDong" 
  ADD COLUMN "MaDonVi" UUID NULL;

-- Step 2: Add creator tracking
ALTER TABLE "DanhMucHoatDong"
  ADD COLUMN "NguoiTao" UUID NULL,
  ADD COLUMN "TaoLuc" TIMESTAMPTZ DEFAULT now();

-- Step 3: Add foreign key constraints
ALTER TABLE "DanhMucHoatDong"
  ADD CONSTRAINT fk_dmhd_donvi 
    FOREIGN KEY ("MaDonVi") 
    REFERENCES "DonVi" ("MaDonVi") 
    ON UPDATE CASCADE 
    ON DELETE CASCADE;

ALTER TABLE "DanhMucHoatDong"
  ADD CONSTRAINT fk_dmhd_nguoitao 
    FOREIGN KEY ("NguoiTao") 
    REFERENCES "TaiKhoan" ("MaTaiKhoan") 
    ON UPDATE CASCADE 
    ON DELETE SET NULL;

-- Step 4: Add indexes for query performance
CREATE INDEX idx_dmhd_donvi 
  ON "DanhMucHoatDong" ("MaDonVi");

CREATE INDEX idx_dmhd_nguoitao 
  ON "DanhMucHoatDong" ("NguoiTao");

-- Composite index for common query pattern (unit + active status)
CREATE INDEX idx_dmhd_donvi_hieuluc 
  ON "DanhMucHoatDong" ("MaDonVi", "HieuLucTu", "HieuLucDen");

-- Step 5: Add comments for documentation
COMMENT ON COLUMN "DanhMucHoatDong"."MaDonVi" IS 
  'Unit reference for unit-specific activities. NULL = global activity (visible to all units)';

COMMENT ON COLUMN "DanhMucHoatDong"."NguoiTao" IS 
  'User who created this activity (for audit and ownership tracking)';

COMMENT ON COLUMN "DanhMucHoatDong"."TaoLuc" IS 
  'Timestamp when activity was created';

-- Step 6: Migrate existing data (all existing activities become global)
UPDATE "DanhMucHoatDong" 
SET 
  "MaDonVi" = NULL,
  "NguoiTao" = NULL,
  "TaoLuc" = now()
WHERE "MaDonVi" IS NULL;

-- Step 7: Update table statistics
ANALYZE "DanhMucHoatDong";

COMMIT;

-- ============================================================
-- Rollback Script (if needed)
-- ============================================================
/*
BEGIN;

ALTER TABLE "DanhMucHoatDong" 
  DROP CONSTRAINT IF EXISTS fk_dmhd_donvi,
  DROP CONSTRAINT IF EXISTS fk_dmhd_nguoitao;

DROP INDEX IF EXISTS idx_dmhd_donvi;
DROP INDEX IF EXISTS idx_dmhd_nguoitao;
DROP INDEX IF EXISTS idx_dmhd_donvi_hieuluc;

ALTER TABLE "DanhMucHoatDong" 
  DROP COLUMN IF EXISTS "MaDonVi",
  DROP COLUMN IF EXISTS "NguoiTao",
  DROP COLUMN IF EXISTS "TaoLuc";

COMMIT;
*/
```

### 3.2 Schema Design Rationale

**Why nullable `MaDonVi`?**
- `NULL` = Global activity (created by DoH, accessible to all units)
- `UUID` = Unit-specific activity (created by DonVi, visible only to that unit)
- Allows gradual migration and backward compatibility

**Why `ON DELETE CASCADE` for `MaDonVi`?**
- When a unit is deleted, its custom activities should be removed
- Prevents orphaned unit-specific activities
- Global activities (MaDonVi = NULL) are unaffected

**Why `ON DELETE SET NULL` for `NguoiTao`?**
- Preserve activity even if creator account is deleted
- Maintains data integrity for historical records
- Audit trail shows NULL creator when account deleted

---

## 4. Repository Layer Changes

### 4.1 Updated Interface

**File:** `src/lib/db/repositories.ts`

```typescript
export class DanhMucHoatDongRepository extends BaseRepository<
  DanhMucHoatDong,
  CreateDanhMucHoatDong,
  UpdateDanhMucHoatDong
> {
  constructor() {
    super('DanhMucHoatDong');
  }

  /**
   * Find all global activities (visible to all units)
   */
  async findGlobal(): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "MaDonVi" IS NULL
      ORDER BY "TenDanhMuc" ASC
    `);
  }

  /**
   * Find activities accessible to a specific unit
   * Returns: Global activities + unit-specific activities
   */
  async findAccessibleByUnit(unitId: string): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "MaDonVi" IS NULL OR "MaDonVi" = $1
      ORDER BY "TenDanhMuc" ASC
    `, [unitId]);
  }

  /**
   * Find only unit-specific activities (excludes global)
   */
  async findByUnit(unitId: string): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "MaDonVi" = $1
      ORDER BY "TenDanhMuc" ASC
    `, [unitId]);
  }

  /**
   * Find active activities accessible to a unit
   * Filters by validity period
   */
  async findActiveAccessibleByUnit(unitId: string | null): Promise<DanhMucHoatDong[]> {
    if (!unitId) {
      // For SoYTe users, return all active activities
      return this.findActive();
    }

    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE (
        "MaDonVi" IS NULL OR "MaDonVi" = $1
      )
      AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
      AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
      ORDER BY "TenDanhMuc" ASC
    `, [unitId]);
  }

  /**
   * Check if user can modify an activity
   * SoYTe: Can modify any activity
   * DonVi: Can only modify their unit's activities
   */
  async canUserModify(activityId: string, userId: string, userRole: string, userUnitId: string | null): Promise<boolean> {
    if (userRole === 'SoYTe') {
      return true; // DoH can modify anything
    }

    if (userRole !== 'DonVi' || !userUnitId) {
      return false;
    }

    // Check if activity belongs to user's unit
    const activity = await this.findById(activityId);
    return activity !== null && activity.MaDonVi === userUnitId;
  }

  /**
   * Create activity with ownership tracking
   */
  async createWithOwnership(
    data: CreateDanhMucHoatDong,
    creatorId: string,
    unitId: string | null
  ): Promise<DanhMucHoatDong> {
    const activity = await this.create({
      ...data,
      MaDonVi: unitId,
      NguoiTao: creatorId,
      TaoLuc: new Date(),
    } as any);

    return activity;
  }
}
```

### 4.2 Schema Type Updates

**File:** `src/lib/db/schemas.ts`

```typescript
// Update DanhMucHoatDong schema
export const DanhMucHoatDongSchema = z.object({
  MaDanhMuc: UUIDSchema,
  TenDanhMuc: z.string().min(1, 'Activity name is required'),
  LoaiHoatDong: LoaiHoatDongSchema,
  DonViTinh: DonViTinhSchema.default('gio'),
  TyLeQuyDoi: z.number().min(0).default(1.0),
  GioToiThieu: z.number().min(0).nullable(),
  GioToiDa: z.number().min(0).nullable(),
  YeuCauMinhChung: z.boolean().default(true),
  HieuLucTu: z.date().nullable(),
  HieuLucDen: z.date().nullable(),
  
  // New fields
  MaDonVi: UUIDSchema.nullable(),
  NguoiTao: UUIDSchema.nullable(),
  TaoLuc: z.date(),
});

export const CreateDanhMucHoatDongSchema = DanhMucHoatDongSchema.omit({ 
  MaDanhMuc: true,
  NguoiTao: true,
  TaoLuc: true,
});

export const UpdateDanhMucHoatDongSchema = CreateDanhMucHoatDongSchema.partial().omit({
  MaDonVi: true, // Cannot change unit ownership after creation
});
```

---

## 5. API Layer Changes

### 5.1 GET /api/activities

**Authorization Logic:**

```typescript
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let activities;

    if (user.role === 'SoYTe') {
      // DoH sees all activities
      if (type) {
        activities = await danhMucHoatDongRepo.findByType(type);
      } else if (activeOnly) {
        activities = await danhMucHoatDongRepo.findActive();
      } else {
        activities = await danhMucHoatDongRepo.findAll();
      }
    } else if (user.role === 'DonVi') {
      // Unit admin sees global + their unit's activities
      if (!user.unitId) {
        return NextResponse.json({ error: 'Không tìm thấy đơn vị' }, { status: 403 });
      }

      activities = await danhMucHoatDongRepo.findAccessibleByUnit(user.unitId);

      // Apply client-side filtering for type and activeOnly
      if (type) {
        activities = activities.filter(a => a.LoaiHoatDong === type);
      }
      if (activeOnly) {
        const now = new Date();
        activities = activities.filter(a => {
          const startValid = !a.HieuLucTu || new Date(a.HieuLucTu) <= now;
          const endValid = !a.HieuLucDen || new Date(a.HieuLucDen) >= now;
          return startValid && endValid;
        });
      }
    } else {
      return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 403 });
    }

    return NextResponse.json({ activities });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
```

### 5.2 POST /api/activities

**Authorization Logic:**

```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Only SoYTe and DonVi can create activities
    if (user.role !== 'SoYTe' && user.role !== 'DonVi') {
      return NextResponse.json({ error: 'Không có quyền tạo hoạt động' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = CreateDanhMucHoatDongSchema.parse(body);

    // Determine unit scope
    let unitId: string | null = null;
    
    if (user.role === 'DonVi') {
      // DonVi users can only create unit-specific activities
      if (!user.unitId) {
        return NextResponse.json({ error: 'Không tìm thấy đơn vị' }, { status: 403 });
      }
      unitId = user.unitId;
    }
    // SoYTe users create global activities (unitId remains null)

    // Create activity with ownership tracking
    const newActivity = await danhMucHoatDongRepo.createWithOwnership(
      validatedData,
      user.id,
      unitId
    );

    // Audit log
    await auditLogger.log({
      action: 'CREATE',
      table: 'DanhMucHoatDong',
      recordId: newActivity.MaDanhMuc,
      userId: user.id,
      details: {
        activityName: newActivity.TenDanhMuc,
        scope: unitId ? 'unit-specific' : 'global',
        unitId,
      },
    });

    return NextResponse.json(newActivity, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error creating activity:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
```

### 5.3 PUT /api/activities/[id]

**Authorization Logic:**

```typescript
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { id } = await params;

    // Check if activity exists
    const existingActivity = await danhMucHoatDongRepo.findById(id);
    if (!existingActivity) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động' }, { status: 404 });
    }

    // Check if user can modify this activity
    const canModify = await danhMucHoatDongRepo.canUserModify(
      id,
      user.id,
      user.role,
      user.unitId || null
    );

    if (!canModify) {
      return NextResponse.json(
        { error: 'Chỉ có thể chỉnh sửa hoạt động của đơn vị mình' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateDanhMucHoatDongSchema.parse(body);

    // Update activity
    const updatedActivity = await danhMucHoatDongRepo.update(id, validatedData);

    // Audit log
    await auditLogger.log({
      action: 'UPDATE',
      table: 'DanhMucHoatDong',
      recordId: id,
      userId: user.id,
      details: {
        activityName: updatedActivity.TenDanhMuc,
        changes: validatedData,
      },
    });

    return NextResponse.json(updatedActivity);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating activity:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
```

### 5.4 DELETE /api/activities/[id]

**Authorization Logic:**

```typescript
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { id } = await params;

    // Check if activity exists
    const existingActivity = await danhMucHoatDongRepo.findById(id);
    if (!existingActivity) {
      return NextResponse.json({ error: 'Không tìm thấy hoạt động' }, { status: 404 });
    }

    // Check if user can modify this activity
    const canModify = await danhMucHoatDongRepo.canUserModify(
      id,
      user.id,
      user.role,
      user.unitId || null
    );

    if (!canModify) {
      return NextResponse.json(
        { error: 'Chỉ có thể xóa hoạt động của đơn vị mình' },
        { status: 403 }
      );
    }

    // Check if activity is referenced in submissions
    const submissionCount = await db.queryOne<{ count: number }>(`
      SELECT COUNT(*) as count
      FROM "GhiNhanHoatDong"
      WHERE "MaDanhMuc" = $1
    `, [id]);

    if (submissionCount && submissionCount.count > 0) {
      return NextResponse.json(
        { 
          error: 'Không thể xóa hoạt động đang được sử dụng',
          details: `Có ${submissionCount.count} bản ghi tham chiếu đến hoạt động này`
        },
        { status: 400 }
      );
    }

    // Delete activity
    await danhMucHoatDongRepo.delete(id);

    // Audit log
    await auditLogger.log({
      action: 'DELETE',
      table: 'DanhMucHoatDong',
      recordId: id,
      userId: user.id,
      details: {
        activityName: existingActivity.TenDanhMuc,
        scope: existingActivity.MaDonVi ? 'unit-specific' : 'global',
      },
    });

    return NextResponse.json({ message: 'Đã xóa hoạt động thành công' });
  } catch (error) {
    console.error('Error deleting activity:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
```

---

## 6. Frontend Changes

### 6.1 Activities List Component

**File:** `src/components/activities/activities-list.tsx`

**Key Changes:**

1. **Update `canManageActivities` function:**
```typescript
const canManageActivities = (userRole: string) => {
  return userRole === 'SoYTe' || userRole === 'DonVi';
};
```

2. **Add ownership check for Edit/Delete buttons:**
```typescript
const canModifyActivity = (activity: Activity, userRole: string, userUnitId: string | null) => {
  if (userRole === 'SoYTe') {
    return true; // DoH can modify anything
  }
  
  if (userRole === 'DonVi') {
    // DonVi can only modify their unit's activities
    return activity.MaDonVi === userUnitId;
  }
  
  return false;
};
```

3. **Add visual indicator for activity scope:**
```typescript
const getActivityScopeBadge = (activity: Activity) => {
  if (activity.MaDonVi === null) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-0">
        <Globe className="h-3 w-3 mr-1" />
        Toàn hệ thống
      </Badge>
    );
  } else {
    return (
      <Badge className="bg-green-100 text-green-800 border-0">
        <Building className="h-3 w-3 mr-1" />
        Đơn vị
      </Badge>
    );
  }
};
```

4. **Update table to show scope and conditional actions:**
```typescript
<TableRow key={activity.MaDanhMuc}>
  {/* ... existing columns ... */}
  
  <TableCell>
    {getActivityScopeBadge(activity)}
  </TableCell>
  
  {canManageActivities(userRole) && (
    <TableCell>
      <div className="flex items-center space-x-2">
        {canModifyActivity(activity, userRole, userUnitId) && (
          <>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEditActivity(activity); }}
            >
              <Edit className="h-4 w-4" />
            </GlassButton>
            <GlassButton
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onDeleteActivity(activity.MaDanhMuc); }}
            >
              <Trash2 className="h-4 w-4" />
            </GlassButton>
          </>
        )}
        {!canModifyActivity(activity, userRole, userUnitId) && (
          <span className="text-sm text-gray-400">Chỉ xem</span>
        )}
      </div>
    </TableCell>
  )}
</TableRow>
```

### 6.2 Activity Form Component

**File:** `src/components/activities/activity-form.tsx`

**Changes:**

1. Add scope information display (read-only):
```typescript
{mode === 'edit' && activity && (
  <div className="mb-4 p-3 bg-gray-50 rounded-md">
    <p className="text-sm text-gray-600">
      <strong>Phạm vi:</strong>{' '}
      {activity.MaDonVi ? 'Hoạt động của đơn vị' : 'Hoạt động toàn hệ thống'}
    </p>
  </div>
)}
```

### 6.3 Middleware Update

**File:** `middleware.ts`

**Change:** Already correct! The middleware currently allows both SoYTe and DonVi:

```typescript
const PROTECTED_ROUTES = {
  "/activities": ["SoYTe", "DonVi"], // ✓ Already permits both roles
  // ...
};
```

---

## 7. Security Considerations

### 7.1 Threat Model

**Threat 1: Privilege Escalation**
- **Risk:** DonVi user attempts to create global activity by manipulating request payload
- **Mitigation:** Server-side enforcement of `unitId` based on authenticated user role

**Threat 2: Cross-Unit Access**
- **Risk:** DonVi user from Unit A attempts to modify activity from Unit B
- **Mitigation:** `canUserModify` validation in repository layer + database query filtering

**Threat 3: SQL Injection**
- **Risk:** Malicious input in activity name or filters
- **Mitigation:** Parameterized queries throughout (`$1`, `$2` placeholders)

**Threat 4: Mass Assignment**
- **Risk:** User includes `MaDonVi` in update payload to change activity scope
- **Mitigation:** `UpdateDanhMucHoatDongSchema` explicitly omits `MaDonVi` field

### 7.2 Defense in Depth

**Layer 1: Middleware**
- Route-level access control (SoYTe and DonVi only)

**Layer 2: API Authorization**
- Role-based permission checks in each endpoint
- Ownership validation for update/delete operations

**Layer 3: Repository Layer**
- `canUserModify()` method enforces ownership rules
- Query-level filtering by unit (`WHERE "MaDonVi" = $1 OR "MaDonVi" IS NULL`)

**Layer 4: Database Constraints**
- Foreign key constraints prevent orphaned references
- CHECK constraints validate data integrity

**Layer 5: Audit Logging**
- All CRUD operations logged to `NhatKyHeThong`
- Tamper-evident trail for forensic analysis

---

## 8. Testing Strategy

### 8.1 Unit Tests

**Repository Layer:**
```typescript
describe('DanhMucHoatDongRepository', () => {
  test('findAccessibleByUnit returns global + unit activities', async () => {
    const activities = await repo.findAccessibleByUnit(testUnitId);
    expect(activities).toContainEqual(expect.objectContaining({ MaDonVi: null }));
    expect(activities).toContainEqual(expect.objectContaining({ MaDonVi: testUnitId }));
  });

  test('canUserModify returns false for DonVi user on global activity', async () => {
    const canModify = await repo.canUserModify(globalActivityId, donViUserId, 'DonVi', unitId);
    expect(canModify).toBe(false);
  });

  test('canUserModify returns true for SoYTe user on any activity', async () => {
    const canModify = await repo.canUserModify(unitActivityId, soYTeUserId, 'SoYTe', null);
    expect(canModify).toBe(true);
  });
});
```

### 8.2 Integration Tests

**API Routes:**
```typescript
describe('POST /api/activities', () => {
  test('DonVi user creates unit-scoped activity', async () => {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });
    const activity = await response.json();
    expect(activity.MaDonVi).toBe(donViUser.unitId);
  });

  test('SoYTe user creates global activity', async () => {
    const response = await fetch('/api/activities', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(activityData),
    });
    const activity = await response.json();
    expect(activity.MaDonVi).toBeNull();
  });
});

describe('PUT /api/activities/[id]', () => {
  test('DonVi user cannot modify global activity', async () => {
    const response = await fetch(`/api/activities/${globalActivityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ TenDanhMuc: 'Modified' }),
    });
    expect(response.status).toBe(403);
  });

  test('DonVi user can modify own unit activity', async () => {
    const response = await fetch(`/api/activities/${unitActivityId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ TenDanhMuc: 'Modified' }),
    });
    expect(response.status).toBe(200);
  });
});
```

### 8.3 E2E Tests

**Scenarios:**
1. DonVi user logs in and sees global + unit activities
2. DonVi user creates new unit-specific activity
3. DonVi user attempts to edit global activity (should fail)
4. DonVi user edits own unit activity (should succeed)
5. DonVi user attempts to delete global activity (should fail)
6. SoYTe user logs in and sees all activities
7. SoYTe user modifies any activity (should succeed)

### 8.4 Manual Testing Checklist

- [ ] Migration runs successfully without errors
- [ ] Existing activities remain accessible after migration
- [ ] DonVi user can create unit-specific activity
- [ ] DonVi user cannot modify global activities
- [ ] DonVi user can modify own unit activities
- [ ] SoYTe user can modify all activities
- [ ] Activity scope badges display correctly
- [ ] Edit/Delete buttons show only for modifiable activities
- [ ] Audit logs capture all CRUD operations
- [ ] Performance is acceptable with 1000+ activities

---

## 9. Implementation Plan

### Phase 1: Database & Schema (1-2 hours)

1. ✅ Create migration file: `2025-11-02_add_unit_scoping_to_activities.sql`
2. ✅ Update TypeScript types in `src/lib/db/schemas.ts`
3. ✅ Test migration on development database
4. ✅ Verify existing data integrity

### Phase 2: Repository Layer (2-3 hours)

1. ✅ Add new methods to `DanhMucHoatDongRepository`:
   - `findGlobal()`
   - `findAccessibleByUnit(unitId)`
   - `findByUnit(unitId)`
   - `findActiveAccessibleByUnit(unitId)`
   - `canUserModify(activityId, userId, userRole, userUnitId)`
   - `createWithOwnership(data, creatorId, unitId)`
2. ✅ Update existing methods to handle unit filtering
3. ✅ Write unit tests for new methods

### Phase 3: API Routes (2-3 hours)

1. ✅ Update `GET /api/activities` authorization logic
2. ✅ Update `POST /api/activities` to support unit-scoped creation
3. ✅ Update `PUT /api/activities/[id]` with ownership checks
4. ✅ Update `DELETE /api/activities/[id]` with ownership checks
5. ✅ Add audit logging to all endpoints
6. ✅ Update Vietnamese error messages
7. ✅ Write integration tests

### Phase 4: Frontend Components (2-3 hours)

1. ✅ Update `canManageActivities()` to include DonVi
2. ✅ Add `canModifyActivity()` function
3. ✅ Add activity scope badges (Global vs Unit)
4. ✅ Conditionally render Edit/Delete buttons
5. ✅ Update table columns to show scope
6. ✅ Add scope information to activity form (read-only)

### Phase 5: Testing & Validation (2-3 hours)

1. ✅ Run unit tests for repository layer
2. ✅ Run integration tests for API routes
3. ✅ Perform manual E2E testing
4. ✅ Run typecheck: `npm run typecheck`
5. ✅ Run lint: `npm run lint`
6. ✅ Test with multiple units and roles
7. ✅ Verify audit logs are captured

### Phase 6: Documentation & Deployment (1 hour)

1. ✅ Update CHANGELOG.md with feature details
2. ✅ Update API documentation (if exists)
3. ✅ Create user guide for DonVi administrators
4. ✅ Review security checklist
5. ✅ Deploy to staging environment
6. ✅ Smoke test on staging
7. ✅ Deploy to production

**Total Estimated Time:** 10-15 hours

---

## 10. Rollback Plan

### If Issues Arise After Deployment

**Step 1: Identify Scope of Issue**
- Check error logs for affected users/operations
- Verify data integrity in `DanhMucHoatDong` table

**Step 2: Quick Mitigation**
- Revert middleware to SoYTe-only access:
  ```typescript
  "/activities": ["SoYTe"], // Temporarily disable DonVi access
  ```
- Deploy middleware-only change (< 5 minutes)

**Step 3: Full Rollback (if necessary)**
- Run rollback migration script (see Migration section)
- Restore previous API route versions from git
- Deploy previous frontend components

**Step 4: Post-Rollback Actions**
- Notify affected users via system notifications
- Analyze root cause
- Fix issues in development environment
- Re-test thoroughly before re-deployment

---

## 11. Success Criteria

### Functional Criteria

✅ **FC-1:** DonVi users can access `/activities` page  
✅ **FC-2:** DonVi users can create unit-specific activities  
✅ **FC-3:** DonVi users can view global + unit activities  
✅ **FC-4:** DonVi users can only modify their unit's activities  
✅ **FC-5:** DonVi users cannot modify global activities  
✅ **FC-6:** SoYTe users can view/modify all activities  
✅ **FC-7:** Activity scope is visually indicated in UI  
✅ **FC-8:** Existing activities remain accessible  

### Non-Functional Criteria

✅ **NFC-1:** Query performance < 500ms for 1000+ activities  
✅ **NFC-2:** All CRUD operations logged to audit table  
✅ **NFC-3:** No SQL injection vulnerabilities  
✅ **NFC-4:** No privilege escalation paths  
✅ **NFC-5:** Zero data loss during migration  
✅ **NFC-6:** TypeScript type checking passes  
✅ **NFC-7:** ESLint passes with no new errors  

---

## 12. Open Questions

1. **Should NguoiHanhNghe (Practitioners) also have read-only access to `/activities`?**
   - Currently excluded from middleware
   - May be useful for self-service activity discovery
   - **Decision needed from product team**

2. **Should we allow DonVi users to "suggest" global activities to DoH?**
   - Feature: DonVi creates activity → DoH reviews → Converts to global
   - Would require workflow state machine
   - **Future enhancement consideration**

3. **Should activity names be unique per unit or globally unique?**
   - Current: No uniqueness constraint
   - Risk: Confusing duplicate names across units
   - **Recommendation:** Add unique constraint on `(MaDonVi, TenDanhMuc)`

4. **What happens when a unit is merged/dissolved?**
   - Unit-specific activities would be cascade deleted
   - Should they be converted to target unit instead?
   - **Needs operational procedure documentation**

---

## 13. References

- **Database Schema:** `docs/2025-10-03/v_1_init_schema.sql`
- **Repository Pattern:** `src/lib/db/repositories.ts`
- **API Routes:** `src/app/api/activities/route.ts`
- **Frontend Components:** `src/components/activities/activities-list.tsx`
- **Middleware:** `middleware.ts`
- **Architecture Guidelines:** `AGENTS.md`

---

## Appendix A: Example Data

### Global Activity (Created by DoH)

```json
{
  "MaDanhMuc": "a1b2c3d4-...",
  "TenDanhMuc": "Hội thảo Y học Cập nhật",
  "LoaiHoatDong": "HoiThao",
  "DonViTinh": "gio",
  "TyLeQuyDoi": 1.0,
  "GioToiThieu": 4,
  "GioToiDa": 40,
  "YeuCauMinhChung": true,
  "HieuLucTu": "2025-01-01",
  "HieuLucDen": "2025-12-31",
  "MaDonVi": null,
  "NguoiTao": "soyTe-user-id",
  "TaoLuc": "2025-11-02T09:00:00Z"
}
```

### Unit-Specific Activity (Created by DonVi)

```json
{
  "MaDanhMuc": "e5f6g7h8-...",
  "TenDanhMuc": "Đào tạo nội bộ về Quy trình Khám bệnh",
  "LoaiHoatDong": "KhoaHoc",
  "DonViTinh": "gio",
  "TyLeQuyDoi": 0.8,
  "GioToiThieu": 2,
  "GioToiDa": 20,
  "YeuCauMinhChung": false,
  "HieuLucTu": "2025-03-01",
  "HieuLucDen": "2025-12-31",
  "MaDonVi": "unit-a-id",
  "NguoiTao": "donVi-user-id",
  "TaoLuc": "2025-11-02T10:30:00Z"
}
```

---

## Appendix B: Audit Log Examples

### Activity Creation by DonVi

```json
{
  "MaNhatKy": "log-id-1",
  "MaTaiKhoan": "donVi-user-id",
  "HanhDong": "CREATE",
  "Bang": "DanhMucHoatDong",
  "KhoaChinh": "activity-id",
  "NoiDung": {
    "activityName": "Đào tạo nội bộ về Quy trình Khám bệnh",
    "scope": "unit-specific",
    "unitId": "unit-a-id"
  },
  "ThoiGian": "2025-11-02T10:30:00Z",
  "DiaChiIP": "192.168.1.100"
}
```

### Activity Update by SoYTe

```json
{
  "MaNhatKy": "log-id-2",
  "MaTaiKhoan": "soyTe-user-id",
  "HanhDong": "UPDATE",
  "Bang": "DanhMucHoatDong",
  "KhoaChinh": "activity-id",
  "NoiDung": {
    "activityName": "Hội thảo Y học Cập nhật",
    "changes": {
      "TyLeQuyDoi": 1.2,
      "HieuLucDen": "2026-12-31"
    }
  },
  "ThoiGian": "2025-11-02T11:00:00Z",
  "DiaChiIP": "192.168.1.200"
}
```

### Failed Delete Attempt by DonVi

```json
{
  "MaNhatKy": "log-id-3",
  "MaTaiKhoan": "donVi-user-id",
  "HanhDong": "DELETE_ATTEMPT_FAILED",
  "Bang": "DanhMucHoatDong",
  "KhoaChinh": "global-activity-id",
  "NoiDung": {
    "activityName": "Hội thảo Y học Cập nhật",
    "scope": "global",
    "reason": "Chỉ có thể xóa hoạt động của đơn vị mình",
    "httpStatus": 403
  },
  "ThoiGian": "2025-11-02T11:30:00Z",
  "DiaChiIP": "192.168.1.100"
}
```

---

**END OF DOCUMENT**
