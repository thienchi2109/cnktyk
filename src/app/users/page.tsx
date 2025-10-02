'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAuth } from '@/lib/auth/hooks';
import { UserList } from '@/components/users/user-list';
import { UserForm } from '@/components/forms/user-form';
import { GlassModal } from '@/components/ui/glass-modal';
import { GlassCard } from '@/components/ui/glass-card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { CreateTaiKhoanSchema, UpdateTaiKhoanSchema } from '@/lib/db/schemas';

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

type UserFormData = z.infer<typeof CreateTaiKhoanSchema>;

export default function UsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check permissions
  const canManageUsers = user?.role && ['SoYTe', 'DonVi'].includes(user.role);

  // Fetch users
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (roleFilter) params.append('role', roleFilter);
      if (unitFilter) params.append('unitId', unitFilter);

      const response = await fetch(`/api/users?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
      setTotalPages(data.pagination.totalPages);
      setTotalUsers(data.pagination.total);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch units
  const fetchUnits = async () => {
    try {
      const response = await fetch('/api/units');
      if (response.ok) {
        const data = await response.json();
        setUnits(data.units || []);
      }
    } catch (error) {
      console.error('Failed to fetch units:', error);
    }
  };

  useEffect(() => {
    if (user && canManageUsers) {
      fetchUsers();
      fetchUnits();
    }
  }, [user, currentPage, searchTerm, roleFilter, unitFilter, canManageUsers]);

  // Handle user creation
  const handleCreateUser = async (userData: UserFormData | z.infer<typeof UpdateTaiKhoanSchema>) => {
    try {
      setIsSubmitting(true);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      setShowCreateModal(false);
      await fetchUsers();
    } catch (error) {
      throw error; // Re-throw to be handled by the form
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user update
  const handleUpdateUser = async (userData: Partial<UserFormData>) => {
    if (!selectedUser) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/users/${selectedUser.MaTaiKhoan}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update user');
      }

      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      throw error; // Re-throw to be handled by the form
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle user deletion
  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Bạn có chắc chắn muốn vô hiệu hóa tài khoản "${user.TenDangNhap}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.MaTaiKhoan}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete user');
      }

      await fetchUsers();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Handle search
  const handleSearch = (search: string) => {
    setSearchTerm(search);
    setCurrentPage(1); // Reset to first page
  };

  // Handle filters
  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleUnitFilter = (unitId: string) => {
    setUnitFilter(unitId);
    setCurrentPage(1);
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle modal actions
  const handleCreateClick = () => {
    setShowCreateModal(true);
  };

  const handleEditClick = (user: User) => {
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const handleViewClick = (user: User) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue"></div>
            <span className="text-gray-600">Đang tải...</span>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn cần đăng nhập để truy cập trang này.
            </AlertDescription>
          </Alert>
        </GlassCard>
      </div>
    );
  }

  if (!canManageUsers) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center">
        <GlassCard className="p-8 max-w-md">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn không có quyền truy cập trang quản lý tài khoản.
            </AlertDescription>
          </Alert>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-4">
      <div className="max-w-7xl mx-auto">
        {error && (
          <Alert className="mb-6 border-medical-red/20 bg-medical-red/5">
            <AlertCircle className="h-4 w-4 text-medical-red" />
            <AlertDescription className="text-medical-red">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <UserList
          users={users}
          units={units}
          currentPage={currentPage}
          totalPages={totalPages}
          totalUsers={totalUsers}
          isLoading={isLoading}
          onPageChange={handlePageChange}
          onSearch={handleSearch}
          onFilterRole={handleRoleFilter}
          onFilterUnit={handleUnitFilter}
          onCreateUser={handleCreateClick}
          onEditUser={handleEditClick}
          onViewUser={handleViewClick}
          onDeleteUser={handleDeleteUser}
          currentUserRole={user.role}
        />
      </div>

      {/* Create User Modal */}
      <GlassModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Tạo Tài Khoản Mới"
        size="lg"
      >
        <UserForm
          mode="create"
          units={units}
          onSubmit={handleCreateUser}
          onCancel={() => setShowCreateModal(false)}
          isLoading={isSubmitting}
          currentUserRole={user.role}
        />
      </GlassModal>

      {/* Edit User Modal */}
      <GlassModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Chỉnh Sửa Tài Khoản"
        size="lg"
      >
        {selectedUser && (
          <UserForm
            mode="edit"
            initialData={selectedUser as Partial<UserFormData>}
            units={units}
            onSubmit={handleUpdateUser}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedUser(null);
            }}
            isLoading={isSubmitting}
            currentUserRole={user?.role || 'NguoiHanhNghe'}
          />
        )}
      </GlassModal>

      {/* View User Modal */}
      <GlassModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setSelectedUser(null);
        }}
        title="Thông Tin Tài Khoản"
        size="lg"
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Tên Đăng Nhập</label>
                <p className="mt-1 text-gray-900">{selectedUser.TenDangNhap}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Quyền Hạn</label>
                <p className="mt-1 text-gray-900">{selectedUser.QuyenHan}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Đơn Vị</label>
                <p className="mt-1 text-gray-900">
                  {selectedUser.MaDonVi 
                    ? units.find(u => u.MaDonVi === selectedUser.MaDonVi)?.TenDonVi || 'Không xác định'
                    : 'Không có'
                  }
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Trạng Thái</label>
                <p className="mt-1 text-gray-900">
                  {selectedUser.TrangThai ? 'Hoạt động' : 'Vô hiệu hóa'}
                </p>
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium text-gray-500">Ngày Tạo</label>
                <p className="mt-1 text-gray-900">
                  {new Date(selectedUser.TaoLuc).toLocaleDateString('vi-VN')}
                </p>
              </div>
            </div>
          </div>
        )}
      </GlassModal>
    </div>
  );
}