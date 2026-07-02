import type { CreditScore } from '@/types';
import { getCreditTierLabel } from '@/utils/format';
import { clsx } from 'clsx';

interface CreditScoreCardProps {
  data: CreditScore;
  compact?: boolean;
}

const tierColors: Record<string, string> = {
  platinum: 'text-purple-500 border-purple-500',
  gold: 'text-yellow-500 border-yellow-500',
  silver: 'text-gray-400 border-gray-400',
  bronze: 'text-orange-600 border-orange-600',
  none: 'text-muted-foreground border-muted',
};

function ScoreGauge({ score }: { score: number }) {
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(score, 100) / 100;
  const strokeDashoffset = circumference * (1 - progress);

  const getColor = () => {
    if (score >= 90) return '#22c55e';
    if (score >= 75) return '#3b82f6';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="180" height="180" className="-rotate-90">
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
        />
        <circle
          cx="90"
          cy="90"
          r={radius}
          fill="none"
          stroke={getColor()}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold" style={{ color: getColor() }}>
          {score}
        </span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export default function CreditScoreCard({ data, compact = false }: CreditScoreCardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border border-border bg-card p-6',
        compact ? 'space-y-3' : 'space-y-6'
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Điểm tín dụng xanh</h3>
        <span
          className={clsx(
            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
            tierColors[data.tier]
          )}
        >
          {getCreditTierLabel(data.tier)}
        </span>
      </div>

      <div className="flex justify-center">
        <ScoreGauge score={data.score} />
      </div>

      {!compact && data.factors && data.factors.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Các yếu tố đánh giá</h4>
          <div className="space-y-2">
            {data.factors.map((factor) => (
              <div key={factor.name} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{factor.label}</span>
                  <span className="font-medium">{factor.score}/{factor.weight}</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-eco-green-500 transition-all duration-500"
                    style={{ width: `${(factor.score / factor.weight) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{factor.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.valid_until && (
        <p className="text-xs text-muted-foreground text-center">
          Hiệu lực đến: {new Date(data.valid_until).toLocaleDateString('vi-VN')}
        </p>
      )}
    </div>
  );
}
