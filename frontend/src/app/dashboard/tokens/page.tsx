'use client';

import { useState } from 'react';
import { useTokenAccount, useTokenTransactions, useMarketStats, useContributeMesh, useContributeData } from '@/hooks/useTokens';
import TokenBalanceCard from '@/components/TokenBalanceCard';
import {
  Wallet,
  Send,
  Repeat,
  History,
  ShoppingBag,
  BarChart3,
  Shield,
  Activity,
  Wifi,
  Database,
  ChevronRight,
  TrendingUp,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
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

const tierThresholds = [
  { tier: 'platinum', min: 10000, label: 'Bạch kim', color: '#e5e4e2' },
  { tier: 'gold', min: 1000, label: 'Vàng', color: '#ffd700' },
  { tier: 'silver', min: 100, label: 'Bạc', color: '#c0c0c0' },
  { tier: 'bronze', min: 0, label: 'Đồng', color: '#cd7f32' },
];

const txLabels: Record<string, string> = {
  mesh_contribution: 'Chia sẻ mesh',
  data_contribution: 'Đóng góp dữ liệu',
  alert_response: 'Phản hồi cảnh báo',
  referral: 'Giới thiệu',
  emergency_aid: 'Viện trợ khẩn cấp',
  exchange_goods: 'Trao đổi hàng hóa',
  governance_reward: 'Thưởng quản trị',
};

const txIcons: Record<string, React.ReactNode> = {
  mesh_contribution: <Wifi className="w-4 h-4 text-water-blue-500" />,
  data_contribution: <Database className="w-4 h-4 text-eco-green-500" />,
  alert_response: <Activity className="w-4 h-4 text-orange-500" />,
  emergency_aid: <Shield className="w-4 h-4 text-alert-red-500" />,
  exchange_goods: <ShoppingBag className="w-4 h-4 text-yellow-500" />,
};

export default function TokensPage() {
  const [txPage, setTxPage] = useState(1);

  const { data: account } = useTokenAccount();
  const { data: txData } = useTokenTransactions(txPage);
  const { data: stats } = useMarketStats();
  const contributeMesh = useContributeMesh();
  const contributeData = useContributeData();

  const tier = account?.tier || 'bronze';
  const lifetimeEarned = Number(account?.lifetime_earned || 0);

  const currentTierIdx = tierThresholds.findIndex((t) => t.tier === tier);
  const nextTier = currentTierIdx > 0 ? tierThresholds[currentTierIdx - 1] : null;
  const currentTierMin = tierThresholds[currentTierIdx]?.min || 0;
  const tierProgress = nextTier
    ? Math.min(((lifetimeEarned - currentTierMin) / (nextTier.min - currentTierMin)) * 100, 100)
    : 100;

  const transactions = txData?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Token sinh tồn</h1>
          <p className="text-sm text-muted-foreground">
            Kiếm token qua đóng góp và giao dịch trên chợ khẩn cấp
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => contributeMesh.mutate({})}
            disabled={contributeMesh.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50 transition-colors"
          >
            <Wifi className="w-4 h-4" />
            Mesh
          </button>
          <button
            onClick={() => contributeData.mutate({})}
            disabled={contributeData.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-eco-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
          >
            <Database className="w-4 h-4" />
            + Dữ liệu
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6">
          <TokenBalanceCard />

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm">Tiến trình hạng</h4>
              <span
                className="text-xs font-medium"
                style={{ color: tierColors[tier] || '#cd7f32' }}
              >
                {tierLabels[tier] || 'Đồng'}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${tierProgress}%`,
                  backgroundColor: tierColors[tier] || '#cd7f32',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Đã kiếm: {lifetimeEarned.toLocaleString('vi-VN')}</span>
              {nextTier && (
                <span>
                  {nextTier.label}: {nextTier.min.toLocaleString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {stats && (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Wallet className="w-3.5 h-3.5 text-eco-green-500" />
                  Tổng cung
                </div>
                <p className="text-lg font-bold">
                  {Number(stats.total_supply).toLocaleString('vi-VN')}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <ShoppingBag className="w-3.5 h-3.5 text-water-blue-500" />
                  Đang bán
                </div>
                <p className="text-lg font-bold">{stats.active_listings}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-yellow-500" />
                  Giao dịch/24h
                </div>
                <p className="text-lg font-bold">{stats.trades_24h}</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Shield className="w-3.5 h-3.5 text-alert-red-500" />
                  Quỹ khẩn cấp
                </div>
                <p className="text-lg font-bold">
                  {Number(stats.emergency_reserve).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold">Hoạt động token</h2>
              <Link
                href="/dashboard/tokens/exchange"
                className="flex items-center gap-1 text-xs text-eco-green-600 hover:underline"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                Chợ khẩn cấp
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {transactions.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Chưa có giao dịch nào
              </div>
            ) : (
              <div className="divide-y divide-border">
                {transactions.map((tx) => {
                  const isCredit = tx.to_account_id !== null && tx.from_account_id === null;
                  const isDebit = tx.from_account_id !== null && tx.to_account_id === null;
                  const isTransfer = tx.from_account_id !== null && tx.to_account_id !== null;
                  const isReceived = isTransfer && tx.to_account_id !== null && tx.from_account_id !== null;

                  return (
                    <div key={tx.id} className="flex items-center gap-3 p-4">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {txIcons[tx.transaction_type] || (
                          <Activity className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {txLabels[tx.transaction_type] || tx.transaction_type}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {tx.description || ''}
                          <span className="ml-2">
                            {new Date(tx.created_at).toLocaleString('vi-VN')}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isCredit || isReceived ? (
                          <ArrowDownLeft className="w-3.5 h-3.5 text-eco-green-500" />
                        ) : (
                          <ArrowUpRight className="w-3.5 h-3.5 text-alert-red-500" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            isCredit || isReceived ? 'text-eco-green-600' : 'text-alert-red-500'
                          }`}
                        >
                          {isCredit || isReceived ? '+' : '-'}
                          {Number(tx.amount).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {txData && txData.total_pages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-border">
                <button
                  disabled={txPage <= 1}
                  onClick={() => setTxPage((p) => p - 1)}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Trước
                </button>
                <span className="text-xs text-muted-foreground">
                  Trang {txData.page} / {txData.total_pages}
                </span>
                <button
                  disabled={txPage >= txData.total_pages}
                  onClick={() => setTxPage((p) => p + 1)}
                  className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
