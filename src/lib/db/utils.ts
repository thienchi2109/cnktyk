import { db } from './client';
import { 
  taiKhoanRepo, 
  nhanVienRepo, 
  ghiNhanHoatDongRepo, 
  donViRepo,
  thongBaoRepo,
  nhatKyHeThongRepo 
} from './repositories';

// Database utility functions for common operations

// Health check utilities
export async function performHealthCheck() {
  try {
    const health = await db.testConnection();
    const info = await db.getDatabaseInfo();
    
    return {
      status: health ? 'healthy' : 'unhealthy',
      database: info.currentDatabase,
      user: info.currentUser,
      timestamp: new Date(),
      latency: health ? 'OK' : 'Failed'
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
  }
}

// User authentication utilities
export async function authenticateUser(username: string, password: string) {
  try {
    const user = await taiKhoanRepo.verifyPassword(username, password);
    if (!user) {
      return { success: false, message: 'Invalid credentials' };
    }

    if (!user.TrangThai) {
      return { success: false, message: 'Account is disabled' };
    }

    // Get user's unit information if applicable
    let unitInfo = null;
    if (user.MaDonVi) {
      unitInfo = await donViRepo.findById(user.MaDonVi);
    }

    return {
      success: true,
      user: {
        id: user.MaTaiKhoan,
        username: user.TenDangNhap,
        role: user.QuyenHan,
        unitId: user.MaDonVi,
        unit: unitInfo
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Authentication failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Dashboard data utilities
export async function getPractitionerDashboardData(practitionerId: string) {
  try {
    const practitioner = await nhanVienRepo.findById(practitionerId);
    if (!practitioner) {
      throw new Error('Practitioner not found');
    }

    const [
      complianceStatus,
      recentActivities,
      notifications,
      unreadCount
    ] = await Promise.all([
      nhanVienRepo.getComplianceStatus(practitionerId),
      ghiNhanHoatDongRepo.findByPractitioner(practitionerId, 10),
      thongBaoRepo.findByUser(practitionerId, 5),
      thongBaoRepo.getUnreadCount(practitionerId)
    ]);

    return {
      practitioner,
      compliance: complianceStatus,
      recentActivities,
      notifications,
      unreadNotifications: unreadCount
    };
  } catch (error) {
    throw new Error(`Failed to get practitioner dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getUnitDashboardData(unitId: string) {
  try {
    const [
      unit,
      practitioners,
      pendingApprovals,
      activityStats
    ] = await Promise.all([
      donViRepo.findById(unitId),
      nhanVienRepo.findByUnit(unitId),
      ghiNhanHoatDongRepo.findPendingApprovals(unitId),
      ghiNhanHoatDongRepo.getActivityStats(unitId)
    ]);

    if (!unit) {
      throw new Error('Unit not found');
    }

    // Calculate compliance statistics
    const complianceStats = await Promise.all(
      practitioners.map(async (p) => {
        const status = await nhanVienRepo.getComplianceStatus(p.MaNhanVien);
        return { practitioner: p, compliance: status };
      })
    );

    const totalPractitioners = practitioners.length;
    const compliantCount = complianceStats.filter(s => s.compliance.status === 'compliant').length;
    const atRiskCount = complianceStats.filter(s => s.compliance.status === 'at_risk').length;
    const nonCompliantCount = complianceStats.filter(s => s.compliance.status === 'non_compliant').length;

    return {
      unit,
      practitioners,
      pendingApprovals,
      activityStats,
      complianceOverview: {
        total: totalPractitioners,
        compliant: compliantCount,
        atRisk: atRiskCount,
        nonCompliant: nonCompliantCount,
        complianceRate: totalPractitioners > 0 ? (compliantCount / totalPractitioners) * 100 : 0
      },
      complianceDetails: complianceStats
    };
  } catch (error) {
    throw new Error(`Failed to get unit dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function getDepartmentDashboardData() {
  try {
    const [
      allUnits,
      allPractitioners,
      systemStats
    ] = await Promise.all([
      donViRepo.findAll(),
      nhanVienRepo.findAll(),
      ghiNhanHoatDongRepo.getActivityStats()
    ]);

    // Calculate system-wide compliance
    const compliancePromises = allPractitioners.map(async (p) => {
      const status = await nhanVienRepo.getComplianceStatus(p.MaNhanVien);
      return { practitioner: p, compliance: status };
    });

    const allComplianceData = await Promise.all(compliancePromises);

    const systemCompliance = {
      total: allPractitioners.length,
      compliant: allComplianceData.filter(s => s.compliance.status === 'compliant').length,
      atRisk: allComplianceData.filter(s => s.compliance.status === 'at_risk').length,
      nonCompliant: allComplianceData.filter(s => s.compliance.status === 'non_compliant').length
    };

    // Group by units for unit comparison
    const unitComparison = await Promise.all(
      allUnits.map(async (unit) => {
        const unitPractitioners = allPractitioners.filter(p => p.MaDonVi === unit.MaDonVi);
        const unitCompliance = allComplianceData.filter(s => s.practitioner.MaDonVi === unit.MaDonVi);
        
        return {
          unit,
          practitionerCount: unitPractitioners.length,
          complianceRate: unitPractitioners.length > 0 
            ? (unitCompliance.filter(s => s.compliance.status === 'compliant').length / unitPractitioners.length) * 100 
            : 0
        };
      })
    );

    return {
      systemOverview: {
        totalUnits: allUnits.length,
        totalPractitioners: allPractitioners.length,
        systemComplianceRate: systemCompliance.total > 0 
          ? (systemCompliance.compliant / systemCompliance.total) * 100 
          : 0,
        compliance: systemCompliance
      },
      activityStats: systemStats,
      unitComparison: unitComparison.sort((a, b) => b.complianceRate - a.complianceRate)
    };
  } catch (error) {
    throw new Error(`Failed to get department dashboard data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Activity management utilities
export async function submitActivity(activityData: any, submitterId: string) {
  try {
    // Create the activity record
    const activity = await ghiNhanHoatDongRepo.create({
      ...activityData,
      NguoiNhap: submitterId,
      TrangThaiDuyet: 'ChoDuyet'
    });

    // Log the action
    await nhatKyHeThongRepo.logAction(
      submitterId,
      'CREATE',
      'GhiNhanHoatDong',
      activity.MaGhiNhan,
      { activity: activity.TenHoatDong, credits: activity.SoTinChiQuyDoi }
    );

    // Create notification for unit administrators
    const practitioner = await nhanVienRepo.findById(activity.MaNhanVien);
    if (practitioner) {
      const unitAdmins = await taiKhoanRepo.findByUnit(practitioner.MaDonVi);
      const adminNotifications = unitAdmins
        .filter(admin => admin.QuyenHan === 'DonVi')
        .map(admin => thongBaoRepo.create({
          MaNguoiNhan: admin.MaTaiKhoan,
          Loai: 'ACTIVITY_SUBMISSION',
          ThongDiep: `New activity submission: ${activity.TenHoatDong} by ${practitioner.HoVaTen}`,
          LienKet: `/activities/${activity.MaGhiNhan}`,
          TrangThai: 'Moi'
        }));

      await Promise.all(adminNotifications);
    }

    return { success: true, activity };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to submit activity',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Audit logging utilities
export async function logUserAction(
  userId: string,
  action: string,
  table: string,
  recordId: string,
  details: Record<string, any>,
  ipAddress?: string
) {
  try {
    await nhatKyHeThongRepo.logAction(userId, action, table, recordId, details, ipAddress);
  } catch (error) {
    console.error('Failed to log user action:', error);
    // Don't throw error for audit logging failures to avoid breaking main operations
  }
}

// Search and filtering utilities
export async function searchPractitioners(
  searchTerm: string,
  filters: {
    unitId?: string;
    status?: string;
    complianceStatus?: 'compliant' | 'at_risk' | 'non_compliant';
  } = {}
) {
  try {
    let practitioners = await nhanVienRepo.searchByName(searchTerm, filters.unitId);

    if (filters.status) {
      practitioners = practitioners.filter(p => p.TrangThaiLamViec === filters.status);
    }

    if (filters.complianceStatus) {
      const practitionersWithCompliance = await Promise.all(
        practitioners.map(async (p) => {
          const compliance = await nhanVienRepo.getComplianceStatus(p.MaNhanVien);
          return { practitioner: p, compliance };
        })
      );

      const filtered = practitionersWithCompliance
        .filter(item => item.compliance.status === filters.complianceStatus)
        .map(item => item.practitioner);

      return filtered;
    }

    return practitioners;
  } catch (error) {
    throw new Error(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Export utilities for easy access
export const dbUtils = {
  health: performHealthCheck,
  auth: authenticateUser,
  dashboard: {
    practitioner: getPractitionerDashboardData,
    unit: getUnitDashboardData,
    department: getDepartmentDashboardData
  },
  activities: {
    submit: submitActivity
  },
  audit: logUserAction,
  search: {
    practitioners: searchPractitioners
  }
};