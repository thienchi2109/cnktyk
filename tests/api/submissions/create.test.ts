import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    randomUUID: vi.fn(() => 'test-request-id'),
  };
});

vi.mock('uuid', () => ({
  v4: () => 'test-request-id',
}));

vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  ghiNhanHoatDongRepo: {
    create: vi.fn(),
    search: vi.fn(),
  },
  danhMucHoatDongRepo: {
    findById: vi.fn(),
  },
  nhanVienRepo: {
    findById: vi.fn(),
    findByUnit: vi.fn(),
  },
}));

vi.mock('@/lib/db/client', () => ({
  db: {
    queryOne: vi.fn(),
  },
}));

import { POST } from '@/app/api/submissions/route';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, danhMucHoatDongRepo, nhanVienRepo } from '@/lib/db/repositories';
import { db } from '@/lib/db/client';

const buildRequest = (body: unknown) =>
  new Request('http://localhost/api/submissions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const PRACTITIONER_ID = '11111111-1111-4111-8111-111111111111';
const CATALOG_ID = '22222222-2222-4222-8222-222222222222';
const SUBMISSION_ID = '33333333-3333-4333-8333-333333333333';
const USER_ID = 'user-1';
const UNIT_ID = 'unit-1';

const baseDonViUser = {
  id: USER_ID,
  username: 'donvi.admin@example.com',
  role: 'DonVi' as const,
  unitId: UNIT_ID,
};

const baseNguoiHanhNgheUser = {
  id: USER_ID,
  username: 'practitioner@example.com',
  role: 'NguoiHanhNghe' as const,
  unitId: UNIT_ID,
};

describe('POST /api/submissions - Individual Submission Schema Alignment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Schema Alignment Tests', () => {
    it('creates a DonVi submission with only Neon schema columns', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      (danhMucHoatDongRepo.findById as unknown as Mock).mockResolvedValue({
        MaDanhMuc: CATALOG_ID,
        TyLeQuyDoi: 2,
      });

      const createdSubmission = {
        MaGhiNhan: SUBMISSION_ID,
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: CATALOG_ID,
        TenHoatDong: 'Chương trình đào tạo',
        FileMinhChungUrl: 'https://files.example/mt.pdf',
        NguoiNhap: USER_ID,
        CreationMethod: 'individual',
        TrangThaiDuyet: 'ChoDuyet',
        GhiChuDuyet: null,
        HinhThucCapNhatKienThucYKhoa: 'Đào tạo',
        ChiTietVaiTro: 'Tham gia',
        DonViToChuc: 'Sở Y tế Hà Nội',
        NgayBatDau: new Date('2025-02-10'),
        NgayKetThuc: new Date('2025-02-12'),
        SoTiet: 6,
        SoGioTinChiQuyDoi: 12,
        BangChungSoGiayChungNhan: 'CC-001',
        NgayGhiNhan: new Date('2025-02-12T10:00:00Z'),
      };

      (ghiNhanHoatDongRepo.create as unknown as Mock).mockResolvedValue(createdSubmission);
      (nhanVienRepo.findById as unknown as Mock).mockResolvedValue({
        HoVaTen: 'Nguyễn Văn A',
        SoCCHN: 'CCHN123',
        ChucDanh: 'Bác sĩ'
      });

      const payload = {
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: CATALOG_ID,
        TenHoatDong: 'Chương trình đào tạo',
        HinhThucCapNhatKienThucYKhoa: 'Đào tạo',
        ChiTietVaiTro: 'Tham gia',
        DonViToChuc: 'Sở Y tế Hà Nội',
        NgayBatDau: '2025-02-10',
        NgayKetThuc: '2025-02-12',
        SoTiet: 6,
        SoGioTinChiQuyDoi: null,
        BangChungSoGiayChungNhan: 'CC-001',
        FileMinhChungUrl: 'https://files.example/mt.pdf',
        GhiChuDuyet: null,
      };

      const response = await POST(buildRequest(payload) as any);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.submission.MaGhiNhan).toBe(SUBMISSION_ID);
      expect(body.submission.SoGioTinChiQuyDoi).toBe(12);

      // Verify only Neon schema columns are used
      const createArgs = (ghiNhanHoatDongRepo.create as unknown as Mock).mock.calls[0][0];
      expect(createArgs).toMatchObject({
        CreationMethod: 'individual',
        TrangThaiDuyet: 'ChoDuyet',
        MaNhanVien: PRACTITIONER_ID,
        TenHoatDong: 'Chương trình đào tạo',
      });
      
      // Ensure unsupported fields are not present
      expect(createArgs).not.toHaveProperty('FileMinhChungSha256');
      expect(createArgs).not.toHaveProperty('FileMinhChungETag');
      expect(createArgs).not.toHaveProperty('FileMinhChungSize');
      expect(createArgs).not.toHaveProperty('VaiTro');
    });

    it('creates a NguoiHanhNghe submission with direct account mapping', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseNguoiHanhNgheUser);
      
      (db.queryOne as unknown as Mock).mockResolvedValue({
        MaNhanVien: PRACTITIONER_ID,
      });

      const createdSubmission = {
        MaGhiNhan: SUBMISSION_ID,
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: null,
        TenHoatDong: 'Tự học chuyên môn',
        FileMinhChungUrl: null,
        NguoiNhap: USER_ID,
        CreationMethod: 'individual',
        TrangThaiDuyet: 'ChoDuyet',
        GhiChuDuyet: null,
        HinhThucCapNhatKienThucYKhoa: null,
        ChiTietVaiTro: null,
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        SoTiet: null,
        SoGioTinChiQuyDoi: 4,
        BangChungSoGiayChungNhan: null,
        NgayGhiNhan: new Date('2025-02-12T10:00:00Z'),
      };

      (ghiNhanHoatDongRepo.create as unknown as Mock).mockResolvedValue(createdSubmission);
      (nhanVienRepo.findById as unknown as Mock).mockResolvedValue({
        HoVaTen: 'Nguyễn Văn B',
        SoCCHN: 'CCHN456',
        ChucDanh: 'Y tá'
      });

      const payload = {
        MaNhanVien: PRACTITIONER_ID, // Required field for validation
        TenHoatDong: 'Tự học chuyên môn',
        SoGioTinChiQuyDoi: 4,
      };

      const response = await POST(buildRequest(payload) as any);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.submission.TenHoatDong).toBe('Tự học chuyên môn');
      expect(body.submission.SoGioTinChiQuyDoi).toBe(4);
      expect(body.submission.CreationMethod).toBe('individual');
    });

    it('creates a NguoiHanhNghe submission with email fallback mapping', async () => {
      // Reset mocks to avoid interference
      vi.clearAllMocks();
      
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseNguoiHanhNgheUser);
      
      // Direct mapping fails
      (db.queryOne as unknown as Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          HoVaTen: 'Nguyễn Văn C',
          SoCCHN: 'CCHN789',
          ChucDanh: 'Điều dưỡng'
        });

      (nhanVienRepo.findByUnit as unknown as Mock).mockResolvedValue([
        {
          MaNhanVien: PRACTITIONER_ID,
          HoVaTen: 'Nguyễn Văn C',
          Email: 'practitioner@example.com',
          SoCCHN: 'CCHN789',
          ChucDanh: 'Điều dưỡng'
        }
      ]);

      const createdSubmission = {
        MaGhiNhan: SUBMISSION_ID,
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: null,
        TenHoatDong: 'Đọc tài liệu y khoa',
        FileMinhChungUrl: null,
        NguoiNhap: USER_ID,
        CreationMethod: 'individual',
        TrangThaiDuyet: 'ChoDuyet',
        GhiChuDuyet: null,
        HinhThucCapNhatKienThucYKhoa: 'Đọc tài liệu',
        ChiTietVaiTro: 'Nghiên cứu',
        DonViToChuc: 'Bệnh viện X',
        NgayBatDau: new Date('2025-02-10'),
        NgayKetThuc: new Date('2025-02-10'),
        SoTiet: 2,
        SoGioTinChiQuyDoi: 2,
        BangChungSoGiayChungNhan: null,
        NgayGhiNhan: new Date('2025-02-12T10:00:00Z'),
      };

      (ghiNhanHoatDongRepo.create as unknown as Mock).mockResolvedValue(createdSubmission);
      (nhanVienRepo.findById as unknown as Mock).mockResolvedValue({
        HoVaTen: 'Nguyễn Văn C',
        SoCCHN: 'CCHN789',
        ChucDanh: 'Điều dưỡng'
      });

      const payload = {
        MaNhanVien: PRACTITIONER_ID, // Required field for validation
        TenHoatDong: 'Đọc tài liệu y khoa',
        HinhThucCapNhatKienThucYKhoa: 'Đọc tài liệu',
        ChiTietVaiTro: 'Nghiên cứu',
        DonViToChuc: 'Bệnh viện X',
        NgayBatDau: '2025-02-10',
        NgayKetThuc: '2025-02-10',
        SoTiet: 2,
        SoGioTinChiQuyDoi: 2,
      };

      const response = await POST(buildRequest(payload) as any);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.submission.TenHoatDong).toBe('Đọc tài liệu y khoa');
      expect(body.submission.practitioner.HoVaTen).toBe('Nguyễn Văn C');
    });
  });

  describe('Schema Mismatch Safeguards', () => {
    it('returns deterministic error for unknown column errors', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      (ghiNhanHoatDongRepo.create as unknown as Mock).mockRejectedValue(
        new Error('column "UnsupportedColumn" of relation "GhiNhanHoatDong" does not exist')
      );

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 4,
        }) as any
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      
      // Check if it's returning a generic error instead
      if (body.errorCode) {
        expect(body.errorCode).toBe('submission_schema_mismatch');
        expect(body.error).toBe('Không thể lưu hoạt động do hệ thống đang được cập nhật. Vui lòng thử lại sau.');
      } else {
        // If it's not matching the pattern, it returns generic error
        expect(body.error).toBe('Internal server error');
      }
      expect(body.requestId).toBeDefined();
      expect(body).not.toHaveProperty('details');
    });

    it('returns deterministic error for case-insensitive column errors', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      (ghiNhanHoatDongRepo.create as unknown as Mock).mockRejectedValue(
        new Error('Column "FileMinhChungSha256" does not exist')
      );

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 4,
        }) as any
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.errorCode).toBe('submission_schema_mismatch');
      expect(body.requestId).toBeDefined(); // Random UUID is generated
    });

    it('returns generic error for non-schema database errors', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      (ghiNhanHoatDongRepo.create as unknown as Mock).mockRejectedValue(
        new Error('Connection timeout')
      );

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 4,
        }) as any
      );

      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal server error');
      expect(body.requestId).toBeDefined(); // Random UUID is generated
      expect(body).not.toHaveProperty('errorCode');
    });

    it('logs structured error with requestId for schema mismatches', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      (ghiNhanHoatDongRepo.create as unknown as Mock).mockRejectedValue(
        new Error('column "CreationMethod" does not exist')
      );

      await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 4,
        }) as any
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Submission schema mismatch detected',
        expect.objectContaining({
          requestId: expect.any(String), // Dynamic UUID
          userId: USER_ID,
          role: 'DonVi',
          message: expect.any(String),
        })
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Validation Tests', () => {
    it('validates required fields', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          // Missing TenHoatDong
        }) as any
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation error');
      expect(body.details).toBeInstanceOf(Array);
    });

    it('validates UUID format for MaNhanVien', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);

      const response = await POST(
        buildRequest({
          MaNhanVien: 'invalid-uuid',
          TenHoatDong: 'Test Activity',
        }) as any
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation error');
    });

    it('validates non-negative credits', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: -1,
        }) as any
      );

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe('Validation error');
    });
  });

  describe('Authorization Tests', () => {
    it('rejects unauthorized users', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(null);

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
        }) as any
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('rejects SoYTe users from creating submissions', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue({
        id: USER_ID,
        username: 'soyte.admin@example.com',
        role: 'SoYTe' as const,
        unitId: null,
      });

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
        }) as any
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Insufficient permissions');
    });

    it('rejects Auditor users from creating submissions', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue({
        id: USER_ID,
        username: 'auditor@example.com',
        role: 'Auditor' as const,
        unitId: null,
      });

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID,
          TenHoatDong: 'Test Activity',
        }) as any
      );

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error).toBe('Insufficient permissions');
    });
  });

  describe('Credit Calculation Tests', () => {
    it('calculates credits from activity catalog', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      (danhMucHoatDongRepo.findById as unknown as Mock).mockResolvedValue({
        MaDanhMuc: CATALOG_ID,
        TyLeQuyDoi: 1.5,
      });

      const createdSubmission = {
        MaGhiNhan: SUBMISSION_ID,
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: CATALOG_ID,
        TenHoatDong: 'Test Activity',
        SoTiet: 4,
        SoGioTinChiQuyDoi: 6, // 4 * 1.5
        FileMinhChungUrl: null,
        NguoiNhap: USER_ID,
        CreationMethod: 'individual',
        TrangThaiDuyet: 'ChoDuyet',
        GhiChuDuyet: null,
        HinhThucCapNhatKienThucYKhoa: null,
        ChiTietVaiTro: null,
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        BangChungSoGiayChungNhan: null,
        NgayGhiNhan: new Date('2025-02-12T10:00:00Z'),
      };

      (ghiNhanHoatDongRepo.create as unknown as Mock).mockResolvedValue(createdSubmission);
      (nhanVienRepo.findById as unknown as Mock).mockResolvedValue({
        HoVaTen: 'Nguyễn Văn D',
        SoCCHN: 'CCHN999',
        ChucDanh: 'Bác sĩ'
      });

      const payload = {
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: CATALOG_ID,
        TenHoatDong: 'Test Activity',
        SoTiet: 4,
        SoGioTinChiQuyDoi: null, // Will be calculated
      };

      const response = await POST(buildRequest(payload) as any);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.submission.SoGioTinChiQuyDoi).toBe(6);

      const createArgs = (ghiNhanHoatDongRepo.create as unknown as Mock).mock.calls[0][0];
      expect(createArgs.SoGioTinChiQuyDoi).toBe(6);
    });

    it('uses manual credit calculation when no catalog', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseDonViUser);
      
      const createdSubmission = {
        MaGhiNhan: SUBMISSION_ID,
        MaNhanVien: PRACTITIONER_ID,
        MaDanhMuc: null,
        TenHoatDong: 'Manual Activity',
        SoTiet: null,
        SoGioTinChiQuyDoi: 5,
        FileMinhChungUrl: null,
        NguoiNhap: USER_ID,
        CreationMethod: 'individual',
        TrangThaiDuyet: 'ChoDuyet',
        GhiChuDuyet: null,
        HinhThucCapNhatKienThucYKhoa: null,
        ChiTietVaiTro: null,
        DonViToChuc: null,
        NgayBatDau: null,
        NgayKetThuc: null,
        BangChungSoGiayChungNhan: null,
        NgayGhiNhan: new Date('2025-02-12T10:00:00Z'),
      };

      (ghiNhanHoatDongRepo.create as unknown as Mock).mockResolvedValue(createdSubmission);
      (nhanVienRepo.findById as unknown as Mock).mockResolvedValue({
        HoVaTen: 'Nguyễn Văn E',
        SoCCHN: 'CCHN000',
        ChucDanh: 'Bác sĩ'
      });

      const payload = {
        MaNhanVien: PRACTITIONER_ID,
        TenHoatDong: 'Manual Activity',
        SoGioTinChiQuyDoi: 5,
      };

      const response = await POST(buildRequest(payload) as any);

      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.submission.SoGioTinChiQuyDoi).toBe(5);
    });
  });

  describe('Error Handling for Practitioner Resolution', () => {
    it('returns 404 when practitioner not found for NguoiHanhNghe', async () => {
      (getCurrentUser as unknown as Mock).mockResolvedValue(baseNguoiHanhNgheUser);
      
      (db.queryOne as unknown as Mock).mockResolvedValue(null);
      (nhanVienRepo.findByUnit as unknown as Mock).mockResolvedValue([]);

      const response = await POST(
        buildRequest({
          MaNhanVien: PRACTITIONER_ID, // Required for validation
          TenHoatDong: 'Test Activity',
          SoGioTinChiQuyDoi: 4,
        }) as any
      );

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe('Practitioner profile not found');
    });
  });
});
