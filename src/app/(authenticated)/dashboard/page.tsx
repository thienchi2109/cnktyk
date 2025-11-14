import { requireAuth } from "@/lib/auth/server";
import { redirect } from 'next/navigation';
import { GlassCard } from "@/components/ui/glass-card";
import { LogoutButton } from "@/components/auth/logout-button";
import { Shield, User, Building, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await requireAuth();
  const { user } = session;

  // Redirect to role-specific dashboards
  if (user.role === 'SoYTe') {
    redirect('/dashboard/doh');
  }
  
  if (user.role === 'NguoiHanhNghe') {
    redirect('/dashboard/practitioner');
  }
  
  if (user.role === 'DonVi') {
    redirect('/dashboard/unit-admin');
  }

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "SoYTe":
        return "Sở Y Tế";
      case "DonVi":
        return "Đơn Vị";
      case "NguoiHanhNghe":
        return "Người Hành Nghề";
      case "Auditor":
        return "Kiểm Toán";
      default:
        return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "SoYTe":
        return <Building className="h-5 w-5 text-blue-600" />;
      case "DonVi":
        return <Building className="h-5 w-5 text-green-600" />;
      case "NguoiHanhNghe":
        return <User className="h-5 w-5 text-purple-600" />;
      case "Auditor":
        return <Shield className="h-5 w-5 text-orange-600" />;
      default:
        return <User className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 page-title mb-2">
              Dashboard
            </h1>
            <p className="text-gray-600">
              Chào mừng bạn đến với Hệ thống Quản lý đào tạo Nhân lực y tế
            </p>
          </div>
          <LogoutButton showIcon={true}>
            Đăng xuất
          </LogoutButton>
        </div>

        {/* User Info Card */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-blue-100/50 backdrop-blur-sm">
              {getRoleIcon(user.role)}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {user.username}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Shield className="h-4 w-4" />
                  <span>Vai trò: {getRoleDisplayName(user.role)}</span>
                </div>
                {user.unitId && (
                  <div className="flex items-center space-x-1">
                    <Building className="h-4 w-4" />
                    <span>Đơn vị: {user.unitId}</span>
                  </div>
                )}
                <div className="flex items-center space-x-1">
                  <Clock className="h-4 w-4" />
                  <span>ID: {user.id.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100/50">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Thông tin cá nhân</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Xem và cập nhật thông tin cá nhân của bạn
            </p>
            <div className="text-xs text-gray-500">
              Chức năng đang phát triển
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100/50">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Hoạt động cập nhật kiến thức y khoa liên tục</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Quản lý các hoạt động đào tạo liên tục
            </p>
            <div className="text-xs text-gray-500">
              Chức năng đang phát triển
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 rounded-lg bg-purple-100/50">
                <Building className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Báo cáo</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Xem báo cáo tiến độ và thống kê
            </p>
            <div className="text-xs text-gray-500">
              Chức năng đang phát triển
            </div>
          </GlassCard>
        </div>

        {/* Session Info (for testing) */}
        <GlassCard className="p-6 mt-6">
          <h3 className="font-semibold text-gray-900 mb-4">Thông tin phiên làm việc</h3>
          <div className="bg-gray-50/50 rounded-lg p-4 text-sm font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <strong>User ID:</strong> {user.id}
              </div>
              <div>
                <strong>Username:</strong> {user.username}
              </div>
              <div>
                <strong>Role:</strong> {user.role}
              </div>
              <div>
                <strong>Unit ID:</strong> {user.unitId || "N/A"}
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-500">
            <p>• JWT Token: Hết hạn sau 5 phút</p>
            <p>• Session: Hết hạn sau 2 giờ</p>
            <p>• Tự động làm mới token khi có hoạt động</p>
          </div>
        </GlassCard>
      </div>
  );
}