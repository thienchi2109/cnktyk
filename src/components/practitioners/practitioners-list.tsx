'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Filter, Plus, Eye, Edit, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PractitionerForm } from './practitioner-form';

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
  const router = useRouter();
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [complianceFilter, setComplianceFilter] = useState<string>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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

      const response = await fetch(`/api/practitioners?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch practitioners');
      }

      const data = await response.json();
      setPractitioners(data.practitioners || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPractitioners();
  }, [page, searchTerm, statusFilter, unitFilter]);

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
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DangLamViec':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'TamHoan':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Suspended</Badge>;
      case 'DaNghi':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Inactive</Badge>;
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

  const filteredPractitioners = practitioners.filter(practitioner => {
    if (complianceFilter !== 'all') {
      if (complianceFilter !== practitioner.complianceStatus.status) {
        return false;
      }
    }
    return true;
  });

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
          <h1 className="text-3xl font-bold">Practitioners</h1>
          <p className="text-gray-600">Manage healthcare practitioners and their compliance status</p>
        </div>
        {canCreatePractitioner && (
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Practitioner
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Register New Practitioner</DialogTitle>
                <DialogDescription>
                  Add a new healthcare practitioner to the system
                </DialogDescription>
              </DialogHeader>
              <PractitionerForm
                unitId={userRole === 'DonVi' ? userUnitId : undefined}
                units={userRole === 'SoYTe' ? units : units.filter(u => u.MaDonVi === userUnitId)}
                onSuccess={() => {
                  setShowCreateDialog(false);
                  fetchPractitioners();
                }}
                onCancel={() => setShowCreateDialog(false)}
                mode="create"
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Work Status</label>
              <Select value={statusFilter} onValueChange={handleStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="DangLamViec">Active</SelectItem>
                  <SelectItem value="TamHoan">Suspended</SelectItem>
                  <SelectItem value="DaNghi">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {userRole === 'SoYTe' && units.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Unit</label>
                <Select value={unitFilter} onValueChange={handleUnitFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Units</SelectItem>
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
              <label className="text-sm font-medium">Compliance</label>
              <Select value={complianceFilter} onValueChange={handleComplianceFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Compliance</SelectItem>
                  <SelectItem value="compliant">Compliant (≥90%)</SelectItem>
                  <SelectItem value="at_risk">At Risk (70-89%)</SelectItem>
                  <SelectItem value="non_compliant">Non-Compliant (&lt;70%)</SelectItem>
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
            Practitioners ({filteredPractitioners.length})
          </CardTitle>
          <CardDescription>
            Healthcare practitioners and their compliance status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPractitioners.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No practitioners found matching your criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>CCHN</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Credits</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Actions</TableHead>
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
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/practitioners/${practitioner.MaNhanVien}`)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEditPractitioner && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/practitioners/${practitioner.MaNhanVien}/edit`)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
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
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}