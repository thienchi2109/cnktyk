// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ReferenceLine } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { CreditTimeline } from '@/types/reports';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';

interface CreditsTimelineChartProps {
    data: CreditTimeline[];
}

const chartConfig = {
    cumulativeCredits: {
        label: 'Tổng tín chỉ tích lũy',
        color: '#0066CC', // Medical Blue
    },
};

export function CreditsTimelineChart({ data }: CreditsTimelineChartProps) {
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

    const chartWidth = Math.max(dimensions.width, 300);
    const chartHeight = Math.max(dimensions.height, 300);

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p>Không có dữ liệu</p>
            </div>
        );
    }

    // Format dates for display
    const chartData = data.map((item) => ({
        ...item,
        formattedDate: format(new Date(item.date), 'dd/MM/yyyy', { locale: vi }),
    }));

    return (
        <ChartContainer
            ref={containerRef}
            config={chartConfig}
            className="h-[300px] w-full min-w-0"
        >
            <div className="flex h-full w-full items-center justify-center">
                <AreaChart
                    width={chartWidth}
                    height={chartHeight}
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                    <defs>
                        <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0066CC" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#0066CC" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                    <XAxis
                        dataKey="formattedDate"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={30}
                        style={{ fontSize: '12px' }}
                    />
                    <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        style={{ fontSize: '12px' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                        type="monotone"
                        dataKey="cumulativeCredits"
                        stroke="#0066CC"
                        fillOpacity={1}
                        fill="url(#colorCredits)"
                        name="Tín chỉ tích lũy"
                    />
                    {/* Target Line at 120 credits */}
                    <ReferenceLine
                        y={120}
                        label={{
                            value: 'Mục tiêu (120)',
                            position: 'insideTopRight',
                            fill: '#00A86B',
                            fontSize: 12
                        }}
                        stroke="#00A86B"
                        strokeDasharray="3 3"
                    />
                </AreaChart>
            </div>
        </ChartContainer>
    );
}
