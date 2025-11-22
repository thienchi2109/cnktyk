// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { PieChart, Pie, Cell } from 'recharts';
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

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const chartWidth = Math.max(dimensions.width, 320);
  const chartHeight = Math.max(dimensions.height, 300);
  const outerRadius = Math.max(Math.min(chartWidth, chartHeight) / 2 - 24, 80);
  const innerRadius = Math.max(outerRadius - 30, 50);

  return (
    <ChartContainer ref={containerRef} config={approvalStatusChartConfig} className="h-[300px] w-full min-w-0">
      <PieChart width={chartWidth} height={chartHeight}>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
          }
          outerRadius={outerRadius}
          innerRadius={innerRadius}
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
    </ChartContainer>
  );
}
