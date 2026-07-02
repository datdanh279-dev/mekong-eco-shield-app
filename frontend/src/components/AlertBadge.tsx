import { clsx } from 'clsx';
import { AlertTriangle, AlertCircle, Info, AlertOctagon } from 'lucide-react';
import type { AlertSeverity } from '@/types';

interface AlertBadgeProps {
  severity: AlertSeverity;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const severityConfig = {
  critical: {
    color: 'bg-alert-red-500 text-white',
    icon: AlertOctagon,
    label: 'Nguy kịch',
  },
  high: {
    color: 'bg-orange-500 text-white',
    icon: AlertTriangle,
    label: 'Cao',
  },
  medium: {
    color: 'bg-yellow-500 text-white',
    icon: AlertCircle,
    label: 'Trung bình',
  },
  low: {
    color: 'bg-water-blue-500 text-white',
    icon: Info,
    label: 'Thấp',
  },
};

export default function AlertBadge({ severity, size = 'md', showLabel = true }: AlertBadgeProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full font-medium',
        config.color,
        sizeClasses[size]
      )}
      aria-label={`Mức độ: ${config.label}`}
    >
      <Icon className={iconSizes[size]} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}
