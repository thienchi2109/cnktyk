'use client';

import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import type { DateRangePreset } from '@/types/reports';

interface DateRangeFilterProps {
    startDate?: string;
    endDate?: string;
    preset?: DateRangePreset;
    onRangeChange: (range: { startDate: string; endDate: string; preset: DateRangePreset }) => void;
}

export function DateRangeFilter({
    startDate,
    endDate,
    preset = 'last_30_days',
    onRangeChange,
}: DateRangeFilterProps) {
    const [selectedPreset, setSelectedPreset] = useState<DateRangePreset>(preset);
    const [customStart, setCustomStart] = useState(startDate || '');
    const [customEnd, setCustomEnd] = useState(endDate || '');

    const handlePresetChange = (newPreset: DateRangePreset) => {
        setSelectedPreset(newPreset);
        const now = new Date();
        let start: Date;
        let end: Date = now;

        switch (newPreset) {
            case 'last_30_days':
                start = subDays(now, 30);
                break;
            case 'last_90_days':
                start = subDays(now, 90);
                break;
            case 'this_month':
                start = startOfMonth(now);
                end = endOfMonth(now);
                break;
            case 'last_month':
                const lastMonth = subMonths(now, 1);
                start = startOfMonth(lastMonth);
                end = endOfMonth(lastMonth);
                break;
            case 'this_year':
                start = startOfYear(now);
                break;
            case 'current_cycle':
                // Default to 5 years back for compliance cycle
                start = subDays(now, 365 * 5);
                break;
            case 'custom':
                // Keep current custom dates
                return;
            default:
                start = subDays(now, 30);
        }

        const startISO = start.toISOString();
        const endISO = end.toISOString();
        setCustomStart(startISO);
        setCustomEnd(endISO);
        onRangeChange({ startDate: startISO, endDate: endISO, preset: newPreset });
    };

    const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
        if (type === 'start') {
            setCustomStart(value);
        } else {
            setCustomEnd(value);
        }

        // Convert to ISO string
        const date = value ? new Date(value).toISOString() : '';

        if (type === 'start' && customEnd) {
            onRangeChange({
                startDate: date,
                endDate: customEnd,
                preset: 'custom'
            });
            setSelectedPreset('custom');
        } else if (type === 'end' && customStart) {
            onRangeChange({
                startDate: customStart,
                endDate: date,
                preset: 'custom'
            });
            setSelectedPreset('custom');
        }
    };

    const formatDateForInput = (isoString?: string) => {
        if (!isoString) return '';
        try {
            return format(new Date(isoString), 'yyyy-MM-dd');
        } catch {
            return '';
        }
    };

    return (
        <div className="space-y-3">
            {/* Preset Selector */}
            <div className="relative">
                <select
                    value={selectedPreset}
                    onChange={(e) => handlePresetChange(e.target.value as DateRangePreset)}
                    className="w-full px-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue appearance-none cursor-pointer"
                >
                    <option value="last_30_days">30 ngày qua</option>
                    <option value="last_90_days">90 ngày qua</option>
                    <option value="this_month">Tháng này</option>
                    <option value="last_month">Tháng trước</option>
                    <option value="this_year">Năm nay</option>
                    <option value="current_cycle">Chu kỳ hiện tại</option>
                    <option value="custom">Tùy chỉnh</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>

            {/* Custom Date Inputs - shown when preset is custom */}
            {selectedPreset === 'custom' && (
                <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-slate-700">
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Từ ngày
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={formatDateForInput(customStart)}
                                onChange={(e) => handleCustomDateChange('start', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                className="w-full pl-10 pr-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue text-sm"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Đến ngày
                        </label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            <input
                                type="date"
                                value={formatDateForInput(customEnd)}
                                onChange={(e) => handleCustomDateChange('end', e.target.value ? new Date(e.target.value).toISOString() : '')}
                                className="w-full pl-10 pr-3 py-2 bg-white/50 dark:bg-slate-800/50 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-blue text-sm"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
