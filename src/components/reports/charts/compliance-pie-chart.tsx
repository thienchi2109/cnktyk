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
import { complianceChartConfig, getComplianceStatusColor } from './chart-config';
import type { ComplianceDistribution } from '@/types/reports';

interface CompliancePieChartProps {
  data: ComplianceDistribution[];
}

export function CompliancePieChart({ data }: CompliancePieChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        <p>Không có dữ liệu</p>
      </div>
    );
  }

  // Transform data for Recharts
  const chartData = data.map((item) => ({
    name: complianceChartConfig[item.status]?.label || item.status,
    value: item.count,
    fill: getComplianceStatusColor(item.status),
  }));

  return (
    <ChartContainer config={complianceChartConfig} className="h-[300px]">
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
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.fill}
                className="hover:opacity-80 transition-opacity cursor-pointer"
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
