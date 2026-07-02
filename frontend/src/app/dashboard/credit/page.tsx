'use client';

import { useState } from 'react';
import { useCreditScore, useCreditApplications, useCreateCreditApplication, useCreditTiers } from '@/hooks/useCredit';
import { useFarms } from '@/hooks/useFarms';
import CreditScoreCard from '@/components/CreditScoreCard';
import { CreditCard, Plus, Leaf, TrendingUp, Landmark, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatCurrency, formatDate, getCreditTierLabel } from '@/utils/format';
import type { CreditApplicationPayload } from '@/types';

export default function CreditPage() {
  const [showApply, setShowApply] = useState(false);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [amount, setAmount] = useState(50000000);
  const [termMonths, setTermMonths] = useState(12);
  const [purpose, setPurpose] = useState('');

  const { data: farmsData } = useFarms({ per_page: 100 });
  const { data: applicationsData } = useCreditApplications();
  const { data: tiers } = useCreditTiers();
  const createApplication = useCreateCreditApplication();

  const farms = farmsData?.data || [];
  const applications = applicationsData?.data || [];
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const { data: creditScore } = useCreditScore(activeFarmId || '');

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId || amount <= 0 || !purpose.trim()) return;
    try {
      await createApplication.mutateAsync({
        farm_id: selectedFarmId,
        amount,
        term_months: termMonths,
        purpose,
      });
      setShowApply(false);
      setPurpose('');
    } catch {}
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tín dụng xanh</h1>
          <p className="text-sm text-muted-foreground">
            Đánh giá tín dụng xanh và quản lý khoản vay
          </p>
        </div>
        <button
          onClick={() => setShowApply(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Đăng ký vay
        </button>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Leaf className="w-4 h-4 text-eco-green-500" />
            Điểm TB
          </div>
          <p className="text-2xl font-bold">72</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4 text-water-blue-500" />
            Hạn mức tối đa
          </div>
          <p className="text-2xl font-bold">{formatCurrency(500000000)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Landmark className="w-4 h-4 text-yellow-500" />
            Đã giải ngân
          </div>
          <p className="text-2xl font-bold">{formatCurrency(120000000)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <CreditCard className="w-4 h-4 text-purple-500" />
            Khoản vay
          </div>
          <p className="text-2xl font-bold">{applications.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-4">Xếp hạng tín dụng</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {farms.slice(0, 4).map((farm) => (
                <button
                  key={farm.id}
                  onClick={() => setActiveFarmId(farm.id)}
                  className={`text-left rounded-lg border p-3 transition-all ${
                    activeFarmId === farm.id
                      ? 'border-eco-green-500 bg-eco-green-50/50 dark:bg-eco-green-950/10'
                      : 'border-border hover:border-eco-green-300 hover:bg-muted/30'
                  }`}
                >
                  <p className="font-medium text-sm truncate">{farm.name}</p>
                  <p className="text-xs text-muted-foreground">{farm.province}</p>
                </button>
              ))}
            </div>
            {activeFarmId && creditScore && (
              <div className="mt-4">
                <CreditScoreCard data={creditScore} compact />
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold">Lịch sử khoản vay</h2>
            </div>
            {applications.length === 0 ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                Chưa có khoản vay nào
              </div>
            ) : (
              <div className="divide-y divide-border">
                {applications.map((app) => (
                  <div key={app.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {formatCurrency(app.amount)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                        app.status === 'approved' ? 'bg-eco-green-50 dark:bg-eco-green-950/20 text-eco-green-600' :
                        app.status === 'rejected' ? 'bg-alert-red-50 dark:bg-alert-red-950/20 text-alert-red-500' :
                        app.status === 'reviewing' ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {app.status === 'approved' ? <CheckCircle className="w-3 h-3" /> :
                         app.status === 'rejected' ? <XCircle className="w-3 h-3" /> :
                         <Clock className="w-3 h-3" />}
                        {app.status === 'approved' ? 'Đã duyệt' :
                         app.status === 'rejected' ? 'Từ chối' :
                         app.status === 'reviewing' ? 'Đang xét' :
                         'Nháp'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{app.term_months} tháng</span>
                      <span>{app.purpose}</span>
                      <span>{formatDate(app.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-4">Hạn mức tín dụng</h2>
            {tiers && tiers.length > 0 ? (
              <div className="space-y-3">
                {tiers.map((tier) => (
                  <div key={tier.tier} className="flex items-center justify-between text-sm">
                    <span className="font-medium">{getCreditTierLabel(tier.tier)}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(tier.max_amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-purple-500">Bạch kim</span>
                  <span className="text-muted-foreground">{formatCurrency(1000000000)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-yellow-500">Vàng</span>
                  <span className="text-muted-foreground">{formatCurrency(500000000)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-400">Bạc</span>
                  <span className="text-muted-foreground">{formatCurrency(200000000)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-orange-600">Đồng</span>
                  <span className="text-muted-foreground">{formatCurrency(50000000)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-semibold mb-3">Lợi ích tín dụng xanh</h2>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-eco-green-500 shrink-0 mt-0.5" />
                <span>Lãi suất ưu đãi từ 5-7%/năm</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-eco-green-500 shrink-0 mt-0.5" />
                <span>Hỗ trợ kỹ thuật canh tác bền vững</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-eco-green-500 shrink-0 mt-0.5" />
                <span>Miễn phí đánh giá tín dụng</span>
              </li>
              <li className="flex items-start gap-2">
                <Leaf className="w-4 h-4 text-eco-green-500 shrink-0 mt-0.5" />
                <span>Thời hạn vay linh hoạt đến 60 tháng</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {showApply && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowApply(false)}>
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-4">Đăng ký vay tín dụng xanh</h2>
            <form onSubmit={handleApply} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Chọn trang trại</label>
                <select
                  value={selectedFarmId}
                  onChange={(e) => setSelectedFarmId(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                >
                  <option value="">Chọn trang trại</option>
                  {farms.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Số tiền vay</label>
                <input
                  type="number"
                  min={1000000}
                  step={1000000}
                  value={amount}
                  onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(amount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Thời hạn (tháng)</label>
                <select
                  value={termMonths}
                  onChange={(e) => setTermMonths(parseInt(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {[6, 12, 18, 24, 36, 48, 60].map((m) => (
                    <option key={m} value={m}>{m} tháng</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Mục đích vay</label>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
                  placeholder="VD: Mua giống, phân bón hữu cơ, hệ thống tưới tiết kiệm..."
                  required
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApply(false)}
                  className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createApplication.isPending}
                  className="flex-1 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
                >
                  {createApplication.isPending ? 'Đang xử lý...' : 'Gửi đăng ký'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
