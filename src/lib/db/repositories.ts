import { db } from './client';
import { calculateEffectiveCredits } from './credit-utils';
import {
  TaiKhoan,
  CreateTaiKhoan,
  UpdateTaiKhoan,
  NhanVien,
  CreateNhanVien,
  UpdateNhanVien,
  GhiNhanHoatDong,
  CreateGhiNhanHoatDong,
  UpdateGhiNhanHoatDong,
  DonVi,
  CreateDonVi,
  UpdateDonVi,
  DanhMucHoatDong,
  CreateDanhMucHoatDong,
  UpdateDanhMucHoatDong,
  ThongBao,
  CreateThongBao,
  UpdateThongBao,
  NhatKyHeThong,
  CreateNhatKyHeThong,
  CapQuanLySchema,
} from './schemas';
import bcrypt from 'bcryptjs';
import type {
  BulkCohortSelection,
  BulkSubmissionResultError,
  CohortResolutionContext,
  CohortResolutionResult,
  PractitionerWithUnit,
} from '@/types/bulk-submission';
import { isAllCohortSelection, isManualCohortSelection } from '@/types/bulk-submission';

type BulkSubmissionInsertInput = Omit<
  Pick<
    CreateGhiNhanHoatDong,
    |
    'MaNhanVien'
    |
    'MaDanhMuc'
    |
    'TenHoatDong'
    |
    'NguoiNhap'
    |
    'CreationMethod'
    |
    'TrangThaiDuyet'
    |
    'DonViToChuc'
    |
    'NgayBatDau'
    |
    'NgayKetThuc'
    |
    'SoTiet'
    |
    'SoGioTinChiQuyDoi'
    |
    'HinhThucCapNhatKienThucYKhoa'
    |
    'FileMinhChungUrl'
    |
    'BangChungSoGiayChungNhan'
  >,
  'TrangThaiDuyet'
> & {
  TrangThaiDuyet: 'ChoDuyet' | 'Nhap';
};

type BulkCreateResult = {
  inserted: GhiNhanHoatDong[];
  conflicts: string[];
};

// Base repository class with common CRUD operations
abstract class BaseRepository<T, CreateT, UpdateT> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  async findById(id: string): Promise<T | null> {
    return db.queryOne<T>(`SELECT * FROM "${this.tableName}" WHERE "MaTaiKhoan" = $1 OR "MaNhanVien" = $1 OR "MaGhiNhan" = $1 OR "MaDonVi" = $1 OR "MaDanhMuc" = $1 OR "MaThongBao" = $1 OR "MaNhatKy" = $1`, [id]);
  }

  async findAll(limit?: number, offset?: number): Promise<T[]> {
    // Use a more generic ordering that works for all tables
    let query = `SELECT * FROM "${this.tableName}"`;
    const params: any[] = [];

    // Order by the primary key
    const pkColumn = this.getPrimaryKeyColumn();
    query += ` ORDER BY "${pkColumn}" DESC`;

    if (limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(limit);
    }

    if (offset) {
      query += ` OFFSET $${params.length + 1}`;
      params.push(offset);
    }

    return db.query<T>(query, params);
  }

  async create(data: CreateT): Promise<T> {
    return db.insert<T>(this.tableName, data as Record<string, any>);
  }

  async update(id: string, data: UpdateT): Promise<T | null> {
    const results = await db.update<T>(
      this.tableName,
      data as Record<string, any>,
      { [this.getPrimaryKeyColumn()]: id }
    );
    return results.length > 0 ? results[0] : null;
  }

  async delete(id: string): Promise<T | null> {
    const results = await db.delete<T>(
      this.tableName,
      { [this.getPrimaryKeyColumn()]: id }
    );
    return results.length > 0 ? results[0] : null;
  }

  async exists(id: string): Promise<boolean> {
    return db.exists(this.tableName, { [this.getPrimaryKeyColumn()]: id });
  }

  async count(where?: Record<string, any>): Promise<number> {
    return db.count(this.tableName, where);
  }

  protected abstract getPrimaryKeyColumn(): string;
}

// TaiKhoan (User Account) Repository
export class TaiKhoanRepository extends BaseRepository<TaiKhoan, CreateTaiKhoan, UpdateTaiKhoan> {
  constructor() {
    super('TaiKhoan');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaTaiKhoan';
  }

  async findById(id: string): Promise<TaiKhoan | null> {
    return db.queryOne<TaiKhoan>(`SELECT * FROM "${this.tableName}" WHERE "MaTaiKhoan" = $1`, [id]);
  }

  async findByUsername(username: string): Promise<TaiKhoan | null> {
    return db.queryOne<TaiKhoan>(`SELECT * FROM "${this.tableName}" WHERE "TenDangNhap" = $1`, [username]);
  }

  async findByUsernameInsensitive(username: string): Promise<TaiKhoan | null> {
    return db.queryOne<TaiKhoan>(`SELECT * FROM "${this.tableName}" WHERE LOWER("TenDangNhap") = LOWER($1)`, [username]);
  }

  async create(data: CreateTaiKhoan): Promise<TaiKhoan> {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(data.MatKhau, 10);

    const userData = {
      ...data,
      MatKhauBam: hashedPassword,
    };

    // Remove the plain password
    delete (userData as any).MatKhau;

    return db.insert<TaiKhoan>(this.tableName, userData);
  }

