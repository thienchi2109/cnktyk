'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Users, Filter, X, CheckSquare, Square, ChevronLeft, ChevronRight, Tag as TagIcon, UserCog } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlassButton } from '@/components/ui/glass-button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/glass-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingNotice } from '@/components/ui/loading-notice';

type PractitionerLite = {
  MaNhanVien: string;
  HoVaTen: string;
  ChucDanh?: string | null;
  TrangThaiLamViec: 'DangLamViec' | 'DaNghi' | 'TamHoan';
};

export type CohortSelection = {
  mode: 'all' | 'manual';
  selectedIds: string[]; // used in manual mode
  excludedIds: string[]; // used in all mode
  totalFiltered: number;
};

interface CohortBuilderProps {
  initialStatus?: 'DangLamViec' | 'DaNghi' | 'TamHoan' | 'all';
  onChange?: (selection: CohortSelection) => void;
}

export function CohortBuilder({ initialStatus = 'DangLamViec', onChange }: CohortBuilderProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [chucDanh, setChucDanh] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<PractitionerLite[]>([]);
  const [total, setTotal] = useState(0);
  const [selectAllFiltered, setSelectAllFiltered] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());
  const idToNameRef = useRef<Map<string, string>>(new Map());

  const fetchList = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const qs = new URLSearchParams();
      qs.set('page', String(page));
      qs.set('limit', String(limit));
      if (searchTerm) qs.set('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') qs.set('status', statusFilter);
      if (chucDanh) qs.set('chucDanh', chucDanh);

      const res = await fetch(`/api/practitioners?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Không thể tải danh sách');

      const data: any[] = json.data || [];
      const pagination = json.pagination || { total: data.length, page: 1, totalPages: 1 };

      const lite: PractitionerLite[] = data.map((p) => ({
        MaNhanVien: p.MaNhanVien,
        HoVaTen: p.HoVaTen,
        ChucDanh: p.ChucDanh ?? null,
        TrangThaiLamViec: p.TrangThaiLamViec,
      }));

      // Cache names for chips
      lite.forEach((p) => idToNameRef.current.set(p.MaNhanVien, p.HoVaTen));
      setRows(lite);
      setTotal(pagination.total || lite.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  // Refetch when filters change (reset to page 1)
  useEffect(() => {
    setPage(1);
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, statusFilter, chucDanh]);

  const toggleRow = (id: string) => {
    if (selectAllFiltered) {
      setExcludedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    }
  };

  const toggleSelectAllAcrossPages = () => {
    setSelectAllFiltered((prev) => !prev);
    // Clear per-mode selections when switching modes
    setSelectedIds(new Set());
    setExcludedIds(new Set());
  };

  const selectedCount = useMemo(() => {
    return selectAllFiltered ? Math.max(0, total - excludedIds.size) : selectedIds.size;
  }, [selectAllFiltered, excludedIds.size, selectedIds.size, total]);

  // Emit change upward
  useEffect(() => {
    if (!onChange) return;
    onChange({
      mode: selectAllFiltered ? 'all' : 'manual',
      selectedIds: Array.from(selectedIds),
      excludedIds: Array.from(excludedIds),
      totalFiltered: total,
    });
  }, [selectAllFiltered, selectedIds, excludedIds, total, onChange]);

  const allPageIds = rows.map((r) => r.MaNhanVien);
  const pageAllSelected = selectAllFiltered
    ? rows.every((r) => !excludedIds.has(r.MaNhanVien)) && rows.some(() => true)
    : rows.every((r) => selectedIds.has(r.MaNhanVien)) && rows.some(() => true);

  const toggleSelectPage = () => {
    if (selectAllFiltered) {
      // In all mode: page checkbox toggles exclusions for current page
      const shouldExclude = rows.some((r) => !excludedIds.has(r.MaNhanVien));
      setExcludedIds((prev) => {
        const next = new Set(prev);
        if (shouldExclude) {
          allPageIds.forEach((id) => next.add(id));
        } else {
          allPageIds.forEach((id) => next.delete(id));
        }
        return next;
      });
    } else {
      // Manual mode: select/unselect all on current page
      const shouldSelect = rows.some((r) => !selectedIds.has(r.MaNhanVien));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (shouldSelect) {
          allPageIds.forEach((id) => next.add(id));
        } else {
          allPageIds.forEach((id) => next.delete(id));
        }
        return next;
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-5 w-5 text-medical-blue" />
          <h3 className="font-semibold text-gray-900">Cohort Builder</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <Label htmlFor="search" className="text-sm text-gray-700">Tìm kiếm</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input id="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" placeholder="Họ và tên..." />
            </div>
          </div>
          {/* Trạng thái */}
          <div>
            <Label htmlFor="status" className="text-sm text-gray-700">Trạng thái</Label>
            <Select value={statusFilter} onChange={(e: any) => setStatusFilter(e.target.value)} className="mt-1">
              <option value="DangLamViec">Đang làm việc</option>
              <option value="TamHoan">Tạm hoãn</option>
              <option value="DaNghi">Đã nghỉ</option>
              <option value="all">Tất cả</option>
            </Select>
          </div>
          {/* Chức danh */}
          <div>
            <Label htmlFor="chucdanh" className="text-sm text-gray-700 flex items-center gap-1"><UserCog className="w-4 h-4" />Chức danh</Label>
            <Input id="chucdanh" value={chucDanh} onChange={(e) => setChucDanh(e.target.value)} placeholder="VD: Bác sĩ, Điều dưỡng..." />
          </div>
          {/* Tag (placeholder) */}
          <div>
            <Label className="text-sm text-gray-700 flex items-center gap-1"><TagIcon className="w-4 h-4" />Tag</Label>
            <Input disabled placeholder="Chưa hỗ trợ" />
          </div>
        </div>
      </GlassCard>

      {/* Selection Controls */}
      <GlassCard className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button type="button" onClick={toggleSelectAllAcrossPages} className="inline-flex items-center gap-2 text-sm text-gray-800">
            {selectAllFiltered ? <CheckSquare className="w-4 h-4 text-medical-blue" /> : <Square className="w-4 h-4 text-gray-400" />}
            Chọn tất cả theo bộ lọc (toàn bộ trang)
          </button>
          <Badge variant="outline" className="ml-2">Đã chọn: <span className="ml-1 font-semibold">{selectedCount}</span></Badge>
          <Badge variant="outline">Tổng phù hợp: <span className="ml-1 font-semibold">{total}</span></Badge>
          {excludedIds.size > 0 && (
            <Badge variant="secondary" className="bg-yellow-50 text-yellow-800 border-yellow-200">Bị loại trừ: {excludedIds.size}</Badge>
          )}
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-12"><LoadingNotice message="Đang tải danh sách..." /></div>
        ) : error ? (
          <div className="p-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-700">{error}</AlertDescription>
            </Alert>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-gray-600">Không tìm thấy kết quả</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50 border-b border-gray-200/50">
                <tr>
                  <th className="px-3 py-3">
                    <input type="checkbox" aria-label="Chọn trang" checked={pageAllSelected} onChange={toggleSelectPage} />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Họ và tên</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chức danh</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {rows.map((r) => {
                  const checked = selectAllFiltered ? !excludedIds.has(r.MaNhanVien) : selectedIds.has(r.MaNhanVien);
                  return (
                    <tr key={r.MaNhanVien} className="hover:bg-gray-50/30">
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={checked} onChange={() => toggleRow(r.MaNhanVien)} aria-label="Chọn" />
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-gray-900">{r.HoVaTen}</div>
                      </td>
                      <td className="px-6 py-3 text-gray-700">{r.ChucDanh || '—'}</td>
                      <td className="px-6 py-3 text-gray-700">{r.TrangThaiLamViec}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200/50 flex items-center justify-between">
          <div className="text-sm text-gray-500">Trang {page}</div>
          <div className="flex gap-2">
            <GlassButton size="sm" variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronLeft className="h-4 w-4" />
            </GlassButton>
            <GlassButton size="sm" variant="secondary" onClick={() => setPage((p) => p + 1)} disabled={rows.length < limit}>
              <ChevronRight className="h-4 w-4" />
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Exclusion Chips */}
      {selectAllFiltered && excludedIds.size > 0 && (
        <GlassCard className="p-4">
          <div className="text-sm text-gray-700 font-medium mb-2">Đang loại trừ</div>
          <div className="flex flex-wrap gap-2">
            {Array.from(excludedIds).map((id) => (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-sm bg-yellow-50 border-yellow-200 text-yellow-800">
                {idToNameRef.current.get(id) || id}
                <button className="ml-1" onClick={() => setExcludedIds((prev) => { const next = new Set(prev); next.delete(id); return next; })}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}