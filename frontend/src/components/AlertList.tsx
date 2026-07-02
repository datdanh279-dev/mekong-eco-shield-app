'use client';

import { useRecentAlerts, useMarkAlertRead, useResolveAlert } from '@/hooks/useAlerts';
import AlertBadge from './AlertBadge';
import { formatRelativeTime } from '@/utils/format';
import { CheckCircle, Eye } from 'lucide-react';
import { clsx } from 'clsx';

interface AlertListProps {
  limit?: number;
  compact?: boolean;
  farmId?: string;
}

export default function AlertList({ limit = 10, compact = false }: AlertListProps) {
  const { data: alerts, isLoading } = useRecentAlerts(limit);
  const markRead = useMarkAlertRead();
  const resolve = useResolveAlert();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-3 p-3">
            <div className="skeleton w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-3/4" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle className="w-12 h-12 text-eco-green-500 mb-2" />
        <p className="text-sm font-medium text-foreground">Không có cảnh báo</p>
        <p className="text-xs text-muted-foreground">Hệ thống đang hoạt động bình thường</p>
      </div>
    );
  }

  return (
    <div className={clsx('divide-y divide-border', compact ? 'max-h-[400px] overflow-y-auto scrollbar-thin' : '')}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={clsx(
            'flex items-start gap-3 p-3 transition-colors hover:bg-muted/30',
            !alert.is_read && 'bg-eco-green-50/50 dark:bg-eco-green-950/10'
          )}
        >
          <div className="shrink-0 mt-0.5">
            <AlertBadge severity={alert.severity} size="sm" showLabel={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className={clsx('text-sm truncate', !alert.is_read && 'font-semibold')}>
                {alert.title}
              </p>
              <AlertBadge severity={alert.severity} size="sm" />
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{alert.message}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{formatRelativeTime(alert.created_at)}</span>
              {!alert.is_read && (
                <button
                  onClick={() => markRead.mutate(alert.id)}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                  aria-label="Đánh dấu đã đọc"
                >
                  <Eye className="w-3 h-3" />
                  Đã đọc
                </button>
              )}
              {!alert.resolved_at && (
                <button
                  onClick={() => resolve.mutate(alert.id)}
                  className="inline-flex items-center gap-1 text-eco-green-600 hover:text-eco-green-700 transition-colors"
                  aria-label="Đánh dấu đã xử lý"
                >
                  <CheckCircle className="w-3 h-3" />
                  Xử lý
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
