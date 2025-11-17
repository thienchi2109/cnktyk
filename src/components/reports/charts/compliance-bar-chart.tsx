'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { getComplianceStatusColor } from './chart-config';
import type { PractitionerComplianceSummary } from '@/types/reports';

interface ComplianceBarChartProps {
  data: PractitionerComplianceSummary[];
  limit?: number;
  showTopPerformers?: boolean;
}

export function ComplianceBarChart({
  data,
  limit = 10,
  showTopPerformers = true,
}: ComplianceBarChartProps) {
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

  if (!data || data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-gray-500">
        <p>Không có dữ liệu</p>
      </div>
    );
  }

  // Sort and limit data
  const sortedData = [...data].sort((a, b) =>
    showTopPerformers ? b.credits - a.credits : a.credits - b.credits
  );
  const limitedData = sortedData.slice(0, limit);

  // Transform data for Recharts
  const chartData = limitedData.map((item) => ({
    name: item.name.length > 20 ? item.name.substring(0, 20) + '...' : item.name,
    fullName: item.name,
    credits: item.credits,
    fill: getComplianceStatusColor(item.status),
  }));

  const chartConfig = {
    credits: {
      label: 'Tín chỉ',
      color: 'hsl(var(--medical-blue))',
    },
  };

  const chartWidth = Math.max(dimensions.width, 320);
  const chartHeight = Math.max(dimensions.height, 280);

  return (
    <ChartContainer
      ref={containerRef}
      config={chartConfig}
      className="h-[300px] w-full min-w-0"
    >
      {dimensions.width === 0 ? (
        <div className="flex h-full w-full items-center justify-center text-xs text-gray-500">
          Đang tải biểu đồ...
        </div>
      ) : (
        <BarChart
          width={chartWidth}
          height={chartHeight}
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis type="number" />
          <YAxis dataKey="name" type="category" width={90} />
          <ChartTooltip
            content={<ChartTooltipContent />}
            cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
          />
          <Bar
            dataKey="credits"
            radius={[0, 4, 4, 0]}
            className="hover:opacity-80 transition-opacity"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      )}
    </ChartContainer>
  );
}
