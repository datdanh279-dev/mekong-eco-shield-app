'use client';

import { useState } from 'react';
import { useTokenAccount, useTransferTokens } from '@/hooks/useTokens';
import { Send, ArrowLeft, AlertTriangle, CheckCircle, User, Wallet } from 'lucide-react';
import Link from 'next/link';

export default function TransferPage() {
  const [toUserId, setToUserId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: account } = useTokenAccount();
  const transfer = useTransferTokens();

  const currentBalance = Number(account?.balance || 0);
  const transferAmount = parseFloat(amount) || 0;
  const hasEnough = transferAmount > 0 && transferAmount <= currentBalance;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!toUserId.trim() || !hasEnough) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    try {
      await transfer.mutateAsync({
        to_user_id: toUserId.trim(),
        amount: transferAmount,
        description: description.trim() || undefined,
      });
      setShowConfirm(false);
      setToUserId('');
      setAmount('');
      setDescription('');
    } catch {}
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/tokens"
          className="p-2 rounded-lg border border-border hover:bg-accent transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Chuyển token</h1>
          <p className="text-sm text-muted-foreground">
            Gửi token sinh tồn đến người dùng khác
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-3">
          <Wallet className="w-5 h-5 text-eco-green-500" />
          <div>
            <p className="text-xs text-muted-foreground">Số dư khả dụng</p>
            <p className="text-lg font-bold">
              {currentBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}{' '}
              <span className="text-sm font-normal text-muted-foreground">SURV</span>
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1.5">
            Người nhận
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              placeholder="ID người dùng hoặc số điện thoại"
              className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Số lượng token
          </label>
          <input
            type="number"
            min={0.000001}
            step={0.000001}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          {amount && !hasEnough && (
            <p className="flex items-center gap-1 text-xs text-alert-red-500 mt-1">
              <AlertTriangle className="w-3 h-3" />
              Số dư không đủ. Bạn có {currentBalance.toLocaleString('vi-VN')} token.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">
            Ghi chú
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Lý do chuyển (không bắt buộc)"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[70px]"
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right mt-1">
            {description.length}/500
          </p>
        </div>

        <button
          type="submit"
          disabled={!toUserId.trim() || !hasEnough}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-eco-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
        >
          <Send className="w-4 h-4" />
          Tiếp tục
        </button>
      </form>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-eco-green-50 dark:bg-eco-green-950/20 flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-eco-green-500" />
              </div>
              <h2 className="text-lg font-semibold">Xác nhận chuyển</h2>
            </div>

            <div className="space-y-3 rounded-lg bg-muted p-4 mb-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Người nhận</span>
                <span className="font-medium">{toUserId}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Số lượng</span>
                <span className="font-bold text-eco-green-600">
                  {transferAmount.toLocaleString('vi-VN', { maximumFractionDigits: 6 })} SURV
                </span>
              </div>
              {description && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ghi chú</span>
                  <span className="text-right max-w-[200px] truncate">{description}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                disabled={transfer.isPending}
                className="flex-1 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
              >
                {transfer.isPending ? 'Đang xử lý...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
