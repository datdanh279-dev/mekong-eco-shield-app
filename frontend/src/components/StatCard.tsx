import { type LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    positive: boolean;
  };
  description?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
}: StatCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="p-2.5 rounded-lg bg-eco-green-50 dark:bg-eco-green-950/30">
          <Icon className="w-5 h-5 text-eco-green-600 dark:text-eco-green-400" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1">
          <span
            className={clsx(
              'inline-flex items-center text-xs font-medium',
              trend.positive ? 'text-eco-green-600' : 'text-alert-red-500'
            )}
          >
            {trend.positive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
          <span className="text-xs text-muted-foreground">so với tháng trước</span>
        </div>
      )}
    </div>
  );
}
