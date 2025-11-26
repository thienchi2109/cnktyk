'use client';

import { useCallback, useEffect, useState } from 'react';
import { Building2, Loader2, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

type DepartmentOption = {
  value: string;
  label: string;
};

const CLEAR_VALUE = '__clear__';

interface DepartmentComboboxProps {
  id?: string;
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function DepartmentCombobox({
  id,
  value,
  onChange,
  placeholder = 'Chọn khoa/phòng...',
  className,
  triggerClassName,
}: DepartmentComboboxProps) {
  const [options, setOptions] = useState<DepartmentOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 250);
  const displayValue = value ?? '';
  const normalizedValue = displayValue && displayValue.length > 0 ? displayValue : undefined;

  const fetchDepartments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (debouncedSearch) qs.set('search', debouncedSearch);
      const res = await fetch(`/api/departments?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Không thể tải danh sách khoa/phòng');
      }
      const list: string[] = json.departments || [];
      setOptions(list.map((item) => ({ value: item, label: item })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Có lỗi xảy ra');
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch]);

  useEffect(() => {
    void fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    if (displayValue && !options.some((opt) => opt.value === displayValue)) {
      setOptions((prev) => [{ value: displayValue, label: displayValue }, ...prev]);
    }
  }, [displayValue, options]);

  return (
    <Select
      value={normalizedValue}
      onValueChange={(val) => {
        if (val === CLEAR_VALUE) {
          onChange('');
        } else {
          onChange(val);
        }
      }}
    >
      <SelectTrigger id={id} className={cn('mt-1 w-full', triggerClassName)}>
        <div className="flex items-center gap-2 truncate text-sm">
          <Building2 className="h-4 w-4 text-gray-500" aria-hidden="true" />
          <span className={cn(!displayValue && 'text-muted-foreground')}>{displayValue || placeholder}</span>
        </div>
      </SelectTrigger>
      <SelectContent className={cn('min-w-[280px] bg-white text-gray-900', className)}>
        <div className="sticky top-0 z-10 border-b border-gray-100 bg-white p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden="true" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm khoa/phòng..."
              className="h-9 w-full pl-9 pr-3 text-sm"
              onKeyDown={(e) => e.stopPropagation()}
              aria-label="Tìm kiếm khoa/phòng"
            />
          </div>
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>

        <SelectItem value={CLEAR_VALUE} className="text-gray-700">
          Bỏ chọn / Tất cả khoa-phòng
        </SelectItem>

        {isLoading ? (
          <div className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Đang tải...
          </div>
        ) : options.length === 0 ? (
          <div className="px-3 py-3 text-sm text-gray-500">Không tìm thấy khoa/phòng</div>
        ) : (
          options.map((option) => (
            <SelectItem key={option.value} value={option.value} className="text-sm">
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
