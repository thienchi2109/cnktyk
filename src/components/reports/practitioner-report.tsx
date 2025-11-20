'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import {
    DashboardKpiSkeleton,
    DashboardCardSkeleton,
    DashboardErrorCard,
} from '@/components/dashboard/dashboard-skeletons';
import {
    User,
    Award,
    CheckCircle,
    AlertTriangle,
    XCircle,
} from 'lucide-react';
import { usePractitionerDetailReport } from '@/hooks/use-practitioner-detail-report';
import { CreditsBreakdownPieChart } from '@/components/reports/charts/credits-breakdown-pie-chart';
import { CreditsTimelineChart } from '@/components/reports/charts/credits-timeline-chart';
import type { PractitionerDetailFilters } from '@/types/reports';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface PractitionerReportProps {
    unitId: string;
    filters: Omit<PractitionerDetailFilters, 'practitionerId'>;
    practitionerId?: string;
}

export function PractitionerReport({ unitId, filters, practitionerId }: PractitionerReportProps) {
    // Fetch report data
    const { data, isLoading, error } = usePractitionerDetailReport(
        unitId,
        { ...filters, practitionerId: practitionerId || '' },
        { enabled: !!practitionerId }
    );

    if (!practitionerId) {
        return (
            <div className="glass-card p-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Chưa chọn người hành nghề
                </h3>
                <p className="text-gray-600">
                    Vui lòng chọn một người hành nghề từ bộ lọc để xem báo cáo chi tiết
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <DashboardKpiSkeleton />
                    <DashboardKpiSkeleton />
                    <DashboardKpiSkeleton />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                    <DashboardCardSkeleton lines={10} />
                    <DashboardCardSkeleton lines={10} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <DashboardErrorCard
                message="Không thể tải báo cáo chi tiết. Vui lòng thử lại."
                className="col-span-full"
            />
        );
    }

    if (!data) {
        return (
            <div className="glass-card p-12 text-center">
                <p className="text-gray-600">Không tìm thấy dữ liệu</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Practitioner Info & Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <GlassCard className="p-6 col-span-1 md:col-span-2">
                    <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-4 rounded-full bg-blue-100/50">
                                <User className="w-8 h-8 text-medical-blue" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">
                                    {data.practitioner.name}
                                </h2>
                                <div className="flex items-center gap-2 mt-1 text-gray-600">
                                    <Award className="w-4 h-4" />
                                    <span className="text-sm">
                                        CCHN: {data.practitioner.licenseId}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-1 text-gray-600">
                                    <BuildingIcon className="w-4 h-4" />
                                    <span className="text-sm">
                                        {data.practitioner.position} • {data.practitioner.employmentStatus === 'DangLamViec' ? 'Đang làm việc' : 'Đã nghỉ'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Chu kỳ hiện tại</p>
                            <p className="font-medium text-gray-800">
                                {format(new Date(data.practitioner.licenseIssueDate), 'dd/MM/yyyy')} - {format(new Date(data.practitioner.cycleEndDate), 'dd/MM/yyyy')}
                            </p>
                        </div>
                    </div>
                </GlassCard>

                {/* Compliance Status Card */}
                <GlassCard className={cn(
                    "p-6 flex flex-col justify-center items-center text-center border-l-4",
                    data.credits.percentComplete >= 90 ? "border-l-medical-green" :
                        data.credits.percentComplete >= 70 ? "border-l-medical-amber" : "border-l-medical-red"
                )}>
                    <div className="mb-2">
                        {data.credits.percentComplete >= 90 ? (
                            <CheckCircle className="w-12 h-12 text-medical-green mx-auto" />
                        ) : data.credits.percentComplete >= 70 ? (
                            <AlertTriangle className="w-12 h-12 text-medical-amber mx-auto" />
                        ) : (
                            <XCircle className="w-12 h-12 text-medical-red mx-auto" />
                        )}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">
                        {data.credits.percentComplete >= 90 ? 'Đạt chuẩn' :
                            data.credits.percentComplete >= 70 ? 'Cần theo dõi' : 'Rủi ro cao'}
                    </h3>
                    <div className="text-3xl font-bold text-gray-900 my-2">
                        {data.credits.earned} <span className="text-sm text-gray-500 font-normal">/ {data.credits.required} tín chỉ</span>
                    </div>
                    <p className="text-sm text-gray-600">
                        Đạt {data.credits.percentComplete}% yêu cầu
                    </p>
                </GlassCard>
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Pie Chart: Credits Breakdown */}
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Cơ cấu tín chỉ
                    </h3>
                    <CreditsBreakdownPieChart data={data.byActivityType} />
                </GlassCard>

                {/* Timeline Chart */}
                <GlassCard className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Tiến độ tích lũy
                    </h3>
                    <CreditsTimelineChart data={data.timeline} />
                </GlassCard>
            </div>

            {/* Submissions Table */}
            <GlassCard className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Lịch sử hoạt động
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                            <tr>
                                <th className="px-4 py-3">Hoạt động</th>
                                <th className="px-4 py-3">Loại</th>
                                <th className="px-4 py-3">Ngày ghi nhận</th>
                                <th className="px-4 py-3">Trạng thái</th>
                                <th className="px-4 py-3 text-right">Tín chỉ</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.submissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                        Chưa có hoạt động nào được ghi nhận
                                    </td>
                                </tr>
                            ) : (
                                data.submissions.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900">
                                            {item.activityName}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {item.type}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {format(new Date(item.submittedDate), 'dd/MM/yyyy')}
                                        </td>
                                        <td className="px-4 py-3">
                                            <StatusBadge status={item.status} />
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-medical-blue">
                                            {item.credits}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </GlassCard>
        </div>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        ChoDuyet: 'bg-amber-100 text-amber-700',
        DaDuyet: 'bg-green-100 text-green-700',
        TuChoi: 'bg-red-100 text-red-700',
    };

    const labels = {
        ChoDuyet: 'Chờ duyệt',
        DaDuyet: 'Đã duyệt',
        TuChoi: 'Từ chối',
    };

    const statusKey = status as keyof typeof styles;

    return (
        <span className={cn("px-2 py-1 rounded-full text-xs font-medium", styles[statusKey] || 'bg-gray-100 text-gray-700')}>
            {labels[statusKey] || status}
        </span>
    );
}

function BuildingIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <rect width="16" height="20" x="4" y="2" rx="2" ry="2" />
            <path d="M9 22v-4h6v4" />
            <path d="M8 6h.01" />
            <path d="M16 6h.01" />
            <path d="M8 10h.01" />
            <path d="M16 10h.01" />
            <path d="M8 14h.01" />
            <path d="M16 14h.01" />
        </svg>
    )
}
