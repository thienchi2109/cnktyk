'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Plus, Eye, Edit, Trash2, AlertTriangle, CheckCircle, Clock, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { PractitionerForm } from './practitioner-form';
import { PractitionerDetailSheet } from './practitioner-detail-sheet';
import { BulkImportSheet } from './bulk-import-sheet';

interface ComplianceStatus {
  totalCredits: number;
  requiredCredits: number;
  compliancePercentage: number;
  status: 'compliant' | 'at_risk' | 'non_compliant';
}

interface Practitioner {
  MaNhanVien: string;
  HoVaTen: string;
  SoCCHN?: string;
  NgayCapCCHN?: string;
  MaDonVi: string;
  TrangThaiLamViec: 'DangLamViec' | 'DaNghi' | 'TamHoan';
  Email?: string;
  DienThoai?: string;
  ChucDanh?: string;
  complianceStatus: ComplianceStatus;
}

interface Unit {
  MaDonVi: string;
  TenDonVi: string;
}

interface PractitionersListProps {
  userRole: string;
  userUnitId?: string;
  units?: Unit[];
}

export function PractitionersList({ userRole, userUnitId, units = [] }: PractitionersListProps) {
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedPractitionerId, setSelectedPractitionerId] = useState<string | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);
  const [showBulkImportSheet, setShowBulkImportSheet] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Phase 1: Server-side pagination and filtering
  const fetchPractitioners = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (unitFilter !== 'all') params.append('unitId', unitFilter);
      // Phase 1 Improvement: Send compliance filter to server
      if (complianceFilter !== 'all') params.append('complianceStatus', complianceFilter);

      const response = await fetch(`/api/practitioners?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch practitioners');
      }

      const data = await response.json();
      setPractitioners(data.data || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPractitioners();
  }, [page, searchTerm, statusFilter, unitFilter, complianceFilter]); // Added complianceFilter

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page when searching
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleUnitFilter = (value: string) => {
    setUnitFilter(value);
    setPage(1);
  };

  const handleComplianceFilter = (value: string) => {
    setComplianceFilter(value);
    setPage(1); // Reset to first page when filter changes
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DangLamViec':
        return <Badge variant="default" className="bg-green-100 text-green-800">Đang làm việc</Badge>;
      case 'TamHoan':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Tạm hoãn</Badge>;
      case 'DaNghi':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Đã nghỉ</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getComplianceBadge = (complianceStatus: ComplianceStatus) => {
    const { compliancePercentage, status } = complianceStatus;
    
    switch (status) {
      case 'compliant':
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            {compliancePercentage.toFixed(0)}%
          </Badge>
        );
      case 'at_risk':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            {compliancePercentage.toFixed(0)}%
          </Badge>
        );
      case 'non_compliant':
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            {compliancePercentage.toFixed(0)}%
          </Badge>
        );
      default:
        return <Badge variant="outline">{compliancePercentage.toFixed(0)}%</Badge>;
    }
  };

  // Phase 1: No client-side filtering needed - all filtering done on server
  const filteredPractitioners = practitioners;

  const canCreatePractitioner = ['SoYTe', 'DonVi'].includes(userRole);
  const canEditPractitioner = ['SoYTe', 'DonVi'].includes(userRole);

  if (loading && practitioners.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Người hành nghề</h1>
          <p className="text-gray-600">Quản lý người hành nghề y tế và trạng thái tuân thủ</p>
        </div>
        {canCreatePractitioner && (
          <div className="flex gap-3">
            {/* Bulk Import Button - DonVi only */}
            {userRole === 'DonVi' && (
              <Button
                variant="outline"
                onClick={() => setShowBulkImportSheet(true)}
                className="rounded-full shadow-sm hover:shadow-md transition-shadow"
                size="default"
              >
                <Upload className="w-4 h-4 mr-2" />
                Nhập hàng loạt
              </Button>
            )}
            
            {/* Add Single Practitioner */}
            <Sheet open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <SheetTrigger asChild>
                <Button className="rounded-full shadow-sm hover:shadow-md transition-shadow">
                  <Plus className="w-4 h-4 mr-2" />
                  Thêm người hành nghề
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-3xl overflow-y-auto" side="right">
                <SheetHeader>
                  <SheetTitle>Đăng ký người hành nghề mới</SheetTitle>
                  <SheetDescription>
                    Thêm người hành nghề y tế mới vào hệ thống
                  </SheetDescription>
                </SheetHeader>
                <div className="mt-6">
                  <PractitionerForm
                    unitId={userRole === 'DonVi' ? userUnitId : undefined}
                    units={userRole === 'SoYTe' ? units : units.filter(u => u.MaDonVi === userUnitId)}
                    onSuccess={() => {
                      setShowCreateDialog(false);
                      fetchPractitioners();
                    }}
                    onCancel={() => setShowCreateDialog(false)}
                    mode="create"
                    variant="sheet"
                  />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Tìm kiếm & Lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Tìm theo tên..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trạng thái làm việc</label>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="all">Tất cả trạng thái</SelectItem>
                  <SelectItem value="DangLamViec">Đang làm việc</SelectItem>
                  <SelectItem value="TamHoan">Tạm hoãn</SelectItem>
                  <SelectItem value="DaNghi">Đã nghỉ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userRole === 'SoYTe' && units.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Đơn vị</label>
                <Select value={unitFilter} onValueChange={handleUnitFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white">
                    <SelectItem value="all">Tất cả đơn vị</SelectItem>
                    {units.map((unit) => (
                      <SelectItem key={unit.MaDonVi} value={unit.MaDonVi}>
                        {unit.TenDonVi}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Tuân thủ</label>
              <Select value={complianceFilter} onValueChange={handleComplianceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-50 bg-white">
                  <SelectItem value="all">Tất cả mức độ</SelectItem>
                  <SelectItem value="compliant">Đạt chuẩn (≥90%)</SelectItem>
                  <SelectItem value="at_risk">Rủi ro (70-89%)</SelectItem>
                  <SelectItem value="non_compliant">Chưa đạt (&lt;70%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Practitioners Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Người hành nghề ({filteredPractitioners.length})
          </CardTitle>
          <CardDescription>
            Danh sách người hành nghề y tế và trạng thái tuân thủ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPractitioners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Không tìm thấy người hành nghề phù hợp với tiêu chí.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Họ và tên</TableHead>
                    <TableHead>Chức danh</TableHead>
                    <TableHead>Số CCHN</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tuân thủ</TableHead>
                    <TableHead>Tín chỉ</TableHead>
                    <TableHead>Liên hệ</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPractitioners.map((practitioner) => (
                    <TableRow key={practitioner.MaNhanVien}>
                      <TableCell className="font-medium">
                        {practitioner.HoVaTen}
                      </TableCell>
                      <TableCell>
                        {practitioner.ChucDanh || 'Not specified'}
                      </TableCell>
                      <TableCell>
                        {practitioner.SoCCHN || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(practitioner.TrangThaiLamViec)}
                      </TableCell>
                      <TableCell>
                        {getComplianceBadge(practitioner.complianceStatus)}
                      </TableCell>
                      <TableCell>
                        {practitioner.complianceStatus.totalCredits} / {practitioner.complianceStatus.requiredCredits}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {practitioner.Email && (
                            <div>{practitioner.Email}</div>
                          )}
                          {practitioner.DienThoai && (
                            <div className="text-gray-500">{practitioner.DienThoai}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPractitionerId(practitioner.MaNhanVien);
                            setShowDetailSheet(true);
                          }}
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Xem
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Trước
          </Button>
          <span className="flex items-center px-4">
            Trang {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Sau
          </Button>
        </div>
      )}

      {/* Practitioner Detail Sheet */}
      <PractitionerDetailSheet
        practitionerId={selectedPractitionerId}
        open={showDetailSheet}
        onOpenChange={setShowDetailSheet}
        canEdit={canEditPractitioner}
        units={units}
        onUpdate={fetchPractitioners}
      />

      {/* Bulk Import Sheet */}
      <BulkImportSheet
        open={showBulkImportSheet}
        onOpenChange={setShowBulkImportSheet}
        onImportSuccess={fetchPractitioners}
      />
    </div>
  );
}
