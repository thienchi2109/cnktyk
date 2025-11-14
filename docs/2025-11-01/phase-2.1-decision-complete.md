# Phase 2.1 Decision: Database Schema for File Deletion Tracking

**Date:** 2025-11-01  
**Phase:** 2.1 - Database Schema Updates  
**Change ID:** `add-evidence-backup-and-cleanup`

---

## Decision Made: Use Separate Audit Tables (Approved)

### 2.1.1 Decision: Add backup tracking fields to GhiNhanHoatDong?

**Decision:** ❌ **NO - Use separate audit tables instead**

### Rationale

We will **NOT** add backup tracking fields directly to `GhiNhanHoatDong` table. Instead, we use the existing separate audit tables that were created in the migration.

#### Option 1: Add fields to GhiNhanHoatDong ❌ (Rejected)

```sql
-- NOT IMPLEMENTED
ALTER TABLE "GhiNhanHoatDong"
ADD COLUMN "FileMinhChungBackedUpAt" TIMESTAMP NULL,
ADD COLUMN "FileMinhChungBackedUpBy" UUID NULL REFERENCES "TaiKhoan"("MaTaiKhoan");
```

**Cons:**
- Pollutes submission table with backup metadata
- Only tracks most recent backup (loses history)
- Makes submission schema more complex
- Tight coupling between submissions and backups
- Harder to query backup history

#### Option 2: Use ChiTietSaoLuu Table ✅ (Approved)

```sql
-- ALREADY IMPLEMENTED (migration 2025-10-31_add_backup_tracking.sql)
CREATE TABLE "ChiTietSaoLuu" (
    "MaChiTiet" UUID PRIMARY KEY,
    "MaSaoLuu" UUID NOT NULL REFERENCES "SaoLuuMinhChung"("MaSaoLuu"),
    "MaGhiNhan" UUID NOT NULL REFERENCES "GhiNhanHoatDong"("MaGhiNhan"),
    "TrangThai" VARCHAR(50) NOT NULL DEFAULT 'DaSaoLuu', -- DaSaoLuu, DaXoa
    "NgayXoa" TIMESTAMP NULL,
    "DungLuongTep" BIGINT NULL
);
```

**Pros:**
- ✅ Maintains full backup/deletion history per file
- ✅ Separation of concerns (audit data separate from business data)
- ✅ Can track multiple backups of same file
- ✅ Easy to query "when was file backed up?" via JOIN
- ✅ Easy to query "which files can be deleted?" (have backup records)
- ✅ Cleaner schema design
- ✅ Already implemented in migration

---

## Implementation Status

### 2.1.2 Migration SQL ✅ COMPLETE

**File:** `migrations/2025-10-31_add_backup_tracking.sql`

Created 3 tables:

1. **SaoLuuMinhChung** - Backup operation records
   - Tracks: date range, file count, size, status, admin user
   
2. **ChiTietSaoLuu** - Backup detail records (per-file tracking)
   - Links: backup ↔ submission (many-to-many)
   - Tracks: status (DaSaoLuu/DaXoa), deletion date, file size
   
3. **XoaMinhChung** - Deletion operation records
   - Tracks: date range, success/fail counts, space freed, admin user

**Indexes:** 10 indexes created for optimal query performance

### 2.1.3 Zod Schemas ✅ COMPLETE

**File:** `src/lib/db/schemas.ts`

Added schemas for all 3 tables:
- `SaoLuuMinhChungSchema` / `CreateSaoLuuMinhChungSchema` / `UpdateSaoLuuMinhChungSchema`
- `ChiTietSaoLuuSchema` / `CreateChiTietSaoLuuSchema` / `UpdateChiTietSaoLuuSchema`
- `XoaMinhChungSchema` / `CreateXoaMinhChungSchema` / `UpdateXoaMinhChungSchema`

Status enums:
- `TrangThaiSaoLuuSchema` - 'HoanThanh' | 'ThanhCong' | 'ThatBai'
- `TrangThaiChiTietSaoLuuSchema` - 'DaSaoLuu' | 'DaXoa' | 'ThanhCong' | 'ThatBai'

### 2.1.4 TypeScript Types ✅ COMPLETE

All types exported from schemas:
```typescript
export type SaoLuuMinhChung = z.infer<typeof SaoLuuMinhChungSchema>;
export type CreateSaoLuuMinhChung = z.infer<typeof CreateSaoLuuMinhChungSchema>;
export type UpdateSaoLuuMinhChung = z.infer<typeof UpdateSaoLuuMinhChungSchema>;

export type ChiTietSaoLuu = z.infer<typeof ChiTietSaoLuuSchema>;
export type CreateChiTietSaoLuu = z.infer<typeof CreateChiTietSaoLuuSchema>;
export type UpdateChiTietSaoLuu = z.infer<typeof UpdateChiTietSaoLuuSchema>;

export type XoaMinhChung = z.infer<typeof XoaMinhChungSchema>;
export type CreateXoaMinhChung = z.infer<typeof CreateXoaMinhChungSchema>;
export type UpdateXoaMinhChung = z.infer<typeof UpdateXoaMinhChungSchema>;
```

