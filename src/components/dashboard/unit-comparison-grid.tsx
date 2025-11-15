'use client';

import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DashboardTableSkeleton,
  DashboardErrorPanel,
} from '@/components/dashboard/dashboard-skeletons';
import { cn } from '@/lib/utils';
import type { UnitComparisonSummary } from '@/types/dashboard';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Eye, PencilLine, Trash2 } from 'lucide-react';

export type UnitSortField = 'name' | 'compliance' | 'practitioners' | 'pending' | 'totalCredits';

export interface UnitSortState {
  field: UnitSortField;
  direction: 'asc' | 'desc';
}

export type UnitComparisonRow = UnitComparisonSummary;

interface UnitComparisonGridProps {
  rows: UnitComparisonRow[];
  isLoading: boolean;
  error?: string | null;
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  sort: UnitSortState[];
  onSortChange: (next: UnitSortState[]) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRetry: () => void;
  onUnitDetailClick: (
    unitId: string,
    unitData: UnitComparisonRow,
    trigger: HTMLButtonElement,
  ) => void;
  onUnitDetailHover: (unitId: string) => void;
  onEditUnit?: (unit: UnitComparisonRow) => void;
  onDeleteUnit?: (unit: UnitComparisonRow) => void;
}

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50] as const;

const headerColumns: Array<{
  id: string;
  label: string;
  field?: UnitSortField;
  align?: 'left' | 'center' | 'right';
  className?: string;
}> = [
  { id: 'name', label: 'Đơn vị', field: 'name', align: 'left', className: 'min-w-[220px]' },
  { id: 'type', label: 'Cấp quản lý', align: 'left', className: 'min-w-[160px]' },
  {
    id: 'activePractitioners',
    label: 'Đang hoạt động',
    field: 'practitioners',
    align: 'right',
  },
  {
    id: 'compliantPractitioners',
    label: 'Hoàn thành',
    align: 'right',
  },
  {
    id: 'complianceRate',
    label: 'Tỷ lệ tuân thủ',
    field: 'compliance',
    align: 'right',
  },
  { id: 'pendingApprovals', label: 'Chờ duyệt', field: 'pending', align: 'right' },
  { id: 'totalCredits', label: 'Tổng tín chỉ', field: 'totalCredits', align: 'right' },
  { id: 'actions', label: 'Thao tác', align: 'right', className: 'w-[80px]' },
];

function toggleSortState(
  current: UnitSortState[],
  field: UnitSortField,
  multi: boolean,
): UnitSortState[] {
  const existingIndex = current.findIndex((entry) => entry.field === field);

  if (!multi) {
    if (existingIndex === -1) {
      return [{ field, direction: 'desc' }];
    }

    const nextDirection = current[existingIndex].direction === 'desc' ? 'asc' : 'desc';
    return [{ field, direction: nextDirection }];
  }

  if (existingIndex === -1) {
    return [...current, { field, direction: 'desc' }];
  }

  const next = [...current];
  next[existingIndex] = {
    field,
    direction: next[existingIndex].direction === 'desc' ? 'asc' : 'desc',
  };
  return next;
}

function formatNumber(value: number, formatter: Intl.NumberFormat) {
  return formatter.format(Number.isFinite(value) ? value : 0);
}

function formatComplianceRate(value: number, formatter: Intl.NumberFormat) {
  return `${formatter.format(Number.isFinite(value) ? value : 0)}%`;
}

