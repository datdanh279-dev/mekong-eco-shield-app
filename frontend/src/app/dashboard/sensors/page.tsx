'use client';

import { useState } from 'react';
import { useSensors } from '@/hooks/useSensors';
import SensorChart from '@/components/SensorChart';
import { useSensorReadings } from '@/hooks/useSensors';
import {
  Radio,
  Search,
  Filter,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  MapPin,
} from 'lucide-react';
import { getSensorTypeLabel, getSensorUnit, getSensorStatusColor, formatDate } from '@/utils/format';
import type { SensorType, SensorStatus } from '@/types';

const sensorTypes: { value: SensorType | ''; label: string }[] = [
  { value: '', label: 'Tất cả loại' },
  { value: 'water_level', label: 'Mực nước' },
  { value: 'salinity', label: 'Độ mặn' },
  { value: 'temperature', label: 'Nhiệt độ' },
  { value: 'humidity', label: 'Độ ẩm' },
  { value: 'soil_moisture', label: 'Độ ẩm đất' },
  { value: 'rainfall', label: 'Lượng mưa' },
  { value: 'ph', label: 'Độ pH' },
  { value: 'turbidity', label: 'Độ đục' },
];

const statusFilters: { value: SensorStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'online', label: 'Trực tuyến' },
  { value: 'offline', label: 'Ngoại tuyến' },
  { value: 'error', label: 'Lỗi' },
  { value: 'maintenance', label: 'Bảo trì' },
];

function BatteryIndicator({ level }: { level: number }) {
  if (level > 60) return <BatteryFull className="w-4 h-4 text-eco-green-500" />;
  if (level > 20) return <BatteryMedium className="w-4 h-4 text-yellow-500" />;
  return <BatteryLow className="w-4 h-4 text-alert-red-500" />;
}

export default function SensorsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<SensorType | ''>('');
  const [statusFilter, setStatusFilter] = useState<SensorStatus | 'all'>('all');
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);

  const { data, isLoading } = useSensors({
    type: typeFilter || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const { data: readings } = useSensorReadings(selectedSensorId || '', { limit: 50 });

  const sensors = data?.data || [];

  const filtered = sensors.filter((s) =>
    !search || s.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedSensor = sensors.find((s) => s.id === selectedSensorId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trạm cảm biến</h1>
        <p className="text-sm text-muted-foreground">
          Giám sát dữ liệu cảm biến theo thời gian thực
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm cảm biến..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Tìm kiếm cảm biến"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as SensorType | '')}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Lọc theo loại"
        >
          {sensorTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as SensorStatus | 'all')}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Lọc theo trạng thái"
        >
          {statusFilters.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Radio className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg mb-1">Không tìm thấy cảm biến</h3>
          <p className="text-sm text-muted-foreground">Thử thay đổi bộ lọc tìm kiếm</p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-3">
            {filtered.map((sensor) => (
              <button
                key={sensor.id}
                onClick={() => setSelectedSensorId(sensor.id)}
                className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                  selectedSensorId === sensor.id
                    ? 'border-eco-green-500 bg-eco-green-50/50 dark:bg-eco-green-950/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${getSensorStatusColor(sensor.status)}`} />
                    <div>
                      <p className="font-medium text-sm">{sensor.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getSensorTypeLabel(sensor.type)}
                      </p>
                    </div>
                  </div>
                  <BatteryIndicator level={sensor.battery_level} />
                </div>
                {sensor.last_reading && (
                  <div className="flex items-center justify-between text-sm mt-2 pt-2 border-t border-border">
                    <span className="font-semibold text-lg">
                      {sensor.last_reading.value} {getSensorUnit(sensor.type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(sensor.last_reading.recorded_at)}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {selectedSensor && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold mb-1">{selectedSensor.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  {getSensorTypeLabel(selectedSensor.type)} - {selectedSensor.status}
                </p>
                {selectedSensor.last_reading && (
                  <div className="mb-3">
                    <p className="text-3xl font-bold text-eco-green-600">
                      {selectedSensor.last_reading.value}
                      <span className="text-sm font-normal text-muted-foreground ml-1">
                        {getSensorUnit(selectedSensor.type)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Cập nhật: {formatDate(selectedSensor.last_reading.recorded_at)}
                    </p>
                  </div>
                )}
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Pin: {selectedSensor.battery_level}%</p>
                  <p>Ngày lắp đặt: {formatDate(selectedSensor.installed_at)}</p>
                </div>
              </div>
            )}

            {selectedSensorId && readings && (
              <div className="rounded-xl border border-border bg-card p-4">
                <h3 className="font-semibold mb-3">Biểu đồ dữ liệu</h3>
                <SensorChart
                  data={readings}
                  sensorType={selectedSensor?.type || 'temperature'}
                  unit={getSensorUnit(selectedSensor?.type || 'temperature')}
                  height={250}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
