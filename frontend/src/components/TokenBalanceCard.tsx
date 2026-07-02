'use client';

import { useEffect, useState } from 'react';
import { useTokenAccount } from '@/hooks/useTokens';
import { useAuthStore } from '@/store/authStore';
import { Wallet, Send, Repeat, History, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const tierColors: Record<string, string> = {
  bronze: '#cd7f32',
  silver: '#c0c0c0',
  gold: '#ffd700',
  platinum: '#e5e4e2',
};

const tierLabels: Record<string, string> = {
  bronze: 'Đồng',
  silver: 'Bạc',
  gold: 'Vàng',
  platinum: 'Bạch kim',
};

export default function TokenBalanceCard() {
  const { data: account, isLoading } = useTokenAccount();
  const setTokenBalance = useAuthStore((s) => s.setTokenBalance);
  const [animatedBalance, setAnimatedBalance] = useState(0);

  const balance = account?.balance ?? 0;
  const tier = account?.tier ?? 'bronze';

  useEffect(() => {
    if (account) {
      setTokenBalance(Number(balance), tier);
    }
  }, [account, balance, tier, setTokenBalance]);

  useEffect(() => {
    const target = Number(balance);
    if (target === 0) {
      setAnimatedBalance(0);
      return;
    }
    const start = animatedBalance;
    const duration = 800;
    const startTime = performance.now();
    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedBalance(Math.round(start + (target - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [balance]);

  if (isLoading) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded mb-4" />
        <div className="h-12 w-48 bg-muted rounded mb-2" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-eco-green-500" />
          <h3 className="font-semibold">Token sinh tồn</h3>
        </div>
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border"
          style={{
            borderColor: tierColors[tier] || '#cd7f32',
            color: tierColors[tier] || '#cd7f32',
            backgroundColor: `${tierColors[tier] || '#cd7f32'}15`,
          }}
        >
          <TrendingUp className="w-3 h-3" />
          {tierLabels[tier] || 'Đồng'}
        </span>
      </div>

      <div className="text-center py-2">
        <p className="text-4xl font-bold tracking-tight">
          {animatedBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">SURV Token</p>
      </div>

      {account && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-3">
          <span>Đã kiếm: {Number(account.lifetime_earned).toLocaleString('vi-VN')}</span>
          <span>Đã dùng: {Number(account.lifetime_spent).toLocaleString('vi-VN')}</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Link
          href="/dashboard/tokens/transfer"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
          Chuyển
        </Link>
        <Link
          href="/dashboard/tokens/exchange"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
        >
          <Repeat className="w-3.5 h-3.5" />
          Sàn
        </Link>
        <Link
          href="/dashboard/tokens"
          className="flex items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium hover:bg-accent transition-colors"
        >
          <History className="w-3.5 h-3.5" />
          Lịch sử
        </Link>
      </div>
    </div>
  );
}
