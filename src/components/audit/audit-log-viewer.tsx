'use client';

/**
 * Audit Log Viewer Component
 * Displays audit logs with filtering, search, and pagination
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronLeft, 
  ChevronRight,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Upload,
  FileText,
  User,
  Calendar,
} from 'lucide-react';

interface AuditLog {
  MaNhatKy: string;
  MaTaiKhoan?: string;
  TenDangNhap?: string;
  QuyenHan?: string;
  HanhDong: string;
  Bang?: string;
  KhoaChinh?: string;
  NoiDung?: any;
  ThoiGian: string;
  DiaChiIP?: string;
}

interface AuditLogViewerProps {
  initialFilters?: {
    userId?: string;
    action?: string;
    tableName?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

export function AuditLogViewer({ initialFilters }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters || {});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '50',
        ...(searchTerm && { searchTerm }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.tableName && { tableName: filters.tableName }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      });

      const response = await fetch(`/api/audit/logs?${params}`);
      const data = await response.json();

      if (data.success) {
        setLogs(data.data.logs);
        setTotalPages(data.data.totalPages);
        setTotal(data.data.total);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchLogs();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        ...(searchTerm && { searchTerm }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.tableName && { tableName: filters.tableName }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
      });

      const response = await fetch(`/api/audit/export?${params}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'UPDATE':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'DELETE':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'APPROVE':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'REJECT':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'UPLOAD':
        return <Upload className="w-4 h-4 text-purple-500" />;
      case 'LOGIN':
        return <User className="w-4 h-4 text-indigo-500" />;
      case 'LOGOUT':
        return <User className="w-4 h-4 text-gray-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      CREATE: 'Tạo mới',
      UPDATE: 'Cập nhật',
      DELETE: 'Xóa',
      APPROVE: 'Phê duyệt',
      REJECT: 'Từ chối',
      LOGIN: 'Đăng nhập',
      LOGOUT: 'Đăng xuất',
      UPLOAD: 'Tải lên',
      DOWNLOAD: 'Tải xuống',
      EXPORT: 'Xuất dữ liệu',
      IMPORT: 'Nhập dữ liệu',
    };
    return labels[action] || action;
  };

  const getRoleLabel = (role?: string) => {
    const labels: Record<string, string> = {
      SoYTe: 'Sở Y Tế',
      DonVi: 'Đơn vị',
      NguoiHanhNghe: 'Người hành nghề',
      Auditor: 'Kiểm toán viên',
    };
    return role ? labels[role] || role : 'N/A';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Nhật ký hệ thống
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Tổng số: {total.toLocaleString()} bản ghi
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="backdrop-blur-md bg-white/20 dark:bg-slate-900/20 border border-white/30 dark:border-slate-700/30 rounded-xl p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo người dùng, hành động, bảng..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tìm kiếm
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Bộ lọc
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-300 dark:border-slate-600 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Hành động
              </label>
              <select
                value={filters.action || ''}
                onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tất cả</option>
                <option value="CREATE">Tạo mới</option>
                <option value="UPDATE">Cập nhật</option>
                <option value="DELETE">Xóa</option>
                <option value="APPROVE">Phê duyệt</option>
                <option value="REJECT">Từ chối</option>
                <option value="LOGIN">Đăng nhập</option>
                <option value="LOGOUT">Đăng xuất</option>
                <option value="UPLOAD">Tải lên</option>
                <option value="EXPORT">Xuất dữ liệu</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value ? new Date(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value ? new Date(e.target.value) : undefined })}
                className="w-full px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="backdrop-blur-md bg-white/20 dark:bg-slate-900/20 border border-white/30 dark:border-slate-700/30 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Đang tải...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Không có dữ liệu</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100/50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Thời gian
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Người dùng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Hành động
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Bảng
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    IP
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Chi tiết
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {logs.map((log) => (
                  <tr 
                    key={log.MaNhatKy}
                    className="hover:bg-white/10 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {format(new Date(log.ThoiGian), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">
                        {log.TenDangNhap || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {getRoleLabel(log.QuyenHan)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {getActionIcon(log.HanhDong)}
                        <span className="text-gray-900 dark:text-gray-100">
                          {getActionLabel(log.HanhDong)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {log.Bang || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {log.DiaChiIP || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 bg-gray-50/50 dark:bg-slate-800/50 border-t border-gray-200 dark:border-slate-700 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Trang {page} / {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-slate-600 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border border-white/30 dark:border-slate-700/30 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  Chi tiết nhật ký
                </h3>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Thời gian</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {format(new Date(selectedLog.ThoiGian), 'dd/MM/yyyy HH:mm:ss', { locale: vi })}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Người dùng</label>
                  <p className="text-gray-900 dark:text-gray-100">
                    {selectedLog.TenDangNhap || 'N/A'} ({getRoleLabel(selectedLog.QuyenHan)})
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Hành động</label>
                  <p className="text-gray-900 dark:text-gray-100">{getActionLabel(selectedLog.HanhDong)}</p>
                </div>
                {selectedLog.Bang && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Bảng</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedLog.Bang}</p>
                  </div>
                )}
                {selectedLog.KhoaChinh && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Khóa chính</label>
                    <p className="text-gray-900 dark:text-gray-100 font-mono text-sm">{selectedLog.KhoaChinh}</p>
                  </div>
                )}
                {selectedLog.DiaChiIP && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Địa chỉ IP</label>
                    <p className="text-gray-900 dark:text-gray-100">{selectedLog.DiaChiIP}</p>
                  </div>
                )}
                {selectedLog.NoiDung && (
                  <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nội dung</label>
                    <pre className="mt-2 p-4 bg-gray-100 dark:bg-slate-800 rounded-lg text-sm text-gray-900 dark:text-gray-100 overflow-x-auto">
                      {JSON.stringify(selectedLog.NoiDung, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
