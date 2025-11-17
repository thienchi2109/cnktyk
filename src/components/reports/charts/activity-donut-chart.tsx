// @ts-nocheck
'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { approvalStatusChartConfig, getApprovalStatusColor } from './chart-config';
import type { ActivityStatusDistribution } from '@/types/reports';

interface ActivityDonutChartProps {
  data: ActivityStatusDistribution[];
}

export function ActivityDonutChart({ data }: ActivityDonutChartProps) {
  // Map status names to Vietnamese labels
  const statusLabels: Record<string, string> = {
    ChoDuyet: 'Chờ duyệt',
    DaDuyet: 'Đã duyệt',
    TuChoi: 'Từ chối',
  };

  const chartData = data.map((item) => ({
    name: statusLabels[item.status] || item.status,
    value: item.count,
    fill: getApprovalStatusColor(item.status),
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
        Không có dữ liệu
      </div>
    );
  }

  return (
    <ChartContainer config={approvalStatusChartConfig} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) =>
              `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            outerRadius={80}
            innerRadius={50}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill}
              />
            ))}
          </Pie>
          <ChartTooltip content={<ChartTooltipContent />} />
          <ChartLegend content={<ChartLegendContent />} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
