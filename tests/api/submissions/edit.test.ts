import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before imports
vi.mock('@/lib/auth/server', () => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@/lib/db/repositories', () => ({
  ghiNhanHoatDongRepo: {
    findById: vi.fn(),
    updateSubmission: vi.fn(),
  },
  nhanVienRepo: {
    findById: vi.fn(),
  },
  danhMucHoatDongRepo: {
    findById: vi.fn(),
  },
  nhatKyHeThongRepo: {
    logAction: vi.fn(),
  },
}));

import { PATCH } from '@/app/api/submissions/[id]/route';
import { getCurrentUser } from '@/lib/auth/server';
import { ghiNhanHoatDongRepo, nhanVienRepo, danhMucHoatDongRepo, nhatKyHeThongRepo } from '@/lib/db/repositories';

async function makeRequest(submissionId: string, body?: any) {
  const req = new Request(`http://localhost/api/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : null,
  });
  const params = Promise.resolve({ id: submissionId });
  return (await PATCH(req as any, { params } as any)) as Response;
}

const mockPractitioner = {
  MaNhanVien: 'practitioner-1',
  HoVaTen: 'Nguyen Van A',
  SoCCHN: 'CCHN123',
  ChucDanh: 'Bác sĩ',
  Email: 'practitioner@example.com',
  DienThoai: '0901234567',
  MaDonVi: 'unit-1',
};

const mockSubmission = {
  MaGhiNhan: 'submission-1',
  MaNhanVien: 'practitioner-1',
  TenHoatDong: 'Original Activity',
  ChiTietVaiTro: 'Tham gia',
  TrangThaiDuyet: 'ChoDuyet',
  SoGioTinChiQuyDoi: 5.0,
  SoTiet: 10,
  NgayBatDau: new Date('2025-01-01'),
  NgayKetThuc: new Date('2025-01-02'),
  DonViToChuc: 'Original Org',
  BangChungSoGiayChungNhan: 'CERT-001',
  FileMinhChungUrl: 'https://example.com/file.pdf',
  MaDanhMuc: null,
};

const mockActivityCatalog = {
  MaDanhMuc: 'catalog-1',
  TenDanhMuc: 'Hội thảo',
  LoaiHoatDong: 'Hội thảo khoa học',
  TyLeQuyDoi: 1.0,
};

describe('PATCH /api/submissions/[id] - Edit Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 5.1 - Success cases
  describe('Success Cases', () => {
    it('successfully updates submission with valid data', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = {
        TenHoatDong: 'Updated Activity Name',
        SoGioTinChiQuyDoi: 7.5,
        SoTiet: 15,
        DonViToChuc: 'Updated Organization',
      };

      const updatedSubmission = { ...mockSubmission, ...updateData };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      const res = await makeRequest('submission-1', updateData);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.submission.TenHoatDong).toBe('Updated Activity Name');
      expect(body.submission.SoGioTinChiQuyDoi).toBe(7.5);
      expect(body.message).toBe('Submission updated successfully');

      // Verify audit logging was called
      expect(nhatKyHeThongRepo.logAction).toHaveBeenCalled();
    });

    it('successfully updates partial fields only', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = { TenHoatDong: 'Just Update Name' };
      const updatedSubmission = { ...mockSubmission, ...updateData };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      const res = await makeRequest('submission-1', updateData);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.submission.TenHoatDong).toBe('Just Update Name');
    });

    it('includes enriched practitioner data in response', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = { SoTiet: 20 };
      const updatedSubmission = { ...mockSubmission, ...updateData };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      const res = await makeRequest('submission-1', updateData);

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.submission.practitioner).toBeDefined();
      expect(body.submission.practitioner.HoVaTen).toBe('Nguyen Van A');
      expect(body.message).toBe('Submission updated successfully');
    });

    it('validates date constraints (end date after start date)', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = {
        NgayBatDau: '2025-02-01',
        NgayKetThuc: '2025-02-10',
      };
      const updatedSubmission = { ...mockSubmission, ...updateData };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      const res = await makeRequest('submission-1', updateData);

      expect(res.status).toBe(200);
    });
  });

  // 5.2 - Permission failures
  describe('Permission Failures', () => {
    it('returns 401 when user is not authenticated', async () => {
      (getCurrentUser as any).mockResolvedValueOnce(null);

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
    });

    it('returns 403 when user is not DonVi role', async () => {
      const user = { id: 'user-1', username: 'soyte@gov.vn', role: 'SoYTe', unitId: null };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Insufficient permissions');
      expect(body.error).toContain('unit admins');
    });

    it('returns 403 when user is NguoiHanhNghe role', async () => {
      const user = { id: 'user-1', username: 'practitioner@example.com', role: 'NguoiHanhNghe', unitId: null };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Insufficient permissions');
    });

    it('returns 403 when DonVi user tries to edit submission from different unit', async () => {
      const user = { id: 'user-1', username: 'admin@unit2.vn', role: 'DonVi', unitId: 'unit-2' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: false,
        error: 'Access denied: submission belongs to different unit',
      });

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toContain('Access denied');
    });
  });

  // 5.3 - Status validation
  describe('Status Validation', () => {
    it('returns 400 when trying to edit approved submission', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const approvedSubmission = { ...mockSubmission, TrangThaiDuyet: 'DaDuyet' };
      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(approvedSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: false,
        error: 'Only pending submissions can be edited',
      });

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('pending');
    });

    it('returns 400 when trying to edit rejected submission', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const rejectedSubmission = { ...mockSubmission, TrangThaiDuyet: 'TuChoi' };
      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(rejectedSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: false,
        error: 'Only pending submissions can be edited',
      });

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('pending');
    });
  });

  // 5.4 - Tenant isolation enforcement
  describe('Tenant Isolation Enforcement', () => {
    it('enforces tenant isolation at repository layer', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: { ...mockSubmission, TenHoatDong: 'Updated' },
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      await makeRequest('submission-1', { TenHoatDong: 'Updated' });

      // Verify updateSubmission was called with unitId for tenant isolation
      expect(ghiNhanHoatDongRepo.updateSubmission).toHaveBeenCalledWith(
        'submission-1',
        expect.any(Object),
        'unit-1'
      );
    });

    it('repository denies update when unitId mismatch', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      // Mock submission from different unit
      const otherUnitSubmission = { ...mockSubmission };
      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(otherUnitSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: false,
        error: 'Access denied: submission belongs to different unit',
      });

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(403);
    });

    it('returns 404 when submission not found', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: false,
        error: 'Submission not found',
      });

      const res = await makeRequest('nonexistent-id', { TenHoatDong: 'Test' });

      expect(res.status).toBe(404);
    });
  });

  // 5.5 - Audit logging
  describe('Audit Logging', () => {
    it('logs edit operation with before/after state when fields change', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = {
        SoGioTinChiQuyDoi: 10.0,
      };
      const updatedSubmission = { ...mockSubmission, SoGioTinChiQuyDoi: 10.0 };

      // Use submission with DIFFERENT value to ensure change is detected
      const originalData = { ...mockSubmission, SoGioTinChiQuyDoi: 5.5 };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(originalData);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      await makeRequest('submission-1', updateData);

      // Verify logging was called
      expect(nhatKyHeThongRepo.logAction).toHaveBeenCalled();
    });

    it('captures only changed fields in audit log', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = { SoTiet: 20 }; // Only one field changed
      const updatedSubmission = { ...mockSubmission, ...updateData };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);
      (nhatKyHeThongRepo.logAction as any).mockResolvedValueOnce(undefined);

      await makeRequest('submission-1', updateData);

      expect(nhatKyHeThongRepo.logAction).toHaveBeenCalledWith(
        'user-1',
        'SUA_GHI_NHAN_HOAT_DONG',
        'GhiNhanHoatDong',
        'submission-1',
        expect.objectContaining({
          changedFields: ['SoTiet'],
        }),
        null
      );
    });

    it('does not log when no fields actually changed', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      // Send same values as original
      const updateData = { TenHoatDong: 'Original Activity' };
      const updatedSubmission = { ...mockSubmission };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);

      await makeRequest('submission-1', updateData);

      // Should not log if no actual changes
      expect(nhatKyHeThongRepo.logAction).not.toHaveBeenCalled();
    });
  });

  // 5.6 - Form validation
  describe('Form Validation', () => {
    it('validates activity name minimum length', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', { TenHoatDong: '' });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
      expect(body.details).toBeDefined();
    });

    it('validates credits must be non-negative', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', { SoGioTinChiQuyDoi: -5 });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
    });

    it('validates SoTiet must be non-negative', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', { SoTiet: -10 });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
    });

    it('validates end date must be after start date', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', {
        NgayBatDau: '2025-02-10',
        NgayKetThuc: '2025-02-01', // Before start date
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
      expect(body.details.some((d: any) => d.message.includes('after'))).toBe(true);
    });

    it('validates URL format for file evidence', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', {
        FileMinhChungUrl: 'not-a-valid-url',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
    });

    it('allows empty string for optional file URL', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const updateData = { FileMinhChungUrl: '' };
      const updatedSubmission = { ...mockSubmission, FileMinhChungUrl: null };

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: true,
        submission: updatedSubmission,
      });
      (nhanVienRepo.findById as any).mockResolvedValueOnce(mockPractitioner);
      (danhMucHoatDongRepo.findById as any).mockResolvedValueOnce(null);

      const res = await makeRequest('submission-1', updateData);

      expect(res.status).toBe(200);
    });

    it('validates UUID format for MaDanhMuc', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const res = await makeRequest('submission-1', {
        MaDanhMuc: 'not-a-uuid',
      });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe('Validation error');
    });
  });

  // 5.7 - Error handling
  describe('Error Handling', () => {
    it('returns 500 when database error occurs', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (ghiNhanHoatDongRepo.findById as any).mockRejectedValueOnce(new Error('Database connection failed'));

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body.error).toBe('Internal server error');
    });

    it('returns 400 when repository returns "No valid fields to update" error', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      (ghiNhanHoatDongRepo.findById as any).mockResolvedValueOnce(mockSubmission);
      (ghiNhanHoatDongRepo.updateSubmission as any).mockResolvedValueOnce({
        success: false,
        error: 'No valid fields to update',
      });

      const res = await makeRequest('submission-1', { TenHoatDong: 'Test' });

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('No valid fields');
    });

    it('handles malformed JSON gracefully', async () => {
      const user = { id: 'user-1', username: 'admin@unit1.vn', role: 'DonVi', unitId: 'unit-1' };
      (getCurrentUser as any).mockResolvedValueOnce(user);

      const req = new Request('http://localhost/api/submissions/submission-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json{',
      });
      const params = Promise.resolve({ id: 'submission-1' });

      const res = (await PATCH(req as any, { params } as any)) as Response;

      expect(res.status).toBe(500);
    });
  });
});
