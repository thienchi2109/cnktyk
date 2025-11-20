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
import { activityTypeChartConfig, getActivityTypeColor } from './chart-config';
import type { CreditsBreakdown } from '@/types/reports';

interface CreditsBreakdownPieChartProps {
    data: CreditsBreakdown[];
}

export function CreditsBreakdownPieChart({ data }: CreditsBreakdownPieChartProps) {
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

    const chartWidth = Math.max(dimensions.width, 260);
    const chartHeight = Math.max(dimensions.height, 260);
    const outerRadius = Math.max(Math.min(chartWidth, chartHeight) / 2 - 24, 72);

    if (!data || data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
                <p>Không có dữ liệu</p>
            </div>
        );
    }

    // Transform data for Recharts
    const chartData = data.map((item) => ({
        name: activityTypeChartConfig[item.type]?.label || item.type,
        value: item.credits,
        fill: getActivityTypeColor(item.type),
    }));

    return (
        <ChartContainer
            ref={containerRef}
            config={activityTypeChartConfig}
            className="h-[300px] w-full min-w-0"
        >
            <div className="flex h-full w-full items-center justify-center">
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
            </div>
        </ChartContainer>
    );
}
