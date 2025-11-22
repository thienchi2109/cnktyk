// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { ActivityTimeline } from '@/types/reports';

interface ActivityTimelineChartProps {
  data: ActivityTimeline[];
  onDataPointClick?: (month: string) => void;
}

// Chart configuration for timeline
const timelineChartConfig = {
  submitted: {
    label: 'Đã nộp',
    color: '#0066CC', // Medical Blue
  },
  approved: {
    label: 'Đã duyệt',
    color: '#00A86B', // Medical Green
  },
  rejected: {
    label: 'Từ chối',
    color: '#DC2626', // Medical Red
  },
};

export function ActivityTimelineChart({ data, onDataPointClick }: ActivityTimelineChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-sm text-gray-500">
        Không có dữ liệu
      </div>
    );
  }

  // Format month labels (YYYY-MM -> MM/YYYY)
  const formattedData = data.map((item) => ({
    ...item,
    monthLabel: item.month.split('-').reverse().join('/'),
  }));

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

  const handleClick = (data: { month?: string } | null) => {
    if (onDataPointClick && data?.month) {
      onDataPointClick(data.month);
    }
  };

  return (
    <ChartContainer ref={containerRef} config={timelineChartConfig} className="h-[300px] w-full min-w-0">
      <LineChart width={chartWidth} height={chartHeight} data={formattedData} onClick={handleClick}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
        <XAxis
          dataKey="monthLabel"
          tick={{ fontSize: 12 }}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={false}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Legend
          verticalAlign="top"
          height={36}
          iconType="line"
        />
        <Line
          type="monotone"
          dataKey="submitted"
          name={timelineChartConfig.submitted.label}
          stroke={timelineChartConfig.submitted.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, cursor: onDataPointClick ? 'pointer' : 'default' }}
          cursor={onDataPointClick ? 'pointer' : 'default'}
        />
        <Line
          type="monotone"
          dataKey="approved"
          name={timelineChartConfig.approved.label}
          stroke={timelineChartConfig.approved.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, cursor: onDataPointClick ? 'pointer' : 'default' }}
          cursor={onDataPointClick ? 'pointer' : 'default'}
        />
        <Line
          type="monotone"
          dataKey="rejected"
          name={timelineChartConfig.rejected.label}
          stroke={timelineChartConfig.rejected.color}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6, cursor: onDataPointClick ? 'pointer' : 'default' }}
          cursor={onDataPointClick ? 'pointer' : 'default'}
        />
      </LineChart>
    </ChartContainer>
  );
}
