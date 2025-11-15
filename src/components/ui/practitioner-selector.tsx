"use client";

import * as React from "react";
import { Check, ChevronDown, Search, User } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";
import { searchPractitioners, type Practitioner } from "@/lib/practitioners/search";

export interface PractitionerSelectorProps {
  /** Array of practitioners to display */
  practitioners: Practitioner[];
  /** Currently selected practitioner ID (controlled) */
  value?: string;
  /** Callback when selection changes */
  onValueChange: (value: string) => void;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Disable the selector */
  disabled?: boolean;
  /** Error message to display */
  error?: string;
  /** Loading state (from TanStack Query or parent) */
  isLoading?: boolean;
}

/**
 * PractitionerSelector - Inline Select with searchable dropdown for practitioners
 *
 * Features:
 * - Debounced search (300ms) by name, ID, certification number
 * - Vietnamese diacritics-insensitive matching
 * - Enhanced display with position and certification
 * - Inline dropdown (no modal overlay)
 * - Works with React Hook Form
 *
 * @example
 * ```tsx
 * <PractitionerSelector
 *   practitioners={practitioners}
 *   value={form.watch('MaNhanVien')}
 *   onValueChange={(value) => form.setValue('MaNhanVien', value)}
 *   error={form.formState.errors.MaNhanVien?.message}
 * />
 * ```
 */
export function PractitionerSelector({
  practitioners,
  value,
  onValueChange,
  placeholder = "Chọn nhân viên...",
  disabled = false,
  error,
  isLoading = false,
}: PractitionerSelectorProps) {
  const [searchInput, setSearchInput] = React.useState("");

  // Debounce search to prevent excessive filtering during typing
  const debouncedSearch = useDebounce(searchInput, 300);

  // Filter practitioners based on debounced search
  const filteredPractitioners = React.useMemo(() => {
    return searchPractitioners(debouncedSearch, practitioners);
  }, [debouncedSearch, practitioners]);

  // Find selected practitioner for display
  const selectedPractitioner = React.useMemo(() => {
    return practitioners.find((p) => p.MaNhanVien === value);
  }, [practitioners, value]);

  return (
    <div className="space-y-1">
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={disabled || isLoading}
      >
        <SelectTrigger
          className={cn(
            "w-full",
            !value && "text-muted-foreground",
            error && "border-red-500 focus:ring-red-500"
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0" />
            {isLoading ? (
              "Đang tải..."
            ) : selectedPractitioner ? (
              <span className="truncate">{selectedPractitioner.HoVaTen}</span>
            ) : (
              placeholder
            )}
          </div>
        </SelectTrigger>

        <SelectContent className="w-full min-w-[320px] bg-white text-gray-900 border border-gray-200 shadow-xl">
          {/* Search input inside dropdown */}
          <div className="p-2 border-b border-gray-100 bg-white sticky top-0 z-10">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tên, mã nhân viên, hoặc số CCHN..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 pr-3 h-9 bg-white text-gray-900 border border-gray-200 focus:ring-medical-blue/30"
                autoFocus
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
            {debouncedSearch && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Hiển thị {filteredPractitioners.length} kết quả
              </p>
            )}
          </div>

          {/* Practitioner list */}
          <div className="max-h-[320px] overflow-y-auto bg-white">
            {filteredPractitioners.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                <User className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground font-medium">
                  Không tìm thấy nhân viên
                </p>
                {debouncedSearch && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Thử tìm kiếm với từ khóa khác
                  </p>
                )}
              </div>
            ) : (
              filteredPractitioners.map((practitioner) => {
                const isSelected = practitioner.MaNhanVien === value;

                return (
                  <SelectItem
                    key={practitioner.MaNhanVien}
                    value={practitioner.MaNhanVien}
                    className="whitespace-normal break-words text-left leading-snug text-gray-900 data-[highlighted]:bg-medical-blue/10 data-[state=checked]:text-medical-blue h-auto py-2.5 px-3"
                  >
                    <div className="flex items-start justify-between gap-3 w-full">
                      <div className="flex-1 min-w-0">
                        {/* Name (bold, primary) */}
                        <div className="font-semibold text-sm text-foreground truncate">
                          {practitioner.HoVaTen}
                        </div>
                        {/* Position and certification (secondary) */}
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          {practitioner.ChucDanh && (
                            <span>{practitioner.ChucDanh}</span>
                          )}
                          {practitioner.ChucDanh && practitioner.SoCCHN && (
                            <span>•</span>
                          )}
                          {practitioner.SoCCHN && (
                            <span>CCHN: {practitioner.SoCCHN}</span>
                          )}
                        </div>
                        {/* Practitioner ID (tertiary) */}
                        <div className="text-xs text-muted-foreground/70 mt-0.5">
                          Mã: {practitioner.MaNhanVien}
                        </div>
                      </div>

                      {/* Selected indicator */}
                      {isSelected && (
                        <Check className="h-4 w-4 text-medical-blue shrink-0 mt-0.5" />
                      )}
                    </div>
                  </SelectItem>
                );
              })
            )}
          </div>
        </SelectContent>
      </Select>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
