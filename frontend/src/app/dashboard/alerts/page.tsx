'use client';

import { useState } from 'react';
import { useAlerts, useMarkAlertRead, useResolveAlert, useAlertStats } from '@/hooks/useAlerts';
import AlertBadge from '@/components/AlertBadge';
import { formatDate, formatRelativeTime } from '@/utils/format';
import { Bell, CheckCircle, Eye, Search, Filter, ArrowUpDown } from 'lucide-react';
import type { AlertSeverity, AlertType } from '@/types';

const severityOptions: { value: AlertSeverity | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả mức độ' },
  { value: 'critical', label: 'Nguy kịch' },
  { value: 'high', label: 'Cao' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'low', label: 'Thấp' },
];

const typeOptions: { value: AlertType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả loại' },
  { value: 'flood', label: 'Lũ lụt' },
  { value: 'salinity', label: 'Xâm nhập mặn' },
  { value: 'drought', label: 'Hạn hán' },
  { value: 'water_quality', label: 'Chất lượng nước' },
  { value: 'soil_degradation', label: 'Thoái hóa đất' },
  { value: 'equipment_failure', label: 'Hỏng thiết bị' },
  { value: 'weather', label: 'Thời tiết' },
];

export default function AlertsPage() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState<AlertSeverity | 'all'>('all');
  const [type, setType] = useState<AlertType | 'all'>('all');
  const [page, setPage] = useState(1);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const { data, isLoading } = useAlerts({
    severity: severity !== 'all' ? severity : undefined,
    type: type !== 'all' ? type : undefined,
    is_read: showUnreadOnly ? false : undefined,
    page,
    per_page: 20,
  });

  const { data: stats } = useAlertStats();
  const markRead = useMarkAlertRead();
  const resolve = useResolveAlert();

  const alerts = data?.data || [];
  const totalPages = data?.total_pages || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lịch sử cảnh báo</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi và xử lý các cảnh báo từ hệ thống
          </p>
        </div>
        {stats && (
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-alert-red-500" />
              {stats.by_severity?.critical || 0} nguy kịch
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              {stats.by_severity?.high || 0} cao
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              {stats.by_severity?.medium || 0} TB
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm cảnh báo..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Tìm kiếm cảnh báo"
          />
        </div>
        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value as AlertSeverity | 'all')}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Lọc theo mức độ"
        >
          {severityOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AlertType | 'all')}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Lọc theo loại"
        >
          {typeOptions.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <button
          onClick={() => setShowUnreadOnly(!showUnreadOnly)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
            showUnreadOnly
              ? 'border-eco-green-500 bg-eco-green-50 dark:bg-eco-green-950/20 text-eco-green-600'
              : 'border-input bg-background hover:bg-accent'
          }`}
        >
          <Eye className="w-4 h-4" />
          Chưa đọc
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-full" />
              <div className="skeleton h-3 w-1/3" />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CheckCircle className="w-16 h-16 text-eco-green-500 mb-4" />
          <h3 className="font-semibold text-lg mb-1">Không có cảnh báo</h3>
          <p className="text-sm text-muted-foreground">Hệ thống đang hoạt động an toàn</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`rounded-xl border p-4 transition-colors ${
                  !alert.is_read
                    ? 'border-eco-green-200 dark:border-eco-green-800 bg-eco-green-50/30 dark:bg-eco-green-950/10'
                    : 'border-border bg-card'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="shrink-0 mt-0.5">
                      <AlertBadge severity={alert.severity} size="md" showLabel={false} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={`text-sm truncate ${!alert.is_read ? 'font-semibold' : ''}`}>
                          {alert.title}
                        </h3>
                        <AlertBadge severity={alert.severity} size="sm" />
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full capitalize">
                          {alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                      {alert.value !== undefined && alert.threshold !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Giá trị: {alert.value} | Ngưỡng: {alert.threshold}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2">
                        <span>{formatRelativeTime(alert.created_at)}</span>
                        <span>{formatDate(alert.created_at)}</span>
                        {alert.resolved_at && (
                          <span className="text-eco-green-600">Đã xử lý: {formatDate(alert.resolved_at)}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!alert.is_read && (
                      <button
                        onClick={() => markRead.mutate(alert.id)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors"
                        aria-label="Đánh dấu đã đọc"
                        title="Đánh dấu đã đọc"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    {!alert.resolved_at && (
                      <button
                        onClick={() => resolve.mutate(alert.id)}
                        className="p-2 rounded-lg hover:bg-accent transition-colors text-eco-green-600"
                        aria-label="Đánh dấu đã xử lý"
                        title="Đánh dấu đã xử lý"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Trước
              </button>
              <span className="text-sm text-muted-foreground">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-2 rounded-lg border border-input bg-background text-sm hover:bg-accent disabled:opacity-50 transition-colors"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