const UnitComparisonGridComponent = ({
  rows,
  isLoading,
  error,
  page,
  pageSize,
  totalItems,
  totalPages,
  sort,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRetry,
  onUnitDetailClick,
  onUnitDetailHover,
  onEditUnit,
  onDeleteUnit,
}: UnitComparisonGridProps) => {
  const numberFormatter = useMemo(() => new Intl.NumberFormat('vi-VN'), []);
  const percentFormatter = useMemo(
    () =>
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }),
    [],
  );

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);
  const safeRows = rows || [];
  const startRow = totalItems === 0 ? 0 : (safePage - 1) * safePageSize + 1;
  const endRow =
    totalItems === 0 ? 0 : Math.min(startRow + safeRows.length - 1, Math.max(totalItems, 0));

  const summaryText =
    totalItems === 0
      ? 'Không có đơn vị nào phù hợp với bộ lọc hiện tại.'
      : `Hiển thị ${formatNumber(startRow, numberFormatter)} - ${formatNumber(
          endRow,
          numberFormatter,
        )} trên tổng ${formatNumber(totalItems, numberFormatter)} đơn vị.`;

  const hoverTimeoutsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    return () => {
      Object.values(hoverTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      hoverTimeoutsRef.current = {};
    };
  }, []);
  const handleDetailHover = (unitId: string) => {
    const timeouts = hoverTimeoutsRef.current;
    if (timeouts[unitId]) {
      window.clearTimeout(timeouts[unitId]);
    }
    timeouts[unitId] = window.setTimeout(() => {
      onUnitDetailHover(unitId);
    }, 150);
  };

  const cancelDetailHover = (unitId: string) => {
    const timeoutId = hoverTimeoutsRef.current[unitId];
    if (timeoutId) {
      window.clearTimeout(timeoutId);
      delete hoverTimeoutsRef.current[unitId];
    }
  };

  const handleDetailClick = (row: UnitComparisonRow, trigger: HTMLButtonElement) => {
    cancelDetailHover(row.id);
    onUnitDetailClick(row.id, row, trigger);
  };

  const handleSort = (field: UnitSortField, multi: boolean) => {
    onSortChange(toggleSortState(sort, field, multi));
  };

  const handlePageChange = (next: number) => {
    if (totalPages > 0 && (next < 1 || next > totalPages)) {
      return;
    }
    if (next < 1) {
      return;
    }
    onPageChange(next);
  };

  const handlePageSizeChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    onPageSizeChange(parsed);
  };

  const renderSortIndicator = (field?: UnitSortField) => {
    if (!field) return null;
    const index = sort.findIndex((entry) => entry.field === field);
    if (index === -1) {
      return (
        <span className="text-gray-400" aria-hidden="true">
          ↕
        </span>
      );
    }
    const direction = sort[index].direction;
    return (
      <span className="flex items-center gap-1 text-medical-blue font-medium">
        <span aria-hidden="true">{direction === 'asc' ? '↑' : '↓'}</span>
        {sort.length > 1 ? (
          <span className="text-xs text-gray-500" aria-hidden="true">
            {index + 1}
          </span>
        ) : null}
        <span className="sr-only">
          {direction === 'asc' ? 'Sắp xếp tăng dần' : 'Sắp xếp giảm dần'}
        </span>
      </span>
    );
  };

  const complianceClass = (value: number) => {
    if (value >= 90) return 'text-medical-green';
    if (value >= 70) return 'text-medical-amber';
    return 'text-medical-red';
  };

  return (
    <TooltipProvider delayDuration={150}>
    <div className="space-y-4" aria-busy={isLoading || undefined}>
      {error && !isLoading ? (
        <div className="space-y-3">
          <DashboardErrorPanel message={error} />
          <div>
            <Button variant="outline" onClick={onRetry}>
              Thử lại
            </Button>
          </div>
        </div>
      ) : null}

      {!error ? (
        <div className="overflow-hidden rounded-2xl border border-white/15 bg-white/10 backdrop-blur-lg">
          {isLoading ? (
            <DashboardTableSkeleton lines={Math.min(pageSize, 6)} />
          ) : totalItems === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-lg font-semibold text-gray-700">Không tìm thấy đơn vị</p>
              <p className="text-sm text-gray-500">
                Điều chỉnh bộ lọc hoặc từ khóa tìm kiếm để xem dữ liệu khác.
              </p>
              <Button variant="outline" onClick={() => onSortChange([])}>
                Đặt lại sắp xếp
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-gray-700" role="grid">
                <thead className="bg-gray-200/90 backdrop-blur-md sticky top-0 z-10 border-b-2 border-gray-300/50 shadow-sm">
                  <tr>
                    {headerColumns.map((column) => {
                      const sortable = Boolean(column.field);
                      const sortIndex = column.field
                        ? sort.findIndex((entry) => entry.field === column.field)
                        : -1;
                      const ariaSort =
                        sortable && sortIndex >= 0
                          ? sort[sortIndex].direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none';

                      return (
                        <th
                          key={column.id}
                          scope="col"
                          aria-sort={ariaSort}
                          className={cn(
                            'px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-700',
                            column.align === 'right' ? 'text-right' : 'text-left',
                            column.className,
                          )}
                        >
                          {sortable ? (
                            <button
                              type="button"
                              onClick={(event) =>
                                handleSort(column.field!, event.shiftKey || event.metaKey)
                              }
                              className="flex w-full items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-medical-blue/50"
                            >
                              <span className="flex-1 text-left">{column.label}</span>
                              {renderSortIndicator(column.field)}
                            </button>
                          ) : (
                            <span>{column.label}</span>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {safeRows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-t border-white/10 transition-colors hover:bg-white/30 focus-within:bg-white/40',
                        index % 2 === 1 ? 'bg-white/10' : 'bg-transparent',
                      )}
                    >
                      <th scope="row" className="px-4 py-4 text-left font-medium text-gray-900">
                        <div>
                          <p>{row.name}</p>
                          <p className="text-xs text-gray-500 mt-1">Tổng {formatNumber(row.totalPractitioners, numberFormatter)} nhân sự</p>
                        </div>
                      </th>
                      <td className="px-4 py-4 text-left text-gray-600">{row.type}</td>
                      <td className="px-4 py-4 text-right font-semibold text-gray-800">
                        {formatNumber(row.activePractitioners, numberFormatter)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700">
                        {formatNumber(row.compliantPractitioners, numberFormatter)}
                      </td>
                      <td
                        className={cn(
                          'px-4 py-4 text-right font-semibold',
                          complianceClass(row.complianceRate),
                        )}
                      >
                        {formatComplianceRate(row.complianceRate, percentFormatter)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700">
                        {formatNumber(row.pendingApprovals, numberFormatter)}
                      </td>
                      <td className="px-4 py-4 text-right text-gray-700">
                        {formatNumber(Math.round(row.totalCredits), numberFormatter)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                aria-label={`Xem chi tiết ${row.name}`}
                                onMouseEnter={() => handleDetailHover(row.id)}
                                onMouseLeave={() => cancelDetailHover(row.id)}
                                onFocus={() => handleDetailHover(row.id)}
                                onClick={(event) => handleDetailClick(row, event.currentTarget)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Xem chi tiết</TooltipContent>
                          </Tooltip>
                          {onEditUnit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Chỉnh sửa ${row.name}`}
                                  onClick={() => onEditUnit(row)}
                                >
                                  <PencilLine className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Chỉnh sửa đơn vị</TooltipContent>
                            </Tooltip>
                          )}
                          {onDeleteUnit && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label={`Vô hiệu hóa ${row.name}`}
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => onDeleteUnit(row)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Vô hiệu hóa đơn vị</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-gray-600" aria-live="polite">
          {summaryText}
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span>Hiển thị</span>
            <select
              value={pageSize}
              onChange={(event) => handlePageSizeChange(event.target.value)}
              className="rounded-lg border border-gray-200 bg-white/70 px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-medical-blue/50"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}/trang
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || totalPages === 0}
            >
              Trước
            </Button>
            <span className="text-sm text-gray-600">
              Trang {totalPages === 0 ? 0 : page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(page + 1)}
              disabled={totalPages === 0 || page >= totalPages}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
};

export const UnitComparisonGrid = memo(UnitComparisonGridComponent);
