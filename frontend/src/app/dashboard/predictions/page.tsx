'use client';

import { useState } from 'react';
import MapView from '@/components/MapView';
import { useAppStore } from '@/store/appStore';
import {
  Map,
  Waves,
  Droplets,
  Calendar,
  AlertTriangle,
  Layers,
} from 'lucide-react';
import type { Prediction } from '@/types';

const mockPredictions: Prediction[] = [
  {
    id: '1',
    type: 'flood',
    region: 'An Giang, Đồng Tháp',
    probability: 0.75,
    severity: 'high',
    expected_at: new Date(Date.now() + 86400000 * 3).toISOString(),
    issued_at: new Date().toISOString(),
  },
  {
    id: '2',
    type: 'flood',
    region: 'Cần Thơ, Hậu Giang',
    probability: 0.45,
    severity: 'medium',
    expected_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    issued_at: new Date().toISOString(),
  },
  {
    id: '3',
    type: 'salinity',
    region: 'Bến Tre, Tiền Giang',
    probability: 0.82,
    severity: 'critical',
    expected_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    issued_at: new Date().toISOString(),
  },
  {
    id: '4',
    type: 'salinity',
    region: 'Sóc Trăng, Bạc Liêu',
    probability: 0.6,
    severity: 'high',
    expected_at: new Date(Date.now() + 86400000 * 4).toISOString(),
    issued_at: new Date().toISOString(),
  },
  {
    id: '5',
    type: 'rainfall',
    region: 'Kiên Giang, Cà Mau',
    probability: 0.9,
    severity: 'high',
    expected_at: new Date(Date.now() + 86400000).toISOString(),
    issued_at: new Date().toISOString(),
  },
];

const severityColors: Record<string, string> = {
  critical: 'border-l-alert-red-500 bg-alert-red-50/30 dark:bg-alert-red-950/10',
  high: 'border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/10',
  medium: 'border-l-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/10',
  low: 'border-l-water-blue-500 bg-water-blue-50/30 dark:bg-water-blue-950/10',
};

export default function PredictionsPage() {
  const { mapLayerVisibility, toggleLayer } = useAppStore();
  const [activeTab, setActiveTab] = useState<'all' | 'flood' | 'salinity' | 'rainfall'>('all');

  const filteredPredictions = activeTab === 'all'
    ? mockPredictions
    : mockPredictions.filter((p) => p.type === activeTab);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dự báo</h1>
        <p className="text-sm text-muted-foreground">
          Dự báo lũ lụt, xâm nhập mặn và thời tiết
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex rounded-lg border border-input overflow-hidden">
          {(['all', 'flood', 'salinity', 'rainfall'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-eco-green-600 text-white'
                  : 'bg-background text-muted-foreground hover:bg-accent'
              }`}
            >
              {tab === 'all' ? 'Tất cả' : tab === 'flood' ? 'Lũ lụt' : tab === 'salinity' ? 'Mặn' : 'Mưa'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => toggleLayer('flood')}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
              mapLayerVisibility.flood
                ? 'border-water-blue-500 bg-water-blue-50 dark:bg-water-blue-950/20 text-water-blue-600'
                : 'border-input bg-background hover:bg-accent'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            Lũ
          </button>
          <button
            onClick={() => toggleLayer('salinity')}
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
              mapLayerVisibility.salinity
                ? 'border-alert-red-500 bg-alert-red-50 dark:bg-alert-red-950/20 text-alert-red-600'
                : 'border-input bg-background hover:bg-accent'
            }`}
          >
            <Droplets className="w-3.5 h-3.5" />
            Mặn
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold flex items-center gap-2">
                <Map className="w-4 h-4" />
                Bản đồ dự báo
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-water-blue-400/50 border border-water-blue-500" />
                  Ngập lũ
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-sm bg-alert-red-400/50 border border-alert-red-500" />
                  Nhiễm mặn
                </span>
              </div>
            </div>
            <div className="h-[500px]">
              <MapView
                predictions={filteredPredictions}
                className="rounded-t-none border-0 h-full"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4" />
              Lớp bản đồ
            </h2>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapLayerVisibility.flood}
                  onChange={() => toggleLayer('flood')}
                  className="rounded border-input"
                />
                <span className="text-sm">Dự báo lũ lụt</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapLayerVisibility.salinity}
                  onChange={() => toggleLayer('salinity')}
                  className="rounded border-input"
                />
                <span className="text-sm">Xâm nhập mặn</span>
              </label>
              <label className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                <input
                  type="checkbox"
                  checked={mapLayerVisibility.satellite}
                  onChange={() => toggleLayer('satellite')}
                  className="rounded border-input"
                />
                <span className="text-sm">Vệ tinh</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            {filteredPredictions.map((prediction) => (
              <div
                key={prediction.id}
                className={`rounded-xl border border-border border-l-4 p-4 ${severityColors[prediction.severity]}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-background border border-border capitalize">
                    {prediction.type === 'flood' ? 'Lũ lụt' : prediction.type === 'salinity' ? 'Xâm nhập mặn' : 'Mưa lớn'}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    prediction.severity === 'critical' ? 'bg-alert-red-100 text-alert-red-600' :
                    prediction.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                    'bg-yellow-100 text-yellow-600'
                  }`}>
                    {Math.round(prediction.probability * 100)}%
                  </span>
                </div>
                <p className="text-sm font-medium mb-1">{prediction.region}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {new Date(prediction.expected_at).toLocaleDateString('vi-VN', {
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>
                {prediction.probability > 0.7 && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-alert-red-500">
                    <AlertTriangle className="w-3 h-3" />
                    Nguy cơ cao
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold mb-4">Thống kê dự báo</h2>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          <div>
            <p className="text-sm text-muted-foreground">Cảnh báo lũ</p>
            <p className="text-2xl font-bold text-water-blue-500">
              {mockPredictions.filter((p) => p.type === 'flood' && p.probability > 0.5).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Cảnh báo mặn</p>
            <p className="text-2xl font-bold text-alert-red-500">
              {mockPredictions.filter((p) => p.type === 'salinity' && p.probability > 0.5).length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nguy cơ nguy kịch</p>
            <p className="text-2xl font-bold text-alert-red-500">
              {mockPredictions.filter((p) => p.severity === 'critical').length}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Trong 7 ngày tới</p>
            <p className="text-2xl font-bold">
              {mockPredictions.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
