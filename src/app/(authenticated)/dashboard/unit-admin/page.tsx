import { requireAuth } from "@/lib/auth/server";
import { redirect } from 'next/navigation';
import { UnitAdminDashboard } from "@/components/dashboard/unit-admin-dashboard";
import { donViRepo } from '@/lib/db/repositories';

export default async function UnitAdminDashboardPage() {
  const session = await requireAuth();
  const { user } = session;

  // Only allow DonVi (Unit Admin) role
  if (user.role !== 'DonVi') {
    redirect('/dashboard');
  }

  // Ensure unit ID is present
  if (!user.unitId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Lỗi cấu hình</h1>
          <p className="text-gray-600">Tài khoản của bạn chưa được gán đơn vị. Vui lòng liên hệ quản trị viên.</p>
        </div>
      </div>
    );
  }

  // Load unit info for create form
  const unit = await donViRepo.findById(user.unitId);
  const units = unit ? [{ MaDonVi: unit.MaDonVi, TenDonVi: unit.TenDonVi }] : [];

  return <UnitAdminDashboard userId={user.id} unitId={user.unitId} units={units} />;
}
