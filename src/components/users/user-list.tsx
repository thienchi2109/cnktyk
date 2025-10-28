'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/glass-select';
import { Label } from '@/components/ui/label';
import { LoadingNotice } from '@/components/ui/loading-notice';
import { 
  Users, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Shield,
  Building,
  User,
  Eye
} from 'lucide-react';

interface User {
  MaTaiKhoan: string;
  TenDangNhap: string;
  QuyenHan: string;
  MaDonVi: string | null;
  TrangThai: boolean;
  TaoLuc: string;
}

interface Unit {
  MaDonVi: string;
  TenDonVi: string;
  CapQuanLy: string;
}

interface UserListProps {
  users: User[];
  units: Unit[];
  currentPage: number;
  totalPages: number;
  totalUsers: number;
  isLoading: boolean;
  isLoadingUnits?: boolean;
  onPageChange: (page: number) => void;
  onSearch: (search: string) => void;
  onFilterRole: (role: string) => void;
  onFilterUnit: (unitId: string) => void;
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
  onViewUser: (user: User) => void;
  onDeleteUser: (user: User) => void;
  currentUserRole: string;
}

const roleLabels: Record<string, string> = {
  SoYTe: 'Sở Y Tế',
  DonVi: 'Đơn Vị',
  NguoiHanhNghe: 'Người Hành Nghề',
  Auditor: 'Kiểm Toán',
};

const roleIcons: Record<string, React.ReactNode> = {
  SoYTe: <Shield className="h-4 w-4 text-medical-blue" />,
  DonVi: <Building className="h-4 w-4 text-medical-green" />,
  NguoiHanhNghe: <User className="h-4 w-4 text-medical-amber" />,
  Auditor: <Eye className="h-4 w-4 text-gray-500" />,
};

export function UserList({
  users,
  units,
  currentPage,
  totalPages,
  totalUsers,
  isLoading,
  isLoadingUnits = false,
  onPageChange,
  onSearch,
  onFilterRole,
  onFilterUnit,
  onCreateUser,
  onEditUser,
  onViewUser,
  onDeleteUser,
  currentUserRole,
}: UserListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleRoleFilter = (role: string) => {
    setSelectedRole(role);
    onFilterRole(role);
  };

  const handleUnitFilter = (unitId: string) => {
    setSelectedUnit(unitId);
    onFilterUnit(unitId);
  };

  const getUnitName = (unitId: string | null) => {
    if (!unitId) return 'Không có';
    const unit = units.find(u => u.MaDonVi === unitId);
    return unit ? `${unit.TenDonVi} (${unit.CapQuanLy})` : 'Không xác định';
  };

  const canManageUser = (user: User) => {
    if (currentUserRole === 'SoYTe') return true;
    if (currentUserRole === 'DonVi') {
      // Unit admins can only manage users in their unit
      return user.MaDonVi === units.find(u => u.CapQuanLy === 'DonVi')?.MaDonVi;
    }
    return false;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-medical-blue/10">
              <Users className="h-6 w-6 text-medical-blue" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Quản Lý Tài Khoản</h1>
          </div>
          <p className="text-gray-600">
            {currentUserRole === 'SoYTe' 
              ? `Quản lý người dùng trong hệ thống CNKTYKLT • ${totalUsers} tài khoản`
              : `Quản lý tài khoản người hành nghề trong đơn vị • ${totalUsers} tài khoản`
            }
          </p>
        </div>
        
        {['SoYTe', 'DonVi'].includes(currentUserRole) && (
          <GlassButton onClick={onCreateUser} className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Tạo Tài Khoản Mới
          </GlassButton>
        )}
      </div>

      {/* Filters */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-medical-blue" />
          <h3 className="font-semibold text-gray-900">Bộ Lọc & Tìm Kiếm</h3>
        </div>
        <div className={`grid grid-cols-1 gap-4 ${
          currentUserRole === 'SoYTe' ? 'md:grid-cols-3' : 'md:grid-cols-2'
        }`}>
          <div>
            <Label htmlFor="search" className="text-sm font-medium text-gray-700">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                type="text"
                placeholder="Nhập tên đăng nhập..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Role filter - Only visible for SoYTe users */}
          {currentUserRole === 'SoYTe' && (
            <div>
              <Label htmlFor="role-filter" className="text-sm font-medium text-gray-700">Quyền hạn</Label>
              <Select
                value={selectedRole}
                onChange={(e) => handleRoleFilter(e.target.value)}
              >
                <option value="">Tất cả quyền hạn</option>
                {Object.entries(roleLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </Select>
            </div>
          )}

          {/* Unit filter - Only visible for SoYTe users */}
          {currentUserRole === 'SoYTe' && (
            <div>
              <Label htmlFor="unit-filter" className="text-sm font-medium text-gray-700">Đơn vị</Label>
              <Select
                value={selectedUnit}
                onChange={(e) => handleUnitFilter(e.target.value)}
                disabled={isLoadingUnits}
              >
                <option value="">
                  {isLoadingUnits ? 'Đang tải...' : 'Tất cả đơn vị'}
                </option>
                {units.map((unit) => (
                  <option key={unit.MaDonVi} value={unit.MaDonVi}>
                    {unit.TenDonVi} ({unit.CapQuanLy})
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      </GlassCard>

      {/* User List */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-12">
            <LoadingNotice message="Đang tải danh sách tài khoản..." />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <div className="p-4 rounded-full bg-gray-100/50 w-fit mx-auto mb-4">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Không tìm thấy tài khoản</h3>
            <p className="text-gray-500">Thử điều chỉnh bộ lọc hoặc tạo tài khoản mới</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-200/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tài Khoản
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quyền Hạn
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Đơn Vị
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Trạng Thái
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ngày Tạo
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Thao Tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {users.map((user) => (
                    <tr
                      key={user.MaTaiKhoan}
                      className="hover:bg-gray-50/30 transition-colors cursor-pointer"
                      tabIndex={0}
                      role="button"
                      aria-label={`Xem chi tiết tài khoản ${user.TenDangNhap}`}
                      onClick={() => onViewUser(user)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') onViewUser(user);
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {user.TenDangNhap}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {user.MaTaiKhoan.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {roleIcons[user.QuyenHan]}
                          <span className="text-sm font-medium">
                            {roleLabels[user.QuyenHan]}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getUnitName(user.MaDonVi)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          user.TrangThai 
                            ? 'bg-medical-green/10 text-medical-green' 
                            : 'bg-medical-red/10 text-medical-red'
                        }`}>
                          {user.TrangThai ? 'Hoạt động' : 'Vô hiệu hóa'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.TaoLuc).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <GlassButton
                            size="sm"
                            variant="secondary"
                            onClick={(e) => { e.stopPropagation(); onViewUser(user); }}
                          >
                            <Eye className="h-4 w-4" />
                          </GlassButton>
                          
                          {canManageUser(user) && (
                            <>
                              <GlassButton
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); onEditUser(user); }}
                              >
                                <Edit className="h-4 w-4" />
                              </GlassButton>
                              
                              <GlassButton
                                size="sm"
                                variant="danger"
                                onClick={(e) => { e.stopPropagation(); onDeleteUser(user); }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </GlassButton>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200/50 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Trang {currentPage} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="secondary"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </GlassButton>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </div>
  );
}