"use client";

import * as React from "react";
import { Check, ChevronDown, Search, User } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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
 * PractitionerSelector - Dialog-based searchable selector for practitioners
 * 
 * Features:
 * - Debounced search (300ms) by name, ID, certification number
 * - Vietnamese diacritics-insensitive matching
 * - Keyboard navigation (ArrowUp, ArrowDown, Enter, Escape)
 * - Enhanced display with position and certification
 * - Accessibility compliant (ARIA, focus management)
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
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [focusedIndex, setFocusedIndex] = React.useState(-1);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // Debounce search to prevent excessive filtering during typing
  const debouncedSearch = useDebounce(search, 300);

  // Filter practitioners based on debounced search
  const filteredPractitioners = React.useMemo(() => {
    return searchPractitioners(debouncedSearch, practitioners);
  }, [debouncedSearch, practitioners]);

  // Find selected practitioner for display
  const selectedPractitioner = React.useMemo(() => {
    return practitioners.find((p) => p.MaNhanVien === value);
  }, [practitioners, value]);

  // Reset search and focus when dialog opens
  React.useEffect(() => {
    if (open) {
      setSearch("");
      setFocusedIndex(-1);
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (!open) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) =>
            prev < filteredPractitioners.length - 1 ? prev + 1 : prev
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Enter":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredPractitioners.length) {
            const practitioner = filteredPractitioners[focusedIndex];
            onValueChange(practitioner.MaNhanVien);
            setOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          break;
      }
    },
    [open, focusedIndex, filteredPractitioners, onValueChange]
  );

  // Scroll focused item into view
  React.useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.querySelector(
        `[data-index="${focusedIndex}"]`
      );
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [focusedIndex]);

  return (
    <div className="space-y-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="dialog"
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            error && "border-red-500 focus:ring-red-500"
          )}
          onClick={() => setOpen(true)}
        >
          <span className="flex items-center gap-2 truncate">
            <User className="h-4 w-4 shrink-0" />
            {isLoading ? (
              "Đang tải..."
            ) : selectedPractitioner ? (
              <span className="truncate">{selectedPractitioner.HoVaTen}</span>
            ) : (
              placeholder
            )}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        <DialogContent className="max-w-2xl" onKeyDown={handleKeyDown}>
          <DialogHeader>
            <DialogTitle>Chọn nhân viên</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Tìm kiếm theo tên, mã nhân viên, hoặc số CCHN..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setFocusedIndex(-1); // Reset focus when search changes
                }}
                className="pl-9"
                autoComplete="off"
              />
            </div>

            {/* Results count */}
            {debouncedSearch && (
              <p className="text-sm text-muted-foreground">
                Hiển thị {filteredPractitioners.length} kết quả
              </p>
            )}

            {/* Practitioner list */}
            <ScrollArea className="h-[400px]" ref={listRef}>
              {filteredPractitioners.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <User className="h-12 w-12 text-muted-foreground/50 mb-3" />
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
                <div className="space-y-1 pr-3">
                  {filteredPractitioners.map((practitioner, index) => {
                    const isSelected = practitioner.MaNhanVien === value;
                    const isFocused = index === focusedIndex;

                    return (
                      <button
                        key={practitioner.MaNhanVien}
                        type="button"
                        data-index={index}
                        onClick={() => {
                          onValueChange(practitioner.MaNhanVien);
                          setOpen(false);
                        }}
                        onMouseEnter={() => setFocusedIndex(index)}
                        className={cn(
                          "w-full text-left p-3 rounded-lg transition-colors",
                          "hover:bg-accent focus:bg-accent focus:outline-none",
                          isSelected && "bg-accent/50",
                          isFocused && "bg-accent"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {/* Name (bold, primary) */}
                            <div className="font-semibold text-sm text-foreground truncate">
                              {practitioner.HoVaTen}
                            </div>
                            {/* Position and certification (secondary) */}
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
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
                            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      {/* Error message */}
      {error && (
        <p className="text-sm text-red-600 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