  async verifyPassword(username: string, password: string): Promise<TaiKhoan | null> {
    // Normalize username lookup to be case-insensitive and trim whitespace
    const normalized = username.trim();
    const user = await this.findByUsernameInsensitive(normalized);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.MatKhauBam);
    return isValid ? user : null;
  }

  async updatePassword(id: string, newPassword: string): Promise<TaiKhoan | null> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.update(id, { MatKhauBam: hashedPassword } as UpdateTaiKhoan);
  }

  async findByUnit(unitId: string): Promise<TaiKhoan[]> {
    return db.query<TaiKhoan>(`SELECT * FROM "${this.tableName}" WHERE "MaDonVi" = $1 AND "TrangThai" = true`, [unitId]);
  }

  async findByRole(role: string): Promise<TaiKhoan[]> {
    return db.query<TaiKhoan>(`SELECT * FROM "${this.tableName}" WHERE "QuyenHan" = $1 AND "TrangThai" = true`, [role]);
  }

  async search(filters: {
    role?: string;
    unitId?: string;
    searchTerm?: string;
    includeInactive?: boolean;
  }): Promise<TaiKhoan[]> {
    let query = `SELECT * FROM "${this.tableName}" WHERE 1=1`;
    const params: any[] = [];
    let paramCount = 1;

    // Filter by role
    if (filters.role) {
      query += ` AND "QuyenHan" = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    // Filter by unit
    if (filters.unitId) {
      query += ` AND "MaDonVi" = $${paramCount}`;
      params.push(filters.unitId);
      paramCount++;
    }

    // Search by username (case-insensitive)
    if (filters.searchTerm) {
      query += ` AND LOWER("TenDangNhap") LIKE LOWER($${paramCount})`;
      params.push(`%${filters.searchTerm}%`);
      paramCount++;
    }

    // Filter active users only (unless includeInactive is true)
    if (!filters.includeInactive) {
      query += ` AND "TrangThai" = true`;
    }

    query += ` ORDER BY "TaoLuc" DESC`;

    return db.query<TaiKhoan>(query, params);
  }
}

// NhanVien (Practitioner) Repository
export class NhanVienRepository extends BaseRepository<NhanVien, CreateNhanVien, UpdateNhanVien> {
  constructor() {
    super('NhanVien');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaNhanVien';
  }

  async findById(id: string): Promise<NhanVien | null> {
    return db.queryOne<NhanVien>(`SELECT * FROM "${this.tableName}" WHERE "MaNhanVien" = $1`, [id]);
  }

  async findByUnit(unitId: string): Promise<NhanVien[]> {
    return db.query<NhanVien>(`
      SELECT * FROM "${this.tableName}" 
      WHERE "MaDonVi" = $1 
      ORDER BY "HoVaTen" ASC
    `, [unitId]);
  }

  async findByCCHN(cchn: string): Promise<NhanVien | null> {
    return db.queryOne<NhanVien>(`SELECT * FROM "${this.tableName}" WHERE "SoCCHN" = $1`, [cchn]);
  }

  async searchByName(searchTerm: string, unitId?: string): Promise<NhanVien[]> {
    let query = `
      SELECT * FROM "${this.tableName}" 
      WHERE LOWER("HoVaTen") LIKE LOWER($1)
    `;
    const params = [`%${searchTerm}%`];

    if (unitId) {
      query += ` AND "MaDonVi" = $2`;
      params.push(unitId);
    }

    query += ` ORDER BY "HoVaTen" ASC`;

    return db.query<NhanVien>(query, params);
  }

  async findActiveByUnit(unitId: string): Promise<NhanVien[]> {
    return db.query<NhanVien>(`
      SELECT * FROM "${this.tableName}" 
      WHERE "MaDonVi" = $1 AND "TrangThaiLamViec" = 'DangLamViec'
      ORDER BY "HoVaTen" ASC
    `, [unitId]);
  }

  async getComplianceStatus(practitionerId: string): Promise<{
    totalCredits: number;
    requiredCredits: number;
    compliancePercentage: number;
    status: 'compliant' | 'at_risk' | 'non_compliant';
  }> {
    const result = await db.queryOne<{
      total_credits: string;
    }>(`
      SELECT COALESCE(SUM(
        CASE
          WHEN g."TrangThaiDuyet" = 'DaDuyet'
            AND (
              g."MaDanhMuc" IS NULL
              OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
              OR (
                dm."YeuCauMinhChung" = TRUE
                AND g."FileMinhChungUrl" IS NOT NULL
                AND BTRIM(g."FileMinhChungUrl") <> ''
              )
            )
          THEN g."SoGioTinChiQuyDoi"
          ELSE 0
        END
      ), 0) as total_credits
      FROM "GhiNhanHoatDong" g
      LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
      WHERE g."MaNhanVien" = $1 AND g."TrangThaiDuyet" = 'DaDuyet'
    `, [practitionerId]);

    const totalCredits = parseFloat(result?.total_credits || '0');
    const requiredCredits = 120; // Default 5-year requirement
    const compliancePercentage = (totalCredits / requiredCredits) * 100;

    let status: 'compliant' | 'at_risk' | 'non_compliant';
    if (compliancePercentage >= 90) {
      status = 'compliant';
    } else if (compliancePercentage >= 70) {
      status = 'at_risk';
    } else {
      status = 'non_compliant';
    }

    return {
      totalCredits,
      requiredCredits,
      compliancePercentage,
      status
    };
  }

  /**
   * Find practitioners with server-side pagination and filtering
   * This method optimizes database queries by:
   * 1. Calculating compliance status in a single CTE
   * 2. Applying all filters at the SQL level
   * 3. Using LIMIT/OFFSET for pagination
   * 4. Including accurate total count with COUNT(*) OVER()
   */
  async findPaginated(query: import('./schemas').PaginatedQuery): Promise<import('./schemas').PaginatedResult<import('./schemas').NhanVienWithCompliance>> {
    const {
      page = 1,
      limit = 10,
      unitId,
      search,
      status,
      chucDanh,
      khoaPhong,
      complianceStatus,
      orderBy = 'HoVaTen',
      orderDirection = 'ASC'
    } = query;

    const offset = (page - 1) * limit;
    const params: any[] = [];
    let paramIndex = 1;

    // Build optimized query with CTE for compliance calculation
    let sql = `
      WITH credit_source AS (
        SELECT
          g."MaNhanVien",
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END AS effective_credits
        FROM "GhiNhanHoatDong" g
        LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
        WHERE g."TrangThaiDuyet" = 'DaDuyet'
      ),
      compliance_data AS (
        SELECT 
          "MaNhanVien",
          COALESCE(SUM(effective_credits), 0) as total_credits,
          120 as required_credits,
          ROUND((COALESCE(SUM(effective_credits), 0) / 120.0) * 100, 2) as compliance_percentage,
          CASE
            WHEN (COALESCE(SUM(effective_credits), 0) / 120.0) * 100 >= 90 THEN 'compliant'
            WHEN (COALESCE(SUM(effective_credits), 0) / 120.0) * 100 >= 70 THEN 'at_risk'
            ELSE 'non_compliant'
          END as compliance_status
        FROM credit_source
        GROUP BY "MaNhanVien"
      ),
      filtered_practitioners AS (
        SELECT 
          n.*,
          COALESCE(c.total_credits, 0) as total_credits,
          COALESCE(c.required_credits, 120) as required_credits,
          COALESCE(c.compliance_percentage, 0) as compliance_percentage,
          COALESCE(c.compliance_status, 'non_compliant') as compliance_status,
          COUNT(*) OVER() as total_count
        FROM "NhanVien" n
        LEFT JOIN compliance_data c ON n."MaNhanVien" = c."MaNhanVien"
        WHERE 1=1
    `;

    // Add filters dynamically
    if (unitId) {
      sql += ` AND n."MaDonVi" = $${paramIndex++}`;
      params.push(unitId);
    }

    if (search) {
      sql += ` AND LOWER(n."HoVaTen") LIKE LOWER($${paramIndex++})`;
      params.push(`%${search}%`);
    }

    if (status) {
      sql += ` AND n."TrangThaiLamViec" = $${paramIndex++}`;
      params.push(status);
    }

    if (chucDanh) {
      sql += ` AND n."ChucDanh" = $${paramIndex++}`;
      params.push(chucDanh);
    }

    if (khoaPhong) {
      sql += ` AND n."KhoaPhong" = $${paramIndex++}`;
      params.push(khoaPhong);
    }

    if (complianceStatus) {
      sql += ` AND c.compliance_status = $${paramIndex++}`;
      params.push(complianceStatus);
    }
    sql += `
      )
      SELECT *
      FROM filtered_practitioners
      ORDER BY "${orderBy}" ${orderDirection}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;

    params.push(limit, offset);

    // Execute query
    const results = await db.query<any>(sql, params);

    // Extract total count from first row (or 0 if no results)
    const totalCount = results.length > 0 ? parseInt(results[0].total_count) : 0;

    // Map results to NhanVienWithCompliance type
    const data = results.map(row => ({
      MaNhanVien: row.MaNhanVien,
      MaNhanVienNoiBo: row.MaNhanVienNoiBo ?? null,
      HoVaTen: row.HoVaTen,
      SoCCHN: row.SoCCHN,
      NgayCapCCHN: row.NgayCapCCHN,
      MaDonVi: row.MaDonVi,
      TrangThaiLamViec: row.TrangThaiLamViec,
      Email: row.Email,
      DienThoai: row.DienThoai,
      ChucDanh: row.ChucDanh,
      KhoaPhong: row.KhoaPhong ?? null,
      complianceStatus: {
        totalCredits: parseFloat(row.total_credits),
        requiredCredits: parseInt(row.required_credits),
        compliancePercentage: parseFloat(row.compliance_percentage),
        status: row.compliance_status as 'compliant' | 'at_risk' | 'non_compliant'
      }
    }));

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    };
  }

  async findPractitionersByIds(ids: string[]): Promise<PractitionerWithUnit[]> {
    if (!ids.length) {
      return [];
    }

    return db.query<PractitionerWithUnit>(
      `SELECT "MaNhanVien", "MaDonVi"
       FROM "${this.tableName}"
       WHERE "MaNhanVien" = ANY($1::uuid[])`,
      [ids],
    );
  }

  async resolveBulkCohortSelection(
    selection: BulkCohortSelection,
    context: CohortResolutionContext,
  ): Promise<CohortResolutionResult> {
    const normalizedSelection: BulkCohortSelection = {
      mode: selection.mode,
      selectedIds: Array.from(new Set(selection.selectedIds ?? [])),
      excludedIds: Array.from(new Set(selection.excludedIds ?? [])),
      filters: selection.filters ?? {},
      totalFiltered: selection.totalFiltered,
    };

    const errors: BulkSubmissionResultError[] = [];
    const excludedSet = new Set(normalizedSelection.excludedIds);

    if (isManualCohortSelection(normalizedSelection)) {
      const effectiveSelected = normalizedSelection.selectedIds.filter((id) => !excludedSet.has(id));

      if (!effectiveSelected.length) {
        return {
          practitioners: [],
          errors: [
            {
              practitionerId: 'manual_selection',
              error: 'No practitioners selected after exclusions',
            },
          ],
          normalizedSelection,
        };
      }

      const rows = await this.findPractitionersByIds(effectiveSelected);
      const foundSet = new Set(rows.map((row) => row.MaNhanVien));

      effectiveSelected.forEach((id) => {
        if (!foundSet.has(id)) {
          errors.push({ practitionerId: id, error: 'Practitioner not found' });
        }
      });

      return {
        practitioners: rows,
        errors,
        normalizedSelection,
      };
    }

    if (!isAllCohortSelection(normalizedSelection)) {
      throw new Error(`Unsupported cohort selection mode: ${normalizedSelection.mode}`);
    }

    const pageSize = context.pageSize ?? 500;
    const practitioners: PractitionerWithUnit[] = [];
    const baseClauses: string[] = [];
    const params: Array<string | number | null> = [];
    let paramIndex = 1;

    if (context.role === 'DonVi' && context.unitId) {
      baseClauses.push(`nv."MaDonVi" = $${paramIndex}`);
      params.push(context.unitId);
      paramIndex += 1;
    }

    const filters = normalizedSelection.filters ?? {};

    if (filters.trangThai && filters.trangThai !== 'all') {
      baseClauses.push(`nv."TrangThaiLamViec" = $${paramIndex}`);
      params.push(filters.trangThai);
      paramIndex += 1;
    }

    if (filters.chucDanh) {
      baseClauses.push(`LOWER(nv."ChucDanh") = LOWER($${paramIndex})`);
      params.push(filters.chucDanh);
      paramIndex += 1;
    }

    if (filters.khoaPhong) {
      baseClauses.push(`LOWER(nv."KhoaPhong") = LOWER($${paramIndex})`);
      params.push(filters.khoaPhong);
      paramIndex += 1;
    }

    if (filters.search) {
      baseClauses.push(`LOWER(nv."HoVaTen") LIKE LOWER($${paramIndex})`);
      params.push(`%${filters.search}%`);
      paramIndex += 1;
    }

    const whereClause = baseClauses.length > 0 ? baseClauses.join(' AND ') : '1=1';
    const baseQuery = `
      SELECT nv."MaNhanVien", nv."MaDonVi"
      FROM "${this.tableName}" nv
      WHERE ${whereClause}
      ORDER BY nv."HoVaTen" ASC
    `;

    const limitParamIndex = params.length + 1;
    const offsetParamIndex = params.length + 2;
    const paginatedQuery = `${baseQuery} LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`;

    let offset = 0;
    while (true) {
      const rows = await db.query<PractitionerWithUnit>(paginatedQuery, [...params, pageSize, offset]);
      if (!rows.length) {
        break;
      }

      practitioners.push(...rows);

      if (rows.length < pageSize) {
        break;
      }

      offset += pageSize;
    }

    const filteredRows = practitioners.filter((row) => !excludedSet.has(row.MaNhanVien));

    return {
      practitioners: filteredRows,
      errors,
      normalizedSelection,
    };
  }

  async validatePractitionersTenancy(
    practitionerIds: string[],
    unitId: string,
  ): Promise<string[]> {
    if (!practitionerIds.length) {
      return [];
    }

    const rows = await db.query<{ MaNhanVien: string }>(
      `SELECT "MaNhanVien"
       FROM "${this.tableName}"
       WHERE "MaNhanVien" = ANY($1::uuid[])
         AND "MaDonVi" <> $2`,
      [practitionerIds, unitId],
    );

    return rows.map((row) => row.MaNhanVien);
  }
}

// GhiNhanHoatDong (Activity Record) Repository
export class GhiNhanHoatDongRepository extends BaseRepository<GhiNhanHoatDong, CreateGhiNhanHoatDong, UpdateGhiNhanHoatDong> {
  constructor() {
    super('GhiNhanHoatDong');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaGhiNhan';
  }

  async findById(id: string): Promise<GhiNhanHoatDong | null> {
    return db.queryOne<GhiNhanHoatDong>(`SELECT * FROM "${this.tableName}" WHERE "MaGhiNhan" = $1`, [id]);
  }

