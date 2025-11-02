import { db } from './client';
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
} from './schemas';
import bcrypt from 'bcryptjs';

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
      SELECT COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total_credits
      FROM "GhiNhanHoatDong"
      WHERE "MaNhanVien" = $1 AND "TrangThaiDuyet" = 'DaDuyet'
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
      WITH compliance_data AS (
        SELECT 
          "MaNhanVien",
          COALESCE(SUM("SoGioTinChiQuyDoi"), 0) as total_credits,
          120 as required_credits,
          ROUND((COALESCE(SUM("SoGioTinChiQuyDoi"), 0) / 120.0) * 100, 2) as compliance_percentage,
          CASE
            WHEN (COALESCE(SUM("SoGioTinChiQuyDoi"), 0) / 120.0) * 100 >= 90 THEN 'compliant'
            WHEN (COALESCE(SUM("SoGioTinChiQuyDoi"), 0) / 120.0) * 100 >= 70 THEN 'at_risk'
            ELSE 'non_compliant'
          END as compliance_status
        FROM "GhiNhanHoatDong"
        WHERE "TrangThaiDuyet" = 'DaDuyet'
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
  }): Promise<import('./schemas').PaginatedResult<import('./schemas').SubmissionListItem>> {
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
        -- Unit data (nullable)
        dv."TenDonVi" AS "unit_TenDonVi"
      FROM "${this.tableName}" g
      INNER JOIN "NhanVien" n ON n."MaNhanVien" = g."MaNhanVien"
      LEFT JOIN "DanhMucHoatDong" dm ON dm."MaDanhMuc" = g."MaDanhMuc"
      LEFT JOIN "DonVi" dv ON dv."MaDonVi" = n."MaDonVi"
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
    const data: import('./schemas').SubmissionListItem[] = rows.map(row => ({
      MaGhiNhan: row.MaGhiNhan,
      MaNhanVien: row.MaNhanVien,
      TenHoatDong: row.TenHoatDong,
      NgayGhiNhan: row.NgayGhiNhan?.toISOString() || '',
      TrangThaiDuyet: row.TrangThaiDuyet,
      SoGioTinChiQuyDoi: parseFloat(row.SoGioTinChiQuyDoi) || 0,
      NgayBatDau: row.NgayBatDau?.toISOString() || null,
      NgayKetThuc: row.NgayKetThuc?.toISOString() || null,
      SoTiet: row.SoTiet ? parseFloat(row.SoTiet) : null,
      HinhThucCapNhatKienThucYKhoa: row.HinhThucCapNhatKienThucYKhoa,
      ChiTietVaiTro: row.ChiTietVaiTro,
      DonViToChuc: row.DonViToChuc,
      BangChungSoGiayChungNhan: row.BangChungSoGiayChungNhan,
      FileMinhChungUrl: row.FileMinhChungUrl,
      NgayDuyet: row.NgayDuyet?.toISOString() || null,
      NguoiDuyet: null, // Not fetched in this query (would require another JOIN with TaiKhoan)
      GhiChuDuyet: row.GhiChuDuyet,
      practitioner: {
        HoVaTen: row.practitioner_HoVaTen,
        SoCCHN: row.practitioner_SoCCHN,
        ChucDanh: row.practitioner_ChucDanh,
      },
      activityCatalog: row.activityCatalog_TenDanhMuc ? {
        TenDanhMuc: row.activityCatalog_TenDanhMuc,
        LoaiHoatDong: row.activityCatalog_LoaiHoatDong,
      } : null,
      unit: row.unit_TenDonVi ? {
        TenDonVi: row.unit_TenDonVi,
      } : null,
    }));

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

  /**
   * Find all global activities (visible to all units)
   * @returns Global activities that are not soft deleted
   */
  async findGlobal(): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "MaDonVi" IS NULL 
        AND "DaXoaMem" = false
      ORDER BY "TenDanhMuc" ASC
    `);
  }

  /**
   * Find unit-specific activities (excludes global)
   * @param unitId - The unit to query activities for
   * @returns Unit-specific activities that are not soft deleted
   */
  async findByUnit(unitId: string): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "MaDonVi" = $1 
        AND "DaXoaMem" = false
      ORDER BY "TenDanhMuc" ASC
    `, [unitId]);
  }

  /**
   * Find all activities accessible to a unit (global + unit-specific)
   * @param unitId - The unit to query activities for
   * @returns Object with global and unit activity arrays
   */
  async findAccessible(unitId: string): Promise<{ global: DanhMucHoatDong[], unit: DanhMucHoatDong[] }> {
    const global = await this.findGlobal();
    const unit = await this.findByUnit(unitId);
    
    return { global, unit };
  }

  /**
   * Find all active activities (within validity period), optionally filtered by unit
   * @param unitId - Optional unit ID to filter by (null for SoYTe to see all)
   * @returns Active activities that are not soft deleted
   */
  async findActive(unitId?: string | null): Promise<DanhMucHoatDong[]> {
    if (unitId === undefined || unitId === null) {
      // SoYTe: Return all active activities
      return db.query<DanhMucHoatDong>(`
        SELECT * FROM "${this.tableName}"
        WHERE ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
          AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
          AND "DaXoaMem" = false
        ORDER BY "TenDanhMuc" ASC
      `);
    }

    // DonVi: Return global + unit-specific active activities
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE ("MaDonVi" IS NULL OR "MaDonVi" = $1)
        AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
        AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
        AND "DaXoaMem" = false
      ORDER BY "TenDanhMuc" ASC
    `, [unitId]);
  }

  /**
   * Find activities by type, optionally filtered by unit
   * @param type - Activity type to filter by
   * @param unitId - Optional unit ID (null for SoYTe to see all)
   * @returns Activities of specified type that are not soft deleted
   */
  async findByType(type: string, unitId?: string | null): Promise<DanhMucHoatDong[]> {
    if (unitId === undefined || unitId === null) {
      // SoYTe: Return all activities of type
      return db.query<DanhMucHoatDong>(`
        SELECT * FROM "${this.tableName}"
        WHERE "LoaiHoatDong" = $1
          AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
          AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
          AND "DaXoaMem" = false
        ORDER BY "TenDanhMuc" ASC
      `, [type]);
    }

    // DonVi: Return global + unit-specific activities of type
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "LoaiHoatDong" = $1
        AND ("MaDonVi" IS NULL OR "MaDonVi" = $2)
        AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
        AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
        AND "DaXoaMem" = false
      ORDER BY "TenDanhMuc" ASC
    `, [type, unitId]);
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
   * Find soft-deleted activities (for admin cleanup/restore)
   * @param unitId - Optional unit ID to filter by (null for all)
   * @returns Soft-deleted activities
   */
  async findSoftDeleted(unitId?: string | null): Promise<DanhMucHoatDong[]> {
    if (unitId === undefined || unitId === null) {
      // SoYTe: Return all soft-deleted activities
      return db.query<DanhMucHoatDong>(`
        SELECT * FROM "${this.tableName}"
        WHERE "DaXoaMem" = true
        ORDER BY "CapNhatLuc" DESC
      `);
    }

    // DonVi: Return soft-deleted activities from their unit
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "DaXoaMem" = true
        AND "MaDonVi" = $1
      ORDER BY "CapNhatLuc" DESC
    `, [unitId]);
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
}: DohUnitComparisonQuery): Promise<DohUnitComparisonPage> {
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const boundedPageSize = Math.min(
    Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : DEFAULT_UNITS_PAGE_SIZE),
    MAX_UNITS_PAGE_SIZE
  );
  const offset = (safePage - 1) * boundedPageSize;

  const queryParams: any[] = [];
  const whereParts = [`dv."TrangThai" = 'HoatDong'`, `dv."CapQuanLy" != 'SoYTe'`];

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
        SUM(CASE WHEN g."TrangThaiDuyet" = 'DaDuyet' THEN g."SoGioTinChiQuyDoi" ELSE 0 END) AS approved_credits,
        SUM(CASE WHEN g."TrangThaiDuyet" = 'ChoDuyet' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND ac."MaNhanVien" IS NOT NULL
              AND g."NgayGhiNhan" BETWEEN ac."NgayBatDau" AND ac."NgayKetThuc"
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END
        ) AS cycle_credits,
        MAX(ac."SoTinChiYeuCau") AS required_credits
      FROM "NhanVien" nv
      LEFT JOIN "GhiNhanHoatDong" g ON g."MaNhanVien" = nv."MaNhanVien"
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
        SUM(CASE WHEN g."TrangThaiDuyet" = 'DaDuyet' THEN g."SoGioTinChiQuyDoi" ELSE 0 END) AS approved_credits,
        SUM(CASE WHEN g."TrangThaiDuyet" = 'ChoDuyet' THEN 1 ELSE 0 END) AS pending_approvals,
        SUM(
          CASE
            WHEN g."TrangThaiDuyet" = 'DaDuyet'
              AND ac."MaNhanVien" IS NOT NULL
              AND g."NgayGhiNhan" BETWEEN ac."NgayBatDau" AND ac."NgayKetThuc"
            THEN g."SoGioTinChiQuyDoi"
            ELSE 0
          END
        ) AS cycle_credits,
        MAX(ac."SoTinChiYeuCau") AS required_credits
      FROM "NhanVien" nv
      LEFT JOIN "GhiNhanHoatDong" g ON g."MaNhanVien" = nv."MaNhanVien"
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
