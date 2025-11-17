import { db } from '@/lib/db/client';
import { donViRepo } from '@/lib/db/repositories';
import type { DonVi } from '@/lib/db/schemas';

export class UnitValidationError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = 'UnitValidationError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface UnitDependencyCounts {
  childUnits: number;
  practitioners: number;
  userAccounts: number;
}

export async function ensureParentUnitActive(parentId: string | null): Promise<DonVi | null> {
  if (!parentId) {
    return null;
  }

  const parent = await donViRepo.findById(parentId);
  if (!parent) {
    throw new UnitValidationError('PARENT_NOT_FOUND', 'Đơn vị cha không tồn tại.');
  }

  if (!parent.TrangThai) {
    throw new UnitValidationError('PARENT_INACTIVE', 'Đơn vị cha đang bị vô hiệu hóa.');
  }

  return parent;
}

export async function ensureNoCircularReference(
  unitId: string | null,
  parentId: string | null,
): Promise<void> {
  if (!unitId || !parentId) {
    return;
  }

  if (unitId === parentId) {
    throw new UnitValidationError(
      'CIRCULAR_REFERENCE',
      'Một đơn vị không thể là đơn vị cha của chính nó.',
    );
  }

  const rows = await db.query<{ MaDonVi: string }>(
    `
      WITH RECURSIVE ancestors AS (
        SELECT "MaDonVi", "MaDonViCha"
        FROM "DonVi"
        WHERE "MaDonVi" = $1
        UNION ALL
        SELECT dv."MaDonVi", dv."MaDonViCha"
        FROM "DonVi" dv
        INNER JOIN ancestors a ON dv."MaDonVi" = a."MaDonViCha"
      )
      SELECT "MaDonVi"
      FROM ancestors
      WHERE "MaDonVi" = $2
      LIMIT 1
    `,
    [parentId, unitId],
  );

  if (rows.length > 0) {
    throw new UnitValidationError(
      'CIRCULAR_REFERENCE',
      'Không thể chọn đơn vị con làm đơn vị cha.',
    );
  }
}

export async function getUnitDependencyCounts(unitId: string): Promise<UnitDependencyCounts> {
  const [children, practitioners, users] = await Promise.all([
    db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "DonVi" WHERE "MaDonViCha" = $1 AND "TrangThai" = true`,
      [unitId],
    ),
    db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "NhanVien" WHERE "MaDonVi" = $1 AND "TrangThaiLamViec" = 'DangLamViec'`,
      [unitId],
    ),
    db.queryOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "TaiKhoan" WHERE "MaDonVi" = $1 AND "TrangThai" = true`,
      [unitId],
    ),
  ]);

  return {
    childUnits: Number(children?.count ?? 0),
    practitioners: Number(practitioners?.count ?? 0),
    userAccounts: Number(users?.count ?? 0),
  };
}

export async function ensureUnitDeletable(unitId: string): Promise<UnitDependencyCounts> {
  const counts = await getUnitDependencyCounts(unitId);

  if (counts.childUnits > 0 || counts.practitioners > 0 || counts.userAccounts > 0) {
    throw new UnitValidationError(
      'UNIT_HAS_DEPENDENCIES',
      'Không thể vô hiệu hóa đơn vị đang có đơn vị con, nhân sự hoặc tài khoản hoạt động.',
      409,
      counts,
    );
  }

  return counts;
}
