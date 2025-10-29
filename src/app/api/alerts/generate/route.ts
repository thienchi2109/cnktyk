import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { notificationRepo, nhanVienRepo, ghiNhanHoatDongRepo, taiKhoanRepo } from '@/lib/db/repositories';
import { v4 as uuidv4 } from 'uuid';

// Alert generation thresholds and rules
const ALERT_THRESHOLDS = {
  COMPLIANCE_WARNING: 0.7, // 70% - warn when below this
  COMPLIANCE_CRITICAL: 0.5, // 50% - critical when below this
  DAYS_BEFORE_DEADLINE: 30, // Alert 30 days before deadline
  INACTIVITY_DAYS: 90, // Alert after 90 days of no activity
};

const ALERT_TYPES = {
  COMPLIANCE_WARNING: 'compliance_warning',
  COMPLIANCE_CRITICAL: 'compliance_critical',
  DEADLINE_APPROACHING: 'deadline_approaching',
  ACTIVITY_OVERDUE: 'activity_overdue',
  SUBMISSION_APPROVED: 'submission_approved',
  SUBMISSION_REJECTED: 'submission_rejected',
  SYSTEM_MAINTENANCE: 'system_maintenance',
} as const;

// POST /api/alerts/generate - Generate alerts based on system rules
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    await requireRole(['SoYTe', 'DonVi']);

    const body = await request.json();
    const { alertType, targetUsers, customMessage } = body;

    const generatedAlerts = [];

    switch (alertType) {
      case 'compliance_check':
        // Generate compliance alerts for practitioners
        const practitioners = await nhanVienRepo.findAll();
        
        for (const practitioner of practitioners) {
          // Calculate compliance percentage (simplified - would need actual credit calculation)
          const activities = await ghiNhanHoatDongRepo.findByPractitioner(practitioner.MaNhanVien);
          const approvedActivities = activities.filter(a => a.TrangThaiDuyet === 'DaDuyet');
          
          // Simplified compliance calculation (would need proper credit rules)
          const totalCredits = approvedActivities.reduce((sum, activity) => sum + (activity.SoGioTinChiQuyDoi || 0), 0);
          const requiredCredits = 40; // Example requirement
          const compliancePercentage = totalCredits / requiredCredits;

          let alertMessage = '';
          let alertType = '';

          if (compliancePercentage < ALERT_THRESHOLDS.COMPLIANCE_CRITICAL) {
            alertType = ALERT_TYPES.COMPLIANCE_CRITICAL;
            alertMessage = `Cảnh báo nghiêm trọng: Bạn chỉ đạt ${(compliancePercentage * 100).toFixed(1)}% yêu cầu tín chỉ. Cần nộp hoạt động ngay lập tức.`;
          } else if (compliancePercentage < ALERT_THRESHOLDS.COMPLIANCE_WARNING) {
            alertType = ALERT_TYPES.COMPLIANCE_WARNING;
            alertMessage = `Cảnh báo: Bạn đạt ${(compliancePercentage * 100).toFixed(1)}% yêu cầu tín chỉ. Cần tăng cường hoạt động.`;
          }

          if (alertMessage) {
          // Find the user account for this practitioner by unit
          const unitUsers = await taiKhoanRepo.findByUnit(practitioner.MaDonVi);
          const practitionerUser = unitUsers.find(user => user.QuyenHan === 'NguoiHanhNghe');
          
          if (practitionerUser) {
            const notification = await notificationRepo.create({
              MaNguoiNhan: practitionerUser.MaTaiKhoan,
              Loai: alertType,
              ThongDiep: alertMessage,
              LienKet: '/submissions',
              TrangThai: 'Moi'
            });
            generatedAlerts.push(notification);
          }
        }
        }
        break;

      case 'deadline_reminder':
        // Generate deadline reminders
        const allPractitioners = await nhanVienRepo.findAll();
        
        for (const practitioner of allPractitioners) {
          // Find the user account for this practitioner by unit
          const unitUsers = await taiKhoanRepo.findByUnit(practitioner.MaDonVi);
          const practitionerUser = unitUsers.find(user => user.QuyenHan === 'NguoiHanhNghe');
          
          if (practitionerUser) {
            const notification = await notificationRepo.create({
              MaNguoiNhan: practitionerUser.MaTaiKhoan,
              Loai: ALERT_TYPES.DEADLINE_APPROACHING,
              ThongDiep: `Nhắc nhở: Còn ${ALERT_THRESHOLDS.DAYS_BEFORE_DEADLINE} ngày để hoàn thành yêu cầu tín chỉ năm học.`,
              LienKet: '/submissions',
              TrangThai: 'Moi'
            });
            generatedAlerts.push(notification);
          }
        }
        break;

      case 'custom':
        // Send custom message to specific users
        if (!targetUsers || !customMessage) {
          return NextResponse.json({ error: 'Target users and message required for custom alerts' }, { status: 400 });
        }

        for (const userId of targetUsers) {
          const notification = await notificationRepo.create({
            MaNguoiNhan: userId,
            Loai: 'custom',
            ThongDiep: customMessage,
            LienKet: null,
            TrangThai: 'Moi'
          });
          generatedAlerts.push(notification);
        }
        break;

      default:
        return NextResponse.json({ error: 'Invalid alert type' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedAlerts.length} alerts`,
      alerts: generatedAlerts,
      alertCount: generatedAlerts.length
    });
  } catch (error) {
    console.error('Error generating alerts:', error);
    return NextResponse.json(
      { error: 'Failed to generate alerts' },
      { status: 500 }
    );
  }
}