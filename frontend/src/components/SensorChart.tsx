'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useMemo } from 'react';
import type { SensorReading } from '@/types';
import { formatDate, getSensorTypeLabel } from '@/utils/format';

interface SensorChartProps {
  data: SensorReading[];
  sensorType: string;
  unit: string;
  height?: number;
  showArea?: boolean;
}

export default function SensorChart({
  data,
  sensorType,
  unit,
  height = 300,
  showArea = true,
}: SensorChartProps) {
  const chartData = useMemo(() => {
    return data
      .map((d) => ({
        time: new Date(d.recorded_at).getTime(),
        value: d.value,
        label: formatDate(d.recorded_at),
      }))
      .sort((a, b) => a.time - b.time);
  }, [data]);

  const formatXAxis = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">
            {new Date(label).toLocaleString('vi-VN')}
          </p>
          <p className="text-sm font-medium">
            {getSensorTypeLabel(sensorType)}: {payload[0].value} {unit}
          </p>
        </div>
      );
    }
    return null;
  };

  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30"
        style={{ height }}
      >
        <p className="text-sm text-muted-foreground">Chưa có dữ liệu cảm biến</p>
      </div>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;
  const DataComponent = showArea ? Area : Line;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="time"
          tickFormatter={formatXAxis}
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          unit={` ${unit}`}
        />
        <Tooltip content={<CustomTooltip />} />
        {showArea ? (
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary) / 0.15)"
            strokeWidth={2}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2 }}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}
