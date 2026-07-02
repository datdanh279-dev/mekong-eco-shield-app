const DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const DATE_ONLY_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const CURRENCY_FORMAT = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUMBER_FORMAT = new Intl.NumberFormat('vi-VN');

const AREA_FORMAT = new Intl.NumberFormat('vi-VN', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 2,
});

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATE_FORMAT.format(d);
}

export function formatDateOnly(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return DATE_ONLY_FORMAT.format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date();
  const d = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHour < 24) return `${diffHour} giờ trước`;
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return formatDateOnly(d);
}

export function formatCurrency(amount: number): string {
  return CURRENCY_FORMAT.format(amount);
}

export function formatNumber(num: number): string {
  return NUMBER_FORMAT.format(num);
}

export function formatArea(hectares: number): string {
  return `${AREA_FORMAT.format(hectares)} ha`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatBattery(level: number): string {
  return `${Math.round(level)}%`;
}

export function formatSensorValue(value: number, unit: string): string {
  return `${formatNumber(value)} ${unit}`;
}

export function getAlertSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'text-alert-red-500 bg-alert-red-50 dark:bg-alert-red-950/20';
    case 'high': return 'text-orange-500 bg-orange-50 dark:bg-orange-950/20';
    case 'medium': return 'text-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    case 'low': return 'text-water-blue-500 bg-water-blue-50 dark:bg-water-blue-950/20';
    default: return 'text-muted-foreground bg-muted';
  }
}

export function getSensorStatusColor(status: string): string {
  switch (status) {
    case 'online': return 'text-eco-green-500';
    case 'offline': return 'text-muted-foreground';
    case 'error': return 'text-alert-red-500';
    case 'maintenance': return 'text-yellow-500';
    default: return 'text-muted-foreground';
  }
}

export function getCropTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    rice: 'Lúa',
    fruit: 'Cây ăn trái',
    vegetable: 'Rau màu',
    aquaculture: 'Thủy sản',
    mixed: 'Đa canh',
  };
  return labels[type] || type;
}

export function getCreditTierLabel(tier: string): string {
  const labels: Record<string, string> = {
    platinum: 'Bạch kim',
    gold: 'Vàng',
    silver: 'Bạc',
    bronze: 'Đồng',
    none: 'Chưa xếp hạng',
  };
  return labels[tier] || tier;
}

export function getSensorTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    water_level: 'Mực nước',
    salinity: 'Độ mặn',
    temperature: 'Nhiệt độ',
    humidity: 'Độ ẩm',
    soil_moisture: 'Độ ẩm đất',
    rainfall: 'Lượng mưa',
    ph: 'Độ pH',
    turbidity: 'Độ đục',
  };
  return labels[type] || type;
}

export function getSensorUnit(type: string): string {
  const units: Record<string, string> = {
    water_level: 'm',
    salinity: 'ppt',
    temperature: '°C',
    humidity: '%',
    soil_moisture: '%',
    rainfall: 'mm',
    ph: '',
    turbidity: 'NTU',
  };
  return units[type] || '';
}
