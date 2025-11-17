// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setDimensions({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const hasDimensions = dimensions.width > 0 && dimensions.height > 0;
  const outerRadius = Math.max(Math.min(dimensions.width, dimensions.height) / 2 - 24, 72);

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
    <ChartContainer
      ref={containerRef}
      config={complianceChartConfig}
      className="h-[300px] w-full min-w-0"
    >
      {hasDimensions ? (
        <ResponsiveContainer
          width="100%"
          height="100%"
          minHeight={260}
          minWidth={260}
        >
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              outerRadius={outerRadius}
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
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
          Đang tải biểu đồ...
        </div>
      )}
    </ChartContainer>
  );
}
