// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { activityTypeChartConfig, getActivityTypeColor } from './chart-config';
import type { ActivityTypeDistribution } from '@/types/reports';

interface ActivityTypeBarChartProps {
  data: ActivityTypeDistribution[];
  onBarClick?: (activityType: string) => void;
}

export function ActivityTypeBarChart({ data, onBarClick }: ActivityTypeBarChartProps) {
  // Map activity type codes to Vietnamese labels
  const typeLabels: Record<string, string> = {
    KhoaHoc: 'Khóa học',
    HoiThao: 'Hội thảo',
    NghienCuu: 'Nghiên cứu',
    BaoCao: 'Báo cáo',
  };

  // Reverse lookup for Vietnamese labels to type codes
  const labelToType: Record<string, string> = Object.entries(typeLabels).reduce(
    (acc, [key, value]) => ({ ...acc, [value]: key }),
    {}
  );

  const chartData = data.map((item) => ({
    name: typeLabels[item.type] || item.type,
    type: item.type,
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

  const handleClick = (data: { type?: string } | null) => {
    if (onBarClick && data?.type) {
      onBarClick(data.type);
    }
  };

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

  return (
    <ChartContainer ref={containerRef} config={activityTypeChartConfig} className="h-[300px] w-full min-w-0">
      <BarChart width={chartWidth} height={chartHeight} data={chartData}>
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
          onClick={handleClick}
          cursor={onBarClick ? 'pointer' : 'default'}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