### 2.1.5 Repository Classes ✅ COMPLETE

**File:** `src/lib/db/repositories.ts`

Created 3 repository classes:
```typescript
export class SaoLuuMinhChungRepository extends BaseRepository<...> {
  // Methods: findById, findByUser, create, update, delete
}

export class ChiTietSaoLuuRepository extends BaseRepository<...> {
  // Methods: findById, findByBackup, create, update, delete
}

export class XoaMinhChungRepository extends BaseRepository<...> {
  // Methods: findById, findByUser, create, update, delete
}

// Exported instances
export const saoLuuMinhChungRepo = new SaoLuuMinhChungRepository();
export const chiTietSaoLuuRepo = new ChiTietSaoLuuRepository();
export const xoaMinhChungRepo = new XoaMinhChungRepository();
```

---

## How File Deletion Tracking Works

### When File is Backed Up (Phase 1 - Already Implemented)

1. SoYTe admin runs backup for date range
2. System creates `SaoLuuMinhChung` record with backup ID
3. For each file backed up:
   - Creates `ChiTietSaoLuu` record
   - Links backup ID ↔ submission ID
   - Sets `TrangThai = 'DaSaoLuu'`
   - Stores file size

### When File is Deleted (Phase 2 - To Implement)

1. SoYTe admin requests deletion for date range
2. System queries `ChiTietSaoLuu` to find backed-up files
3. Only deletes files with `TrangThai = 'DaSaoLuu'` (safety check)
4. For each file successfully deleted:
   - Updates `ChiTietSaoLuu` record
   - Sets `TrangThai = 'DaXoa'`
   - Sets `NgayXoa = NOW()`
   - Sets `GhiNhanHoatDong.FileMinhChungUrl = NULL`
5. Creates `XoaMinhChung` record with deletion summary

### Querying Backup Status

```sql
-- Check if file has been backed up
SELECT COUNT(*) > 0 AS is_backed_up
FROM "ChiTietSaoLuu"
WHERE "MaGhiNhan" = $1
  AND "TrangThai" = 'DaSaoLuu';

-- Get backup history for a submission
SELECT 
  s."NgayTao" AS backup_date,
  s."NgayBatDau",
  s."NgayKetThuc",
  t."Email" AS backed_up_by,
  c."TrangThai",
  c."NgayXoa"
FROM "ChiTietSaoLuu" c
INNER JOIN "SaoLuuMinhChung" s ON s."MaSaoLuu" = c."MaSaoLuu"
INNER JOIN "TaiKhoan" t ON t."MaTaiKhoan" = s."MaTaiKhoan"
WHERE c."MaGhiNhan" = $1
ORDER BY s."NgayTao" DESC;

-- Find files safe to delete (have backup, not yet deleted)
SELECT g."MaGhiNhan", g."FileMinhChungUrl"
FROM "GhiNhanHoatDong" g
INNER JOIN "ChiTietSaoLuu" c ON c."MaGhiNhan" = g."MaGhiNhan"
WHERE g."FileMinhChungUrl" IS NOT NULL
  AND c."TrangThai" = 'DaSaoLuu'
  AND g."NgayGhiNhan" BETWEEN $1 AND $2;
```

---

## Migration Verification

### Run Migration

```bash
# If not already run
npx tsx scripts/run-migrations.ts

# Or manually via psql
psql $DATABASE_URL -f migrations/2025-10-31_add_backup_tracking.sql
```

### Verify Tables Exist

```sql
-- Check tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('SaoLuuMinhChung', 'ChiTietSaoLuu', 'XoaMinhChung');

-- Check columns
\d "SaoLuuMinhChung"
\d "ChiTietSaoLuu"
\d "XoaMinhChung"
```

---

## Phase 2.1 Task Status

- ✅ **2.1.1** Decision: Use separate audit tables (approved)
- ✅ **2.1.2** Migration SQL created (`2025-10-31_add_backup_tracking.sql`)
- ✅ **2.1.3** Zod schemas updated in `src/lib/db/schemas.ts`
- ✅ **2.1.4** TypeScript types exported
- ✅ **2.1.5** Repository classes created and working

**All Phase 2.1 tasks complete!** ✅

Migration exists but may need to be run in production database.

---

## Next Steps: Phase 2.2

Proceed to backend API development:
- Create `/api/backup/delete-archived/route.ts`
- Implement date range validation
- Implement file deletion from R2
- Update database records
- Add audit logging

**Ready to continue to Phase 2.2!** 🚀
