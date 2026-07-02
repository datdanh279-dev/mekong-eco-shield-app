'use client';

import { useState } from 'react';
import { useFarms } from '@/hooks/useFarms';
import { useSensors } from '@/hooks/useSensors';
import { useRecentAlerts, useAlertStats } from '@/hooks/useAlerts';
import StatCard from '@/components/StatCard';
import MapView from '@/components/MapView';
import AlertList from '@/components/AlertList';
import { Sprout, Radio, Bell, Leaf, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Farm, SensorStation } from '@/types';

export default function DashboardPage() {
  const { data: farmsData } = useFarms({ per_page: 100 });
  const { data: sensorsData } = useSensors();
  const { data: recentAlerts } = useRecentAlerts(5);
  const { data: alertStats } = useAlertStats();
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<SensorStation | null>(null);

  const farms = farmsData?.data || [];
  const sensors = sensorsData?.data || [];
  const alerts = recentAlerts || [];
  const activeAlerts = alertStats?.active || 0;

  const onlineSensors = sensors.filter((s) => s.status === 'online').length;
  const avgScore = 72;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-sm text-muted-foreground">
          Bảng điều khiển giám sát nông nghiệp Đồng bằng sông Cửu Long
        </p>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Trang trại"
          value={farms.length}
          icon={Sprout}
          trend={{ value: 12, positive: true }}
        />
        <StatCard
          title="Cảm biến đang hoạt động"
          value={`${onlineSensors}/${sensors.length}`}
          icon={Radio}
          description={`${sensors.length - onlineSensors} cảm biến ngoại tuyến`}
        />
        <StatCard
          title="Cảnh báo đang hoạt động"
          value={activeAlerts}
          icon={Bell}
          trend={{ value: activeAlerts > 0 ? activeAlerts * 10 : 0, positive: false }}
          description={activeAlerts > 0 ? 'Cần xử lý ngay' : 'Hệ thống an toàn'}
        />
        <StatCard
          title="Điểm tín dụng trung bình"
          value={avgScore}
          icon={Leaf}
          trend={{ value: 5, positive: true }}
          description="Xếp hạng: Bạc"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Bản đồ canh tác</h2>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-eco-green-500" />
                  Trang trại
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-water-blue-500" />
                  Cảm biến
                </span>
              </div>
            </div>
            <MapView
              farms={farms}
              sensors={sensors}
              onFarmClick={(f) => setSelectedFarm(f)}
              onSensorClick={(s) => setSelectedSensor(s)}
              className="rounded-t-none border-0"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Cảnh báo gần đây
              </h2>
              {activeAlerts > 0 && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-alert-red-100 dark:bg-alert-red-900/30 text-alert-red-600">
                  {activeAlerts} mới
                </span>
              )}
            </div>
            <AlertList limit={5} compact />
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4" />
              Chỉ số nhanh
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Lượng mưa hôm nay</span>
                <span className="font-medium">12.5 mm</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Nhiệt độ trung bình</span>
                <span className="font-medium">31.2 °C</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Độ mặn trung bình</span>
                <span className="font-medium">4.8 ppt</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Mực nước sông</span>
                <span className="font-medium">2.3 m</span>
              </div>
            </div>
          </div>

          {farms.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                Trang trại có nguy cơ
              </h2>
              {farms.slice(0, 3).map((farm) => (
                <div key={farm.id} className="flex items-center justify-between py-2 text-sm border-b border-border last:border-0">
                  <span className="truncate">{farm.name}</span>
                  <span className="text-xs text-muted-foreground">{farm.province}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedFarm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setSelectedFarm(null)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-2">{selectedFarm.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{selectedFarm.address}, {selectedFarm.district}, {selectedFarm.province}</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Diện tích:</span> <span className="font-medium">{selectedFarm.area_ha} ha</span></div>
              <div><span className="text-muted-foreground">Loại cây:</span> <span className="font-medium">{selectedFarm.crop_type}</span></div>
              <div><span className="text-muted-foreground">Loại đất:</span> <span className="font-medium">{selectedFarm.soil_type}</span></div>
              <div><span className="text-muted-foreground">Nguồn nước:</span> <span className="font-medium">{selectedFarm.water_source}</span></div>
            </div>
            <button
              onClick={() => setSelectedFarm(null)}
              className="mt-4 w-full rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
