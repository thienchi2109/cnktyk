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
    const user = await this.findByUsername(username);
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

    if (complianceStatus) {
      sql += ` AND c.compliance_status = $${paramIndex++}`;
      params.push(complianceStatus);
    }

    // Close CTE and add pagination
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

  async findActive(): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
        AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
      ORDER BY "TenDanhMuc" ASC
    `);
  }

  async findByType(type: string): Promise<DanhMucHoatDong[]> {
    return db.query<DanhMucHoatDong>(`
      SELECT * FROM "${this.tableName}"
      WHERE "LoaiHoatDong" = $1
        AND ("HieuLucTu" IS NULL OR "HieuLucTu" <= CURRENT_DATE)
        AND ("HieuLucDen" IS NULL OR "HieuLucDen" >= CURRENT_DATE)
      ORDER BY "TenDanhMuc" ASC
    `, [type]);
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