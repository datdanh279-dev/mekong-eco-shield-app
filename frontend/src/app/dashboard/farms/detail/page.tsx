'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFarm } from '@/hooks/useFarms';
import { useFarmSensors, useLatestReadings } from '@/hooks/useSensors';
import { useCreditScore } from '@/hooks/useCredit';
import SensorChart from '@/components/SensorChart';
import CreditScoreCard from '@/components/CreditScoreCard';
import AlertBadge from '@/components/AlertBadge';
import MapView from '@/components/MapView';
import { getCropTypeLabel, formatArea, getSensorTypeLabel, getSensorUnit, getSensorStatusColor, formatDate } from '@/utils/format';
import { Sprout, MapPin, Radio, Droplets, Thermometer, Gauge, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

function FarmDetailInner() {
  const searchParams = useSearchParams();
  const id = searchParams?.get('id') ?? '';
  const { data: farm, isLoading: farmLoading } = useFarm(id);
  const { data: sensors } = useFarmSensors(id);
  const { data: latestReadings } = useLatestReadings(id);
  const { data: creditScore } = useCreditScore(id);

  if (farmLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-80 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!farm) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-lg font-medium">Không tìm thấy trang trại</p>
        <Link href="/dashboard/farms" className="text-sm text-eco-green-600 hover:underline mt-2">
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const sensorList = sensors || [];
  const readings = latestReadings || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/farms"
          className="p-2 rounded-lg hover:bg-accent transition-colors"
          aria-label="Quay lại"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{farm.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {farm.address}, {farm.district}, {farm.province}
          </p>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Sprout className="w-4 h-4" />
            Cây trồng
          </div>
          <p className="font-semibold">{getCropTypeLabel(farm.crop_type)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Gauge className="w-4 h-4" />
            Diện tích
          </div>
          <p className="font-semibold">{formatArea(farm.area_ha)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Radio className="w-4 h-4" />
            Cảm biến
          </div>
          <p className="font-semibold">{sensorList.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Droplets className="w-4 h-4" />
            Nguồn nước
          </div>
          <p className="font-semibold capitalize">{farm.water_source}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Bản đồ trang trại</h2>
            </div>
            <MapView
              farms={[farm]}
              sensors={sensorList}
              className="rounded-t-none border-0"
            />
          </div>

          {sensorList.length > 0 && (
            <div className="rounded-xl border border-border bg-card">
              <div className="p-4 border-b border-border">
                <h2 className="font-semibold">Dữ liệu cảm biến</h2>
              </div>
              <div className="divide-y divide-border">
                {sensorList.map((sensor) => {
                  const reading = readings[sensor.id];
                  return (
                    <div key={sensor.id} className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${getSensorStatusColor(sensor.status)}`} />
                          <span className="font-medium text-sm">{sensor.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {getSensorTypeLabel(sensor.type)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {reading && (
                            <span className="text-sm font-semibold">
                              {reading.value} {getSensorUnit(sensor.type)}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            Pin: {sensor.battery_level}%
                          </span>
                        </div>
                      </div>
                      {reading && (
                        <SensorChart
                          data={[reading]}
                          sensorType={sensor.type}
                          unit={getSensorUnit(sensor.type)}
                          height={200}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {creditScore && <CreditScoreCard data={creditScore} />}

          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="font-semibold mb-3">Thông tin chi tiết</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Loại đất</span>
                <span className="font-medium capitalize">{farm.soil_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trạng thái</span>
                <span className={`font-medium ${farm.status === 'active' ? 'text-eco-green-600' : ''}`}>
                  {farm.status === 'active' ? 'Đang hoạt động' : farm.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ngày tạo</span>
                <span className="font-medium">{formatDate(farm.created_at)}</span>
              </div>
            </div>
          </div>

          {sensorList.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="font-semibold mb-3">Trạng thái cảm biến</h3>
              <div className="space-y-2">
                {sensorList.map((s) => (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getSensorStatusColor(s.status)}`} />
                      <span className="truncate max-w-[120px]">{s.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground capitalize">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function FarmDetailPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="skeleton h-8 w-64" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            <div className="skeleton h-64 rounded-xl" />
            <div className="skeleton h-48 rounded-xl" />
          </div>
          <div className="space-y-4">
            <div className="skeleton h-80 rounded-xl" />
          </div>
        </div>
      </div>
    }>
      <FarmDetailInner />
    </Suspense>
  );
}