  async findByPractitioner(practitionerId: string, limit?: number): Promise<GhiNhanHoatDong[]> {
    let query = `
      SELECT * FROM "${this.tableName}" 
      WHERE "MaNhanVien" = $1 
      ORDER BY "NgayBatDau" DESC, "NgayGhiNhan" DESC
    `;
    const params = [practitionerId];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit.toString());
    }

    return db.query<GhiNhanHoatDong>(query, params);
  }

  async existsByPractitionerAndName(practitionerId: string, activityName: string): Promise<boolean> {
    const normalizedName = activityName.trim();
    const row = await db.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(
        SELECT 1 FROM "${this.tableName}"
        WHERE "MaNhanVien" = $1
          AND LOWER("TenHoatDong") = LOWER($2)
      ) as "exists"`,
      [practitionerId, normalizedName],
    );

    return !!row?.exists;
  }

  async findDuplicatePractitionerIds(
    activityId: string,
    practitionerIds: string[],
  ): Promise<string[]> {
    if (!practitionerIds.length) {
      return [];
    }

    const rows = await db.query<{ MaNhanVien: string }>(
      `SELECT "MaNhanVien"
       FROM "${this.tableName}"
       WHERE "MaDanhMuc" = $1
         AND "MaNhanVien" = ANY($2::uuid[])`,
      [activityId, practitionerIds],
    );

    return rows.map((row) => row.MaNhanVien);
  }

  async bulkCreate(
    submissions: BulkSubmissionInsertInput[],
    options: { batchSize?: number } = {},
  ): Promise<BulkCreateResult> {
    if (!submissions.length) {
      return { inserted: [], conflicts: [] };
    }

    const batchSize = options.batchSize ?? 500;
    const inserted: GhiNhanHoatDong[] = [];
    const conflictSet = new Set<string>();

    await db.query('BEGIN');

    try {
      for (let index = 0; index < submissions.length; index += batchSize) {
        const batch = submissions.slice(index, index + batchSize);
        const { text, params, practitionerIds } = this.buildBulkInsertQuery(batch);
        const rows = await db.query<GhiNhanHoatDong>(text, params);
        inserted.push(...rows);

        const insertedIds = new Set(rows.map((row) => row.MaNhanVien));
        practitionerIds.forEach((id) => {
          if (!insertedIds.has(id)) {
            conflictSet.add(id);
          }
        });
      }

      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Bulk submission insert failed: ${message}`);
    }

    return {
      inserted,
      conflicts: Array.from(conflictSet),
    };
  }

  async findPendingApprovals(unitId?: string): Promise<GhiNhanHoatDong[]> {
    let query = `
      SELECT g.*, n."HoVaTen", n."MaDonVi"
      FROM "${this.tableName}" g
      JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
      WHERE g."TrangThaiDuyet" = 'ChoDuyet'
    `;
    const params: string[] = [];

    if (unitId) {
      query += ` AND n."MaDonVi" = $1`;
      params.push(unitId);
    }

    query += ` ORDER BY g."NgayGhiNhan" ASC`;

    return db.query<GhiNhanHoatDong>(query, params);
  }

  async approveActivity(activityId: string, approverId: string, comments?: string): Promise<GhiNhanHoatDong | null> {
    return this.update(activityId, {
      TrangThaiDuyet: 'DaDuyet',
      NgayDuyet: new Date(),
      GhiChuDuyet: comments,
    } as UpdateGhiNhanHoatDong);
  }

  async rejectActivity(activityId: string, approverId: string, reason: string): Promise<GhiNhanHoatDong | null> {
    return this.update(activityId, {
      TrangThaiDuyet: 'TuChoi',
      NgayDuyet: new Date(),
      GhiChuDuyet: reason,
    } as UpdateGhiNhanHoatDong);
  }

  private buildBulkInsertQuery(batch: BulkSubmissionInsertInput[]): {
    text: string;
    params: unknown[];
    practitionerIds: string[];
  } {
    const columns = [
      'MaNhanVien',
      'MaDanhMuc',
      'TenHoatDong',
      'NguoiNhap',
      'CreationMethod',
      'TrangThaiDuyet',
      'DonViToChuc',
      'NgayBatDau',
      'NgayKetThuc',
      'SoTiet',
      'SoGioTinChiQuyDoi',
      'HinhThucCapNhatKienThucYKhoa',
      'FileMinhChungUrl',
      'BangChungSoGiayChungNhan',
    ] as const;

    const values: unknown[] = [];

    const rowsSql = batch
      .map((submission, rowIndex) => {
        const offset = rowIndex * columns.length;
        values.push(
          submission.MaNhanVien,
          submission.MaDanhMuc,
          submission.TenHoatDong,
          submission.NguoiNhap,
          submission.CreationMethod,
          submission.TrangThaiDuyet,
          submission.DonViToChuc ?? null,
          submission.NgayBatDau ?? null,
          submission.NgayKetThuc ?? null,
          submission.SoTiet ?? null,
          submission.SoGioTinChiQuyDoi ?? 0,
          submission.HinhThucCapNhatKienThucYKhoa ?? null,
          submission.FileMinhChungUrl ?? null,
          submission.BangChungSoGiayChungNhan ?? null,
        );

        const placeholders = columns
          .map((_, columnIndex) => `$${offset + columnIndex + 1}`)
          .join(', ');

        return `(${placeholders})`;
      })
      .join(', ');

    const text = `
      INSERT INTO "${this.tableName}" (${columns.map((column) => `"${column}"`).join(', ')})
      VALUES ${rowsSql}
      ON CONFLICT ("MaNhanVien", "MaDanhMuc") WHERE "MaDanhMuc" IS NOT NULL
      DO NOTHING
      RETURNING *
    `;

    return {
      text,
      params: values,
      practitionerIds: batch.map((submission) => submission.MaNhanVien),
    };
  }

  /**
   * Update submission data (edit capability for DonVi role)
   * Only allows editing submissions in ChoDuyet status
   * Enforces tenant isolation via MaDonVi check
   * 
   * @param submissionId - ID of submission to update
   * @param data - Partial update data (validated by caller)
   * @param unitId - Unit ID for tenant isolation (required for DonVi role)
   * @returns Updated submission or null if not found/unauthorized
   */
  async updateSubmission(
    submissionId: string,
    data: Partial<UpdateGhiNhanHoatDong>,
    unitId?: string
  ): Promise<{ success: boolean; submission?: GhiNhanHoatDong; error?: string }> {
    // First, fetch the submission with practitioner data for tenant isolation
    const query = `
      SELECT g.*, n."MaDonVi"
      FROM "${this.tableName}" g
      INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
      WHERE g."MaGhiNhan" = $1
    `;

    const result = await db.queryOne<GhiNhanHoatDong & { MaDonVi: string }>(query, [submissionId]);

    if (!result) {
      return { success: false, error: 'Submission not found' };
    }

    // Check tenant isolation for DonVi role
    if (unitId && result.MaDonVi !== unitId) {
      return { success: false, error: 'Access denied: submission belongs to different unit' };
    }

    // Check status - only ChoDuyet can be edited
    if (result.TrangThaiDuyet !== 'ChoDuyet') {
      return { success: false, error: 'Only pending submissions can be edited' };
    }

    // Perform the update with parameterized query
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    // Build dynamic UPDATE SET clause
    Object.entries(data).forEach(([key, value]) => {
      // Skip undefined values and immutable fields
      if (value !== undefined && key !== 'MaNhanVien' && key !== 'NguoiNhap') {
        updateFields.push(`"${key}" = $${paramCount}`);
        updateValues.push(value);
        paramCount++;
      }
    });

    if (updateFields.length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    // Add submission ID and unit ID for WHERE clause
    const updateQuery = `
      UPDATE "${this.tableName}" g
      SET ${updateFields.join(', ')}
      FROM "NhanVien" n
      WHERE g."MaGhiNhan" = $${paramCount}
        AND g."MaNhanVien" = n."MaNhanVien"
        AND g."TrangThaiDuyet" = 'ChoDuyet'
        ${unitId ? `AND n."MaDonVi" = $${paramCount + 1}` : ''}
      RETURNING g.*
    `;

    updateValues.push(submissionId);
    if (unitId) {
      updateValues.push(unitId);
    }

    const updated = await db.queryOne<GhiNhanHoatDong>(updateQuery, updateValues);

    if (!updated) {
      return { success: false, error: 'Update failed or unauthorized' };
    }

    return { success: true, submission: updated };
  }

  /**
   * Bulk approve activities.
   * If unitId is provided, only records from that unit will be approved.
   * Only pending (ChoDuyet) items are affected.
   */
  async approveActivities(ids: string[], comments?: string | null, unitId?: string): Promise<{ updatedIds: string[] }> {
    if (!ids || ids.length === 0) return { updatedIds: [] };

    if (unitId) {
      const rows = await db.query<{ MaGhiNhan: string }>(
        `UPDATE "${this.tableName}" g
         SET "TrangThaiDuyet" = 'DaDuyet',
             "NgayDuyet" = NOW(),
             "GhiChuDuyet" = COALESCE($3, "GhiChuDuyet")
         FROM "NhanVien" n
         WHERE g."MaNhanVien" = n."MaNhanVien"
           AND g."MaGhiNhan" = ANY($1::uuid[])
           AND g."TrangThaiDuyet" = 'ChoDuyet'
           AND n."MaDonVi" = $2
         RETURNING g."MaGhiNhan"`,
        [ids, unitId, comments ?? null]
      );
      return { updatedIds: rows.map(r => r.MaGhiNhan) };
    }

    const rows = await db.query<{ MaGhiNhan: string }>(
      `UPDATE "${this.tableName}" g
       SET "TrangThaiDuyet" = 'DaDuyet',
           "NgayDuyet" = NOW(),
           "GhiChuDuyet" = COALESCE($2, "GhiChuDuyet")
       WHERE g."MaGhiNhan" = ANY($1::uuid[])
         AND g."TrangThaiDuyet" = 'ChoDuyet'
       RETURNING g."MaGhiNhan"`,
      [ids, comments ?? null]
    );
    return { updatedIds: rows.map(r => r.MaGhiNhan) };
  }

  /**
   * Bulk revoke approved activities (back to pending status).
   * If unitId is provided, only records from that unit will be revoked.
   * Only approved (DaDuyet) items are affected.
   * Appends revocation reason to existing comments.
   * 
   * @param ids - Array of submission IDs to revoke
   * @param reason - Mandatory reason for revocation (appended to existing comments)
   * @param unitId - Optional unit ID for tenant isolation (DonVi role)
   * @returns Object with array of successfully revoked submission IDs
   */
  async revokeActivities(ids: string[], reason: string, unitId?: string): Promise<{ updatedIds: string[] }> {
    if (!ids || ids.length === 0) return { updatedIds: [] };
    if (!reason || reason.trim() === '') {
      throw new Error('Revocation reason is required');
    }

    const revocationNote = `[HỦY DUYỆT: ${new Date().toISOString()}] ${reason.trim()}`;

    if (unitId) {
      const rows = await db.query<{ MaGhiNhan: string }>(
        `UPDATE "${this.tableName}" g
         SET "TrangThaiDuyet" = 'ChoDuyet',
             "NgayDuyet" = NULL,
             "NguoiDuyet" = NULL,
             "GhiChuDuyet" = CASE 
               WHEN "GhiChuDuyet" IS NULL OR "GhiChuDuyet" = '' THEN $3
               ELSE "GhiChuDuyet" || E'\\n' || $3
             END
         FROM "NhanVien" n
         WHERE g."MaNhanVien" = n."MaNhanVien"
           AND g."MaGhiNhan" = ANY($1::uuid[])
           AND g."TrangThaiDuyet" = 'DaDuyet'
           AND n."MaDonVi" = $2
         RETURNING g."MaGhiNhan"`,
        [ids, unitId, revocationNote]
      );
      return { updatedIds: rows.map(r => r.MaGhiNhan) };
    }

    const rows = await db.query<{ MaGhiNhan: string }>(
      `UPDATE "${this.tableName}" g
       SET "TrangThaiDuyet" = 'ChoDuyet',
           "NgayDuyet" = NULL,
           "NguoiDuyet" = NULL,
           "GhiChuDuyet" = CASE 
             WHEN "GhiChuDuyet" IS NULL OR "GhiChuDuyet" = '' THEN $2
             ELSE "GhiChuDuyet" || E'\\n' || $2
           END
       WHERE g."MaGhiNhan" = ANY($1::uuid[])
         AND g."TrangThaiDuyet" = 'DaDuyet'
       RETURNING g."MaGhiNhan"`,
      [ids, revocationNote]
    );
    return { updatedIds: rows.map(r => r.MaGhiNhan) };
  }

  async getActivityStats(unitId?: string): Promise<{
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  }> {
    const baseQuery = `
      FROM "${this.tableName}" g
      JOIN "NhanVien" n ON g."MaNhanVien" = n."MaNhanVien"
    `;
    let whereClause = '';
    const params: string[] = [];

    if (unitId) {
      whereClause = ' WHERE n."MaDonVi" = $1';
      params.push(unitId);
    }

    const [total, pending, approved, rejected] = await Promise.all([
      db.queryOne<{ count: string }>(`SELECT COUNT(*) as count ${baseQuery}${whereClause}`, params),
      db.queryOne<{ count: string }>(`SELECT COUNT(*) as count ${baseQuery}${whereClause}${whereClause ? ' AND' : ' WHERE'} g."TrangThaiDuyet" = 'ChoDuyet'`, params),
      db.queryOne<{ count: string }>(`SELECT COUNT(*) as count ${baseQuery}${whereClause}${whereClause ? ' AND' : ' WHERE'} g."TrangThaiDuyet" = 'DaDuyet'`, params),
      db.queryOne<{ count: string }>(`SELECT COUNT(*) as count ${baseQuery}${whereClause}${whereClause ? ' AND' : ' WHERE'} g."TrangThaiDuyet" = 'TuChoi'`, params),
    ]);

    return {
      total: parseInt(total?.count || '0', 10),
      pending: parseInt(pending?.count || '0', 10),
      approved: parseInt(approved?.count || '0', 10),
      rejected: parseInt(rejected?.count || '0', 10),
    };
  }

  /**
   * Search submissions with server-side filtering and pagination
   * Uses JOINs to avoid N+1 queries and fetch all related data in 2 queries
   * 
   * @param filters - Filter criteria including status, practitioner, unit, search term, and pagination
   * @returns Paginated result with enriched submission data
   */
  async search(filters: {
    status?: string;
    practitionerId?: string;
    unitId?: string;
    searchTerm?: string;
    page?: number;
    limit?: number;
  }): Promise<import('./schemas').PaginatedResult < import('./schemas').SubmissionListItem >> {
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    // Build WHERE clause with parameterized queries
    const whereClauses: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    // Filter by status
    if (filters.status) {
      whereClauses.push(`g."TrangThaiDuyet" = $${paramCount}`);
      params.push(filters.status);
      paramCount++;
    }

    // Filter by practitioner ID
    if (filters.practitionerId) {
      whereClauses.push(`g."MaNhanVien" = $${paramCount}`);
      params.push(filters.practitionerId);
      paramCount++;
    }

    // Filter by unit ID (via practitioner's unit)
    if (filters.unitId) {
      whereClauses.push(`n."MaDonVi" = $${paramCount}`);
      params.push(filters.unitId);
      paramCount++;
    }

    // Search by activity name or practitioner name (case-insensitive)
    if (filters.searchTerm) {
      whereClauses.push(`(
        LOWER(g."TenHoatDong") LIKE LOWER($${paramCount})
        OR LOWER(n."HoVaTen") LIKE LOWER($${paramCount})
      )`);
      params.push(`%${filters.searchTerm}%`);
      paramCount++;
    }

    const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Main query with JOINs to fetch all data (avoiding N+1)
    const dataQuery = `
      SELECT 
        g."MaGhiNhan",
        g."MaNhanVien",
        g."TenHoatDong",
        g."NgayGhiNhan",
        g."TrangThaiDuyet",
        g."CreationMethod" AS "CreationMethod",
        g."NguoiNhap" AS "creator_MaTaiKhoan",
        g."SoGioTinChiQuyDoi",
        g."NgayBatDau",
        g."NgayKetThuc",
        g."SoTiet",
        g."HinhThucCapNhatKienThucYKhoa",
        g."ChiTietVaiTro",
        g."DonViToChuc",
        g."BangChungSoGiayChungNhan",
        g."FileMinhChungUrl",
        g."NgayDuyet",
        g."GhiChuDuyet",
        -- Practitioner data
        n."HoVaTen" AS "practitioner_HoVaTen",
        n."SoCCHN" AS "practitioner_SoCCHN",
        n."ChucDanh" AS "practitioner_ChucDanh",
        -- Activity catalog data (nullable)
        dm."TenDanhMuc" AS "activityCatalog_TenDanhMuc",
        dm."LoaiHoatDong" AS "activityCatalog_LoaiHoatDong",
        dm."YeuCauMinhChung" AS "activityCatalog_YeuCauMinhChung",
        dm."GioToiThieu" AS "activityCatalog_GioToiThieu",
        dm."GioToiDa" AS "activityCatalog_GioToiDa",
        dm."TyLeQuyDoi" AS "activityCatalog_TyLeQuyDoi",
        -- Unit data (nullable)
        dv."TenDonVi" AS "unit_TenDonVi",
        tk."TenDangNhap" AS "creator_TenDangNhap",
        tk."QuyenHan" AS "creator_QuyenHan"
      FROM "${this.tableName}" g
      INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
      LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
      LEFT JOIN "DonVi" dv ON dv."MaDonVi" = n."MaDonVi"
      LEFT JOIN "TaiKhoan" tk ON tk."MaTaiKhoan" = g."NguoiNhap"
      ${whereClause}
      ORDER BY g."NgayGhiNhan" DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    params.push(limit, offset);

    // Count query (for total records)
    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM "${this.tableName}" g
      INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
      ${whereClause}
    `;

    // Execute both queries in parallel
    const [rows, countResult] = await Promise.all([
      db.query<any>(dataQuery, params),
      db.queryOne<{ total: number }>(countQuery, params.slice(0, -2)) // Remove limit/offset params for count
    ]);

    const total = countResult?.total || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // Map database rows to SubmissionListItem format
    const data: import('./schemas').SubmissionListItem[] = rows.map(row => {
      const soTietValue = row.SoTiet ? parseFloat(row.SoTiet) : null;
      const rawCredits = parseFloat(row.SoGioTinChiQuyDoi) || 0;

      const activityInfo = row.activityCatalog_TenDanhMuc
        ? {
          YeuCauMinhChung: row.activityCatalog_YeuCauMinhChung ?? false,
          TyLeQuyDoi: row.activityCatalog_TyLeQuyDoi !== null ? Number(row.activityCatalog_TyLeQuyDoi) : undefined,
          GioToiThieu: row.activityCatalog_GioToiThieu !== null ? Number(row.activityCatalog_GioToiThieu) : null,
          GioToiDa: row.activityCatalog_GioToiDa !== null ? Number(row.activityCatalog_GioToiDa) : null,
        }
        : undefined;

      const effectiveCredits = calculateEffectiveCredits({
        submission: {
          TrangThaiDuyet: row.TrangThaiDuyet,
          SoTiet: soTietValue,
          SoGioTinChiQuyDoi: rawCredits,
          FileMinhChungUrl: row.FileMinhChungUrl,
        },
        activity: activityInfo,
      });

      return {
        MaGhiNhan: row.MaGhiNhan,
        MaNhanVien: row.MaNhanVien,
        TenHoatDong: row.TenHoatDong,
        NgayGhiNhan: row.NgayGhiNhan?.toISOString() || '',
        TrangThaiDuyet: row.TrangThaiDuyet,
        CreationMethod: row.CreationMethod,
        creatorAccount: row.creator_MaTaiKhoan
          ? {
            MaTaiKhoan: row.creator_MaTaiKhoan,
            TenDangNhap: row.creator_TenDangNhap ?? 'Hệ thống',
            QuyenHan: row.creator_QuyenHan ?? 'system',
          }
          : null,
        SoGioTinChiQuyDoi: effectiveCredits,
        NgayBatDau: row.NgayBatDau?.toISOString() || null,
        NgayKetThuc: row.NgayKetThuc?.toISOString() || null,
        SoTiet: soTietValue,
        HinhThucCapNhatKienThucYKhoa: row.HinhThucCapNhatKienThucYKhoa,
        ChiTietVaiTro: row.ChiTietVaiTro,
        DonViToChuc: row.DonViToChuc,
        BangChungSoGiayChungNhan: row.BangChungSoGiayChungNhan,
        FileMinhChungUrl: row.FileMinhChungUrl,
        NgayDuyet: row.NgayDuyet?.toISOString() || null,
        NguoiDuyet: null,
        GhiChuDuyet: row.GhiChuDuyet,
        practitioner: {
          HoVaTen: row.practitioner_HoVaTen,
          SoCCHN: row.practitioner_SoCCHN,
          ChucDanh: row.practitioner_ChucDanh,
        },
        activityCatalog: row.activityCatalog_TenDanhMuc
          ? {
            TenDanhMuc: row.activityCatalog_TenDanhMuc,
            LoaiHoatDong: row.activityCatalog_LoaiHoatDong,
          }
          : null,
        unit: row.unit_TenDonVi
          ? {
            TenDonVi: row.unit_TenDonVi,
          }
          : null,
      };
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

}

// DonVi (Healthcare Unit) Repository
export class DonViRepository extends BaseRepository<DonVi, CreateDonVi, UpdateDonVi> {
  constructor() {
    super('DonVi');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaDonVi';
  }

  async findById(id: string): Promise<DonVi | null> {
    return db.queryOne<DonVi>(`SELECT * FROM "${this.tableName}" WHERE "MaDonVi" = $1`, [id]);
  }

  async findByLevel(level: string): Promise<DonVi[]> {
    return db.query<DonVi>(`
      SELECT * FROM "${this.tableName}" 
      WHERE "CapQuanLy" = $1 AND "TrangThai" = true
      ORDER BY "TenDonVi" ASC
    `, [level]);
  }

  async findChildren(parentId: string): Promise<DonVi[]> {
    return db.query<DonVi>(`
      SELECT * FROM "${this.tableName}" 
      WHERE "MaDonViCha" = $1 AND "TrangThai" = true
      ORDER BY "TenDonVi" ASC
    `, [parentId]);
  }

  async getHierarchy(): Promise<DonVi[]> {
    return db.query<DonVi>(`
      WITH RECURSIVE unit_hierarchy AS (
        SELECT *, 0 as level
        FROM "${this.tableName}"
        WHERE "MaDonViCha" IS NULL AND "TrangThai" = true
        
        UNION ALL
        
        SELECT u.*, h.level + 1
        FROM "${this.tableName}" u
        JOIN unit_hierarchy h ON u."MaDonViCha" = h."MaDonVi"
        WHERE u."TrangThai" = true
      )
      SELECT * FROM unit_hierarchy
      ORDER BY level, "TenDonVi"
    `);
  }
}

type ActivityStatusFilter = 'active' | 'pending' | 'expired';
type ActivityTypeFilter = DanhMucHoatDong['LoaiHoatDong'];

type CatalogFilterOptions = {
  search?: string;
  type?: ActivityTypeFilter;
  status?: ActivityStatusFilter;
};

type CatalogQueryOptions = CatalogFilterOptions & {
  limit?: number;
  offset?: number;
};

type UnitCatalogQueryOptions = CatalogQueryOptions & {
  unitId?: string | null;
  includeAllUnits?: boolean;
};

// DanhMucHoatDong (Activity Catalog) Repository
export class DanhMucHoatDongRepository extends BaseRepository<DanhMucHoatDong, CreateDanhMucHoatDong, UpdateDanhMucHoatDong> {
  constructor() {
    super('DanhMucHoatDong');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaDanhMuc';
  }

  async findById(id: string): Promise<DanhMucHoatDong | null> {
    return db.queryOne<DanhMucHoatDong>(`SELECT * FROM "${this.tableName}" WHERE "MaDanhMuc" = $1`, [id]);
  }

  private buildCatalogFilterClause(
    baseConditions: Array<{ condition: string; value?: unknown }>,
    filters: CatalogFilterOptions
  ): { whereClause: string; params: unknown[] } {
    const params: unknown[] = [];
    const conditions: string[] = [];

    const addCondition = (condition: string, value?: unknown) => {
      if (value === undefined) {
        conditions.push(condition);
        return;
      }

      params.push(value);
      const placeholder = `$${params.length}`;
      conditions.push(condition.replace('?', placeholder));
    };

    baseConditions.forEach(({ condition, value }) => addCondition(condition, value));
    addCondition('"DaXoaMem" = false');

    if (filters.search) {
      addCondition('LOWER("TenDanhMuc") LIKE LOWER(?)', `%${filters.search}%`);
    }

    if (filters.type) {
      addCondition('"LoaiHoatDong" = ?', filters.type);
    }

    if (filters.status === 'active') {
      addCondition('(("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE) AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE))');
    } else if (filters.status === 'pending') {
      addCondition('("HieuLucTu" IS NOT NULL AND "HieuLucTu" > CURRENT_DATE)');
    } else if (filters.status === 'expired') {
      addCondition('("HieuLucDen" IS NOT NULL AND "HieuLucDen" < CURRENT_DATE)');
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { whereClause, params };
  }

  async filterGlobalCatalog(options: CatalogQueryOptions = {}): Promise<{ items: DanhMucHoatDong[]; total: number }> {
    const { limit, offset, search, type, status } = options;

    const { whereClause, params } = this.buildCatalogFilterClause(
      [{ condition: '"MaDonVi" IS NULL' }],
      { search, type, status }
    );

    const selectBase = `
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      ${whereClause}
      ORDER BY "TenDanhMuc" ASC
    `;

    const dataParams = [...params];
    let dataQuery = selectBase;

    if (limit !== undefined) {
      dataQuery += ` LIMIT $${params.length + 1}`;
      dataParams.push(limit);

      if (offset !== undefined) {
        dataQuery += ` OFFSET $${params.length + 2}`;
        dataParams.push(offset);
      }
    }

    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "${this.tableName}"
      ${whereClause}
    `;

    const [rows, countRow] = await Promise.all([
      db.query<DanhMucHoatDong>(dataQuery, dataParams),
      db.queryOne<{ count: number }>(countQuery, params),
    ]);

    return {
      items: rows,
      total: countRow?.count ?? 0,
    };
  }

  async filterUnitCatalog(options: UnitCatalogQueryOptions = {}): Promise<{ items: DanhMucHoatDong[]; total: number }> {
    const { limit, offset, search, type, status, unitId, includeAllUnits } = options;

    const baseConditions: Array<{ condition: string; value?: unknown }> = [];

    if (includeAllUnits) {
      baseConditions.push({ condition: '"MaDonVi" IS NOT NULL' });
    } else {
      if (!unitId) {
        throw new Error('unitId is required when includeAllUnits is false');
      }
      baseConditions.push({ condition: '"MaDonVi" = ?', value: unitId });
    }

    const { whereClause, params } = this.buildCatalogFilterClause(baseConditions, { search, type, status });

    const selectBase = `
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      ${whereClause}
      ORDER BY "TenDanhMuc" ASC
    `;

    const dataParams = [...params];
    let dataQuery = selectBase;

    if (limit !== undefined) {
      dataQuery += ` LIMIT $${params.length + 1}`;
      dataParams.push(limit);

      if (offset !== undefined) {
        dataQuery += ` OFFSET $${params.length + 2}`;
        dataParams.push(offset);
      }
    }

    const countQuery = `
      SELECT COUNT(*)::int as count
      FROM "${this.tableName}"
      ${whereClause}
    `;

    const [rows, countRow] = await Promise.all([
      db.query<DanhMucHoatDong>(dataQuery, dataParams),
      db.queryOne<{ count: number }>(countQuery, params),
    ]);

    return {
      items: rows,
      total: countRow?.count ?? 0,
    };
  }

  /**
   * Find all global activities (visible to all units)
   * @param options - Pagination options
   * @returns Global activities that are not soft deleted
   */
  async findGlobal(options?: { limit?: number; offset?: number }): Promise<DanhMucHoatDong[]> {
    const { limit, offset } = options || {};

    let query = `
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      WHERE "MaDonVi" IS NULL
        AND "DaXoaMem" = false
      ORDER BY "TenDanhMuc" ASC
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (limit !== undefined) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(limit);

      if (offset !== undefined) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }
    }

    return db.query<DanhMucHoatDong>(query, params);
  }

  /**
   * Find unit-specific activities (excludes global)
   * @param unitId - The unit to query activities for
   * @param options - Pagination options
   * @returns Unit-specific activities that are not soft deleted
   */
  async findByUnit(unitId: string, options?: { limit?: number; offset?: number }): Promise<DanhMucHoatDong[]> {
    const { limit, offset } = options || {};

    let query = `
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      WHERE "MaDonVi" = $1
        AND "DaXoaMem" = false
      ORDER BY "TenDanhMuc" ASC
    `;

    const params: any[] = [unitId];
    let paramIndex = 2;

    if (limit !== undefined) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(limit);

      if (offset !== undefined) {
        query += ` OFFSET $${paramIndex++}`;
        params.push(offset);
      }
    }

    return db.query<DanhMucHoatDong>(query, params);
  }

  /**
   * Find all activities accessible to a unit (global + unit-specific) - OPTIMIZED
   * @param unitId - The unit to query activities for
   * @returns Object with global and unit activity arrays
   */
  async findAccessible(unitId: string): Promise<{ global: DanhMucHoatDong[], unit: DanhMucHoatDong[] }> {
    // Single query with conditional aggregation for better performance
    const results = await db.query<{
      is_global: boolean,
      // All activity columns
      "MaDanhMuc": string, "TenDanhMuc": string, "LoaiHoatDong": string,
      "DonViTinh": string, "TyLeQuyDoi": number, "GioToiThieu": number | null,
      "GioToiDa": number | null, "YeuCauMinhChung": boolean, "HieuLucTu": string | null,
      "HieuLucDen": string | null, "MaDonVi": string | null, "NguoiTao": string | null,
      "NguoiCapNhat": string | null, "TaoLuc": string, "CapNhatLuc": string,
      "TrangThai": string, "DaXoaMem": boolean
    }>(`
      SELECT
        "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
        "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
        "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai", "DaXoaMem",
        CASE WHEN "MaDonVi" IS NULL THEN true ELSE false END as is_global
      FROM "${this.tableName}"
      WHERE ("MaDonVi" IS NULL OR "MaDonVi" = $1)
        AND "DaXoaMem" = false
      ORDER BY is_global DESC, "TenDanhMuc" ASC
    `, [unitId]);

    // Partition results in JavaScript (faster than multiple queries)
    const global: DanhMucHoatDong[] = [];
    const unit: DanhMucHoatDong[] = [];

    for (const row of results) {
      const { is_global, ...activity } = row;
      // Convert string dates to Date objects to match schema
      const typedActivity = {
        ...activity,
        HieuLucTu: activity.HieuLucTu ? new Date(activity.HieuLucTu) : null,
        HieuLucDen: activity.HieuLucDen ? new Date(activity.HieuLucDen) : null,
        TaoLuc: new Date(activity.TaoLuc),
        CapNhatLuc: new Date(activity.CapNhatLuc),
      } as DanhMucHoatDong;

      if (is_global) {
        global.push(typedActivity);
      } else {
        unit.push(typedActivity);
      }
    }

    return { global, unit };
  }

  /**
   * Count global activities (visible to all units)
   * @returns Count of global activities that are not soft deleted
   */
  async countGlobal(): Promise<number> {
    const result = await db.queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE "MaDonVi" IS NULL AND "DaXoaMem" = false`
    );
    return result?.count || 0;
  }

  /**
   * Count unit-specific activities
   * @param unitId - The unit to count activities for (null for all units)
   * @returns Count of unit activities that are not soft deleted
   */
  async countByUnit(unitId?: string | null): Promise<number> {
    if (unitId) {
      const result = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE "MaDonVi" = $1 AND "DaXoaMem" = false`,
        [unitId]
      );
      return result?.count || 0;
    } else {
      // Count all unit activities (excluding global)
      const result = await db.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM "${this.tableName}" WHERE "MaDonVi" IS NOT NULL AND "DaXoaMem" = false`
      );
      return result?.count || 0;
    }
  }

  /**
   * Find all active activities (within validity period), optionally filtered by unit - OPTIMIZED
   * @param unitId - Optional unit ID to filter by (null for SoYTe to see all)
   * @returns Active activities that are not soft deleted
   */
  async findActive(unitId?: string | null): Promise<DanhMucHoatDong[]> {
    // Optimized: Single query with better WHERE clause ordering for PostgreSQL
    return db.query<DanhMucHoatDong>(`
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      WHERE "DaXoaMem" = false
        AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
        AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
        ${unitId ? 'AND ("MaDonVi" IS NULL OR "MaDonVi" = $1)' : ''}
      ORDER BY "TenDanhMuc" ASC
    `, unitId ? [unitId] : []);
  }

  /**
   * Find activities by type, optionally filtered by unit - OPTIMIZED
   * @param type - Activity type to filter by
   * @param unitId - Optional unit ID (null for SoYTe to see all)
   * @returns Activities of specified type that are not soft deleted
   */
  async findByType(type: string, unitId?: string | null): Promise<DanhMucHoatDong[]> {
    // Optimized: Better parameter ordering and WHERE clause optimization
    return db.query<DanhMucHoatDong>(`
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      WHERE "LoaiHoatDong" = $1
        AND "DaXoaMem" = false
        AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
        AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
        ${unitId ? 'AND ("MaDonVi" IS NULL OR "MaDonVi" = $2)' : ''}
      ORDER BY "TenDanhMuc" ASC
    `, unitId ? [type, unitId] : [type]);
  }

  /**
   * Create activity with ownership tracking
   * @param data - Activity data
   * @param creatorId - User ID creating the activity
   * @param unitId - Unit ID for unit-scoped activities (null for global)
   * @returns Created activity
   */
  async createWithOwnership(
    data: CreateDanhMucHoatDong & { MaDonVi?: string | null },
    creatorId: string,
    unitId: string | null
  ): Promise<DanhMucHoatDong> {
    const now = new Date();

    const activityData = {
      ...data,
      MaDonVi: unitId,
      NguoiTao: creatorId,
      TaoLuc: now,
      CapNhatLuc: now,
      TrangThai: data.TrangThai || 'Active',
      DaXoaMem: false,
    };

    return db.insert<DanhMucHoatDong>(this.tableName, activityData as Record<string, any>);
  }

  /**
   * Update activity with ownership tracking
   * @param id - Activity ID
   * @param data - Update data
   * @param updaterId - User ID updating the activity
   * @returns Updated activity
   */
  async updateWithOwnership(
    id: string,
    data: UpdateDanhMucHoatDong,
    updaterId: string
  ): Promise<DanhMucHoatDong | null> {
    const updateData = {
      ...data,
      NguoiCapNhat: updaterId,
      // CapNhatLuc is auto-updated by trigger
    };

    const results = await db.update<DanhMucHoatDong>(
      this.tableName,
      updateData as Record<string, any>,
      { MaDanhMuc: id }
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Check if user can mutate (update/delete) an activity
   * @param activityId - Activity ID to check
   * @param userRole - User's role (SoYTe, DonVi, etc.)
   * @param userUnitId - User's unit ID (null for SoYTe)
   * @returns Object with canMutate flag and reason if denied
   */
  async assertCanMutate(
    activityId: string,
    userRole: string,
    userUnitId: string | null
  ): Promise<{ canMutate: boolean; reason?: string; activity?: DanhMucHoatDong }> {
    // Load the activity
    const activity = await this.findById(activityId);

    if (!activity) {
      return { canMutate: false, reason: 'Activity not found' };
    }

    // Cannot mutate soft-deleted activities (must restore first)
    if (activity.DaXoaMem) {
      return { canMutate: false, reason: 'Cannot modify soft-deleted activity', activity };
    }

    // SoYTe can mutate any activity
    if (userRole === 'SoYTe') {
      return { canMutate: true, activity };
    }

    // DonVi can only mutate their own unit's activities
    if (userRole === 'DonVi') {
      if (!userUnitId) {
        return { canMutate: false, reason: 'User has no unit assigned', activity };
      }

      // Cannot mutate global activities
      if (activity.MaDonVi === null) {
        return { canMutate: false, reason: 'Cannot modify global activities', activity };
      }

      // Can only mutate own unit's activities
      if (activity.MaDonVi !== userUnitId) {
        return { canMutate: false, reason: 'Can only modify activities from your unit', activity };
      }

      return { canMutate: true, activity };
    }

    // Other roles cannot mutate activities
    return { canMutate: false, reason: 'Insufficient permissions', activity };
  }

  /**
   * Soft delete an activity
   * @param id - Activity ID to soft delete
   * @param userId - User performing the deletion
   * @returns Soft-deleted activity
   */
  async softDelete(id: string, userId: string): Promise<DanhMucHoatDong | null> {
    const results = await db.update<DanhMucHoatDong>(
      this.tableName,
      {
        DaXoaMem: true,
        NguoiCapNhat: userId,
        // CapNhatLuc is auto-updated by trigger
      },
      { MaDanhMuc: id }
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Restore a soft-deleted activity
   * @param id - Activity ID to restore
   * @param userId - User performing the restoration
   * @returns Restored activity
   */
  async restore(id: string, userId: string): Promise<DanhMucHoatDong | null> {
    const results = await db.update<DanhMucHoatDong>(
      this.tableName,
      {
        DaXoaMem: false,
        NguoiCapNhat: userId,
        // CapNhatLuc is auto-updated by trigger
      },
      { MaDanhMuc: id }
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Adopt a unit-specific activity to global scope (SoYTe only)
   * @param id - Activity ID to adopt
   * @param userId - SoYTe user performing the adoption
   * @returns Adopted activity
   */
  async adoptToGlobal(id: string, userId: string): Promise<DanhMucHoatDong | null> {
    const results = await db.update<DanhMucHoatDong>(
      this.tableName,
      {
        MaDonVi: null,
        NguoiCapNhat: userId,
        // CapNhatLuc is auto-updated by trigger
      },
      { MaDanhMuc: id }
    );

    return results.length > 0 ? results[0] : null;
  }

  /**
   * Find soft-deleted activities (for admin cleanup/restore) - OPTIMIZED
   * @param unitId - Optional unit ID to filter by (null for all)
   * @returns Soft-deleted activities
   */
  async findSoftDeleted(unitId?: string | null): Promise<DanhMucHoatDong[]> {
    // Optimized: Single query with conditional WHERE clause and specific columns
    return db.query<DanhMucHoatDong>(`
      SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
             "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
             "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
      FROM "${this.tableName}"
      WHERE "DaXoaMem" = true
        ${unitId ? 'AND "MaDonVi" = $1' : ''}
      ORDER BY "CapNhatLuc" DESC
    `, unitId ? [unitId] : []);
  }

  /**
   * Check if activity is referenced in submissions (for safe deletion)
   * @param activityId - Activity ID to check
   * @returns Count of referencing submissions
   */
  async countReferences(activityId: string): Promise<number> {
    const result = await db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM "GhiNhanHoatDong"
      WHERE "MaDanhMuc" = $1
    `, [activityId]);

    return parseInt(result?.count || '0', 10);
  }

  /**
   * Fast existence check for activity references (optimized for boolean checks)
   * @param activityId - Activity ID to check
   * @returns True if activity has any references, false otherwise
   */
  async hasReferences(activityId: string): Promise<boolean> {
    const result = await db.queryOne<{ exists: boolean }>(`
      SELECT EXISTS(
        SELECT 1
        FROM "GhiNhanHoatDong"
        WHERE "MaDanhMuc" = $1
      ) as exists
    `, [activityId]);

    return result?.exists ?? false;
  }

  /**
   * Batch check for multiple activities' existence - OPTIMIZED
   * @param activityIds - Array of activity IDs to check
   * @param unitId - Optional unit ID for permission filtering
   * @returns Map of activityId to existence boolean
   */
  async batchExists(activityIds: string[], unitId?: string): Promise<Map<string, boolean>> {
    if (activityIds.length === 0) {
      return new Map();
    }

    // Use ANY for efficient batch checking
    const result = await db.query<{ MaDanhMuc: string }>(`
      SELECT "MaDanhMuc"
      FROM "${this.tableName}"
      WHERE "MaDanhMuc" = ANY($1)
        AND "DaXoaMem" = false
        ${unitId ? 'AND ("MaDonVi" IS NULL OR "MaDonVi" = $2)' : ''}
    `, unitId ? [activityIds, unitId] : [activityIds]);

    const existenceMap = new Map<string, boolean>();
    activityIds.forEach(id => existenceMap.set(id, false));
    result.forEach(row => existenceMap.set(row.MaDanhMuc, true));

    return existenceMap;
  }

  /**
   * Find accessible activities with pagination - OPTIMIZED
   * @param unitId - Unit ID
   * @param page - Page number (1-indexed)
   * @param limit - Items per page
   * @param scope - Filter scope: 'all', 'global', 'unit'
   * @returns Paginated activities with metadata
   */
  async findAccessiblePaginated(
    unitId: string,
    page: number = 1,
    limit: number = 20,
    scope: 'all' | 'global' | 'unit' = 'all'
  ): Promise<{
    activities: DanhMucHoatDong[];
    pagination: { page: number; limit: number; total: number; totalPages: number; };
  }> {
    const offset = (page - 1) * limit;

    // Build WHERE condition based on scope
    let whereClause = '"DaXoaMem" = false';
    let countWhereClause = '"DaXoaMem" = false';
    const params: any[] = [];
    const countParams: any[] = [];

    switch (scope) {
      case 'global':
        whereClause += ' AND "MaDonVi" IS NULL';
        countWhereClause += ' AND "MaDonVi" IS NULL';
        break;
      case 'unit':
        whereClause += ' AND "MaDonVi" = $1';
        countWhereClause += ' AND "MaDonVi" = $1';
        params.push(unitId);
        countParams.push(unitId);
        break;
      case 'all':
      default:
        whereClause += ' AND ("MaDonVi" IS NULL OR "MaDonVi" = $1)';
        countWhereClause += ' AND ("MaDonVi" IS NULL OR "MaDonVi" = $1)';
        params.push(unitId);
        countParams.push(unitId);
        break;
    }

    // Execute count and data queries in parallel for better performance
    const [countResult, activitiesResult] = await Promise.all([
      db.queryOne<{ total: string }>(`
        SELECT COUNT(*) as total
        FROM "${this.tableName}"
        WHERE ${countWhereClause}
      `, countParams),

      db.query<DanhMucHoatDong>(`
        SELECT "MaDanhMuc", "TenDanhMuc", "LoaiHoatDong", "DonViTinh", "TyLeQuyDoi",
               "GioToiThieu", "GioToiDa", "YeuCauMinhChung", "HieuLucTu", "HieuLucDen",
               "MaDonVi", "NguoiTao", "NguoiCapNhat", "TaoLuc", "CapNhatLuc", "TrangThai"
        FROM "${this.tableName}"
        WHERE ${whereClause}
        ORDER BY "TenDanhMuc" ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset])
    ]);

    const total = parseInt(countResult?.total || '0', 10);
    const totalPages = Math.ceil(total / limit);

    return {
      activities: activitiesResult,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    };
  }
}

// ThongBao (Notification) Repository
export class ThongBaoRepository extends BaseRepository<ThongBao, CreateThongBao, UpdateThongBao> {
  constructor() {
    super('ThongBao');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaThongBao';
  }

  async findById(id: string): Promise<ThongBao | null> {
    return db.queryOne<ThongBao>(`SELECT * FROM "${this.tableName}" WHERE "MaThongBao" = $1`, [id]);
  }

  async findByUser(userId: string, limit?: number): Promise<ThongBao[]> {
    let query = `
      SELECT * FROM "${this.tableName}"
      WHERE "MaNguoiNhan" = $1
      ORDER BY "TaoLuc" DESC
    `;
    const params = [userId];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit.toString());
    }

    return db.query<ThongBao>(query, params);
  }

  async markAsRead(notificationId: string): Promise<ThongBao | null> {
    return this.update(notificationId, { TrangThai: 'DaDoc' } as UpdateThongBao);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const result = await db.queryOne<{ count: string }>(`
      SELECT COUNT(*) as count
      FROM "${this.tableName}"
      WHERE "MaNguoiNhan" = $1 AND "TrangThai" = 'Moi'
    `, [userId]);

    return parseInt(result?.count || '0', 10);
  }
}

// NhatKyHeThong (Audit Log) Repository
export class NhatKyHeThongRepository extends BaseRepository<NhatKyHeThong, CreateNhatKyHeThong, never> {
  constructor() {
    super('NhatKyHeThong');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaNhatKy';
  }

  async findById(id: string): Promise<NhatKyHeThong | null> {
    return db.queryOne<NhatKyHeThong>(`SELECT * FROM "${this.tableName}" WHERE "MaNhatKy" = $1`, [id]);
  }

  // Override update and delete to prevent modifications
  async update(): Promise<never> {
    throw new Error('Audit logs cannot be modified');
  }

  async delete(): Promise<never> {
    throw new Error('Audit logs cannot be deleted');
  }

  async logAction(
    userId: string | null,
    action: string,
    table: string,
    primaryKey: string | null,
    content: Record<string, any>,
    ipAddress?: string | null
  ): Promise<NhatKyHeThong> {
    return this.create({
      MaTaiKhoan: userId,
      HanhDong: action,
      Bang: table,
      KhoaChinh: primaryKey ?? null,
      NoiDung: content,
      DiaChiIP: ipAddress ?? null,
    });
  }

  async findByUser(userId: string, limit?: number): Promise<NhatKyHeThong[]> {
    let query = `
      SELECT * FROM "${this.tableName}"
      WHERE "MaTaiKhoan" = $1
      ORDER BY "ThoiGian" DESC
    `;
    const params = [userId];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit.toString());
    }

    return db.query<NhatKyHeThong>(query, params);
  }

  async findByTable(tableName: string, limit?: number): Promise<NhatKyHeThong[]> {
    let query = `
      SELECT * FROM "${this.tableName}"
      WHERE "Bang" = $1
      ORDER BY "ThoiGian" DESC
    `;
    const params = [tableName];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit.toString());
    }

    return db.query<NhatKyHeThong>(query, params);
  }

  /**
   * Log activity catalog changes with metadata
   * @param userId - User performing the action
   * @param action - Action type (CREATE, UPDATE, DELETE, SOFT_DELETE, RESTORE, ADOPT_TO_GLOBAL)
   * @param activityId - Activity ID
   * @param metadata - Additional context (scope, unitId, etc.)
   * @param ipAddress - Optional IP address
   * @returns Audit log entry
   */
  async logCatalogChange(
    userId: string,
    action: string,
    activityId: string,
    metadata: {
      activityName?: string;
      scope?: 'global' | 'unit';
      unitId?: string | null;
      scopeBefore?: 'global' | 'unit';
      scopeAfter?: 'global' | 'unit';
      actorRole?: string;
      [key: string]: any;
    },
    ipAddress?: string | null
  ): Promise<NhatKyHeThong> {
    return this.logAction(
      userId,
      action,
      'DanhMucHoatDong',
      activityId,
      metadata,
      ipAddress
    );
  }
}

// SaoLuuMinhChung (Evidence Backup) Repository
export class SaoLuuMinhChungRepository extends BaseRepository<
  import('./schemas').SaoLuuMinhChung,
  import('./schemas').CreateSaoLuuMinhChung,
  import('./schemas').UpdateSaoLuuMinhChung
> {
  constructor() {
    super('SaoLuuMinhChung');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaSaoLuu';
  }

  async findById(id: string): Promise<import('./schemas').SaoLuuMinhChung | null> {
    return db.queryOne<import('./schemas').SaoLuuMinhChung>(
      `SELECT * FROM "${this.tableName}" WHERE "MaSaoLuu" = $1`,
      [id]
    );
  }

  async findByUser(userId: string, limit?: number): Promise<import('./schemas').SaoLuuMinhChung[]> {
    let query = `
      SELECT * FROM "${this.tableName}"
      WHERE "MaTaiKhoan" = $1
      ORDER BY "NgayTao" DESC
    `;
    const params = [userId];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit.toString());
    }

    return db.query<import('./schemas').SaoLuuMinhChung>(query, params);
  }

  async findByUserSince(
    userId: string,
    since: Date,
  ): Promise<import('./schemas').SaoLuuMinhChung[]> {
    return db.query<import('./schemas').SaoLuuMinhChung>(
      `
        SELECT *
        FROM "${this.tableName}"
        WHERE "MaTaiKhoan" = $1
          AND "NgayTao" >= $2
        ORDER BY "NgayTao" DESC
      `,
      [userId, since],
    );
  }
}

// ChiTietSaoLuu (Backup Detail) Repository
export class ChiTietSaoLuuRepository extends BaseRepository<
  import('./schemas').ChiTietSaoLuu,
  import('./schemas').CreateChiTietSaoLuu,
  import('./schemas').UpdateChiTietSaoLuu
> {
  constructor() {
    super('ChiTietSaoLuu');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaChiTiet';
  }

  async findById(id: string): Promise<import('./schemas').ChiTietSaoLuu | null> {
    return db.queryOne<import('./schemas').ChiTietSaoLuu>(
      `SELECT * FROM "${this.tableName}" WHERE "MaChiTiet" = $1`,
      [id]
    );
  }

  async findByBackup(backupId: string): Promise<import('./schemas').ChiTietSaoLuu[]> {
    return db.query<import('./schemas').ChiTietSaoLuu>(
      `SELECT * FROM "${this.tableName}" WHERE "MaSaoLuu" = $1 ORDER BY "TrangThai" ASC`,
      [backupId]
    );
  }
}

// XoaMinhChung (File Deletion) Repository
export class XoaMinhChungRepository extends BaseRepository<
  import('./schemas').XoaMinhChung,
  import('./schemas').CreateXoaMinhChung,
  import('./schemas').UpdateXoaMinhChung
> {
  constructor() {
    super('XoaMinhChung');
  }

  protected getPrimaryKeyColumn(): string {
    return 'MaXoa';
  }

  async findById(id: string): Promise<import('./schemas').XoaMinhChung | null> {
    return db.queryOne<import('./schemas').XoaMinhChung>(
      `SELECT * FROM "${this.tableName}" WHERE "MaXoa" = $1`,
      [id]
    );
  }

  async findByUser(userId: string, limit?: number): Promise<import('./schemas').XoaMinhChung[]> {
    let query = `
      SELECT * FROM "${this.tableName}"
      WHERE "MaTaiKhoan" = $1
      ORDER BY "NgayThucHien" DESC
    `;
    const params = [userId];

    if (limit) {
      query += ` LIMIT $2`;
      params.push(limit.toString());
    }

    return db.query<import('./schemas').XoaMinhChung>(query, params);
  }
}

// Export repository instances
export const taiKhoanRepo = new TaiKhoanRepository();
export const nhanVienRepo = new NhanVienRepository();
export const ghiNhanHoatDongRepo = new GhiNhanHoatDongRepository();
export const donViRepo = new DonViRepository();
export const danhMucHoatDongRepo = new DanhMucHoatDongRepository();
export const thongBaoRepo = new ThongBaoRepository();
// Export the notification repository instance
export const notificationRepo = thongBaoRepo;
export const nhatKyHeThongRepo = new NhatKyHeThongRepository();
export const saoLuuMinhChungRepo = new SaoLuuMinhChungRepository();
export const chiTietSaoLuuRepo = new ChiTietSaoLuuRepository();
export const xoaMinhChungRepo = new XoaMinhChungRepository();

export interface DohUnitComparisonRow {
  id: string;
  name: string;
  type: string;
  totalPractitioners: number;
  activePractitioners: number;
  compliantPractitioners: number;
  complianceRate: number;
  pendingApprovals: number;
  totalCredits: number;
}

export interface DohUnitComparisonPage {
  items: DohUnitComparisonRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface DohUnitComparisonQuery {
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: Array<{ field: 'name' | 'compliance' | 'practitioners' | 'pending' | 'totalCredits'; direction: 'asc' | 'desc' }>;
  capQuanLy?: Exclude<(typeof CapQuanLySchema)['options'][number], 'SoYTe'>;
}

const DEFAULT_UNITS_PAGE_SIZE = 20;
const MAX_UNITS_PAGE_SIZE = 100;

function mapRawUnitMetricsRow(row: RawUnitMetricsRow): DohUnitComparisonRow {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    totalPractitioners: Number(row.total_practitioners ?? 0),
    activePractitioners: Number(row.active_practitioners ?? 0),
    compliantPractitioners: Number(row.compliant_practitioners ?? 0),
    complianceRate: Number(row.compliance_rate ?? 0),
    pendingApprovals: Number(row.pending_approvals ?? 0),
    totalCredits: Number(row.total_credits ?? 0),
  };
}

type RawUnitMetricsRow = {
  id: string;
  name: string;
  type: string;
  total_practitioners: number | string | null;
  active_practitioners: number | string | null;
  compliant_practitioners: number | string | null;
  compliance_rate: number | string | null;
  pending_approvals: number | string | null;
  total_credits: number | string | null;
};

export async function getDohUnitComparisonPage({
  search,
  page = 1,
  pageSize = DEFAULT_UNITS_PAGE_SIZE,
  sort = [
    { field: 'compliance', direction: 'desc' },
    { field: 'name', direction: 'asc' },
  ],
  capQuanLy,
}: DohUnitComparisonQuery): Promise<DohUnitComparisonPage> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const boundedPageSize = Math.min(
    Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : DEFAULT_UNITS_PAGE_SIZE),
    MAX_UNITS_PAGE_SIZE
  );
  const offset = (safePage - 1) * boundedPageSize;

  const queryParams: any[] = [];
  const whereParts = [`dv."TrangThai" = 'HoatDong'`, `dv."CapQuanLy" != 'SoYTe'`];

  if (capQuanLy) {
    queryParams.push(capQuanLy);
    whereParts.push(`dv."CapQuanLy" = $${queryParams.length}`);
  }

  if (search && search.trim()) {
    queryParams.push(`%${search.trim().toLowerCase()}%`);
    whereParts.push(`LOWER(dv."TenDonVi") LIKE $${queryParams.length}`);
  }

  const sortColumnMap: Record<string, string> = {
    name: `"name"`,
    compliance: `"compliance_rate"`,
    practitioners: `"active_practitioners"`,
    pending: `"pending_approvals"`,
    totalCredits: `"total_credits"`,
  };

  const validSorts =
    sort && Array.isArray(sort) && sort.length > 0
      ? sort.filter(
        (entry) =>
          entry &&
          sortColumnMap[entry.field] &&
          (entry.direction === 'asc' || entry.direction === 'desc')
      )
      : [];

  const orderByClause =
    validSorts.length > 0
      ? validSorts
        .map((entry) => `${sortColumnMap[entry.field]} ${entry.direction.toUpperCase()}`)
        .join(', ')
      : `"compliance_rate" DESC, "name" ASC`;

  // tie-breaker to ensure deterministic ordering
  const finalOrderBy = `${orderByClause}, "name" ASC`;

  const limitPlaceholder = `$${queryParams.length + 1}`;
  const offsetPlaceholder = `$${queryParams.length + 2}`;

  const baseCte = `
    WITH filtered_units AS (
      SELECT dv."MaDonVi", dv."TenDonVi", dv."CapQuanLy"
      FROM "DonVi" dv
      WHERE ${whereParts.join(' AND ')}
    ),
    practitioners AS (
      SELECT
        nv."MaDonVi",
        COUNT(*) AS total_practitioners,
        COUNT(*) FILTER (WHERE nv."TrangThaiLamViec" = 'DangLamViec') AS active_practitioners
      FROM "NhanVien" nv
      WHERE nv."MaDonVi" IN (SELECT "MaDonVi" FROM filtered_units)
      GROUP BY nv."MaDonVi"
    ),
    active_cycles AS (
      SELECT
        kc."MaNhanVien",
        kc."SoTinChiYeuCau",
        kc."NgayBatDau",
        kc."NgayKetThuc"
      FROM "KyCNKT" kc
      WHERE kc."TrangThai" = 'DangDienRa'
    ),
    activity_totals AS (
      SELECT
        nv."MaDonVi",
        nv."MaNhanVien",
        SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END
        ) AS approved_credits,
        SUM(CASE WHEN g."TrangThaiDuyet" = 'ChoDuyet' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND ac."MaNhanVien" IS NOT NULL
              AND g."NgayGhiNhan" BETWEEN ac."NgayBatDau" AND ac."NgayKetThuc"
              AND (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END
        ) AS cycle_credits,
        MAX(ac."SoTinChiYeuCau") AS required_credits
      FROM "NhanVien" nv
      LEFT JOIN "GhiNhanHoatDong" g ON g."MaNhanVien" = nv."MaNhanVien"
      LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
      LEFT JOIN active_cycles ac ON ac."MaNhanVien" = nv."MaNhanVien"
      WHERE nv."MaDonVi" IN (SELECT "MaDonVi" FROM filtered_units)
      GROUP BY nv."MaDonVi", nv."MaNhanVien"
    ),
    unit_metrics AS (
      SELECT
        fu."MaDonVi",
        fu."TenDonVi",
        fu."CapQuanLy",
        COALESCE(pr.total_practitioners, 0) AS total_practitioners,
        COALESCE(pr.active_practitioners, 0) AS active_practitioners,
        COALESCE(
          SUM(
            CASE
              WHEN at.required_credits IS NOT NULL
                AND at.required_credits > 0
                AND at.cycle_credits >= at.required_credits
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS compliant_practitioners,
        COALESCE(SUM(at.pending_approvals), 0) AS pending_approvals,
        COALESCE(SUM(at.approved_credits), 0) AS total_credits
      FROM filtered_units fu
      LEFT JOIN practitioners pr ON pr."MaDonVi" = fu."MaDonVi"
      LEFT JOIN activity_totals at ON at."MaDonVi" = fu."MaDonVi"
      GROUP BY
        fu."MaDonVi",
        fu."TenDonVi",
        fu."CapQuanLy",
        pr.total_practitioners,
        pr.active_practitioners
    )
  `;

  const selectStatement = `
    SELECT
      um."MaDonVi" AS id,
      um."TenDonVi" AS name,
      um."CapQuanLy" AS type,
      um.total_practitioners,
      um.active_practitioners,
      um.compliant_practitioners,
      CASE
        WHEN um.active_practitioners > 0
        THEN ROUND((um.compliant_practitioners::numeric / um.active_practitioners::numeric) * 100)
        ELSE 0
      END AS compliance_rate,
      um.pending_approvals,
      um.total_credits
    FROM unit_metrics um
  `;

  const paginatedQuery = `
    ${baseCte}
    ${selectStatement}
    ORDER BY ${finalOrderBy}
    LIMIT ${limitPlaceholder}
    OFFSET ${offsetPlaceholder}
  `;

  type RawUnitMetricsRow = {
    id: string;
    name: string;
    type: string;
    total_practitioners: number | string | null;
    active_practitioners: number | string | null;
    compliant_practitioners: number | string | null;
    compliance_rate: number | string | null;
    pending_approvals: number | string | null;
    total_credits: number | string | null;
  };

  const rows = await db.query<RawUnitMetricsRow>(paginatedQuery, [
    ...queryParams,
    boundedPageSize,
    offset,
  ]);

  const countQuery = `
    ${baseCte}
    SELECT COUNT(*)::bigint AS total_count
    FROM unit_metrics
  `;

  const countRows = await db.query<{ total_count: string | number | null }>(countQuery, queryParams);
  const totalItems = Number(countRows[0]?.total_count ?? 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / boundedPageSize) : 0;

  const items: DohUnitComparisonRow[] = rows.map(mapRawUnitMetricsRow);

  return {
    items,
    page: safePage,
    pageSize: boundedPageSize,
    totalItems,
    totalPages,
  };
}

export async function getDohUnitComparisonSummary(unitId: string): Promise<DohUnitComparisonRow | null> {
  if (!unitId) {
    return null;
  }

  const summaryQuery = `
    WITH filtered_units AS (
      SELECT dv."MaDonVi", dv."TenDonVi", dv."CapQuanLy"
      FROM "DonVi" dv
      WHERE dv."TrangThai" = 'HoatDong' AND dv."CapQuanLy" != 'SoYTe' AND dv."MaDonVi" = $1
    ),
    practitioners AS (
      SELECT
        nv."MaDonVi",
        COUNT(*) AS total_practitioners,
        COUNT(*) FILTER (WHERE nv."TrangThaiLamViec" = 'DangLamViec') AS active_practitioners
      FROM "NhanVien" nv
      WHERE nv."MaDonVi" IN (SELECT "MaDonVi" FROM filtered_units)
      GROUP BY nv."MaDonVi"
    ),
    active_cycles AS (
      SELECT
        kc."MaNhanVien",
        kc."SoTinChiYeuCau",
        kc."NgayBatDau",
        kc."NgayKetThuc"
      FROM "KyCNKT" kc
      WHERE kc."TrangThai" = 'DangDienRa'
    ),
    activity_totals AS (
      SELECT
        nv."MaDonVi",
        nv."MaNhanVien",
        SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END
        ) AS approved_credits,
        SUM(CASE WHEN g."TrangThaiDuyet" = 'ChoDuyet' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND ac."MaNhanVien" IS NOT NULL
              AND g."NgayGhiNhan" BETWEEN ac."NgayBatDau" AND ac."NgayKetThuc"
              AND (
                g."MaDanhMuc" IS NULL
                OR dm."YeuCauMinhChung" IS DISTINCT FROM TRUE
                OR (
                  dm."YeuCauMinhChung" = TRUE
                  AND g."FileMinhChungUrl" IS NOT NULL
                  AND BTRIM(g."FileMinhChungUrl") <> ''
                )
              )
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END
        ) AS cycle_credits,
        MAX(ac."SoTinChiYeuCau") AS required_credits
      FROM "NhanVien" nv
      LEFT JOIN "GhiNhanHoatDong" g ON g."MaNhanVien" = nv."MaNhanVien"
      LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
      LEFT JOIN active_cycles ac ON ac."MaNhanVien" = nv."MaNhanVien"
      WHERE nv."MaDonVi" IN (SELECT "MaDonVi" FROM filtered_units)
      GROUP BY nv."MaDonVi", nv."MaNhanVien"
    ),
    unit_metrics AS (
      SELECT
        fu."MaDonVi",
        fu."TenDonVi",
        fu."CapQuanLy",
        COALESCE(pr.total_practitioners, 0) AS total_practitioners,
        COALESCE(pr.active_practitioners, 0) AS active_practitioners,
        COALESCE(
          SUM(
            CASE
              WHEN at.required_credits IS NOT NULL
                AND at.required_credits > 0
                AND at.cycle_credits >= at.required_credits
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS compliant_practitioners,
        COALESCE(SUM(at.pending_approvals), 0) AS pending_approvals,
        COALESCE(SUM(at.approved_credits), 0) AS total_credits
      FROM filtered_units fu
      LEFT JOIN practitioners pr ON pr."MaDonVi" = fu."MaDonVi"
      LEFT JOIN activity_totals at ON at."MaDonVi" = fu."MaDonVi"
      GROUP BY
        fu."MaDonVi",
        fu."TenDonVi",
        fu."CapQuanLy",
        pr.total_practitioners,
        pr.active_practitioners
    )
    SELECT
      um."MaDonVi" AS id,
      um."TenDonVi" AS name,
      um."CapQuanLy" AS type,
      um.total_practitioners,
      um.active_practitioners,
      um.compliant_practitioners,
      CASE
        WHEN um.active_practitioners > 0
        THEN ROUND((um.compliant_practitioners::numeric / um.active_practitioners::numeric) * 100)
        ELSE 0
      END AS compliance_rate,
      um.pending_approvals,
      um.total_credits
    FROM unit_metrics um
  `;

  const rows = await db.query<RawUnitMetricsRow>(summaryQuery, [unitId]);
  const row = rows[0];
  if (!row) {
    return null;
  }

  return mapRawUnitMetricsRow(row);
}
