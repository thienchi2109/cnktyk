// @ts-nocheck
'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { activityTypeChartConfig, getActivityTypeColor } from './chart-config';
import type { ActivityTypeDistribution } from '@/types/reports';

interface ActivityTypeBarChartProps {
  data: ActivityTypeDistribution[];
}

export function ActivityTypeBarChart({ data }: ActivityTypeBarChartProps) {
  // Map activity type codes to Vietnamese labels
  const typeLabels: Record<string, string> = {
    KhoaHoc: 'Khóa học',
    HoiThao: 'Hội thảo',
    NghienCuu: 'Nghiên cứu',
    BaoCao: 'Báo cáo',
  };

  const chartData = data.map((item) => ({
    name: typeLabels[item.type] || item.type,
    count: item.count,
    fill: getActivityTypeColor(item.type),
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
        Không có dữ liệu
      </div>
    );
  }

  return (
    <ChartContainer config={activityTypeChartConfig} className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 12 }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar
            dataKey="count"
            radius={[8, 8, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
