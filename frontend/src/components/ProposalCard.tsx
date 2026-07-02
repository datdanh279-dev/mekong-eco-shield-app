'use client';

import { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, AlertTriangle, Ban, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import type { Proposal } from '@/types';
import { formatDate } from '@/utils/format';

interface ProposalCardProps {
  proposal: Proposal;
  onVote: (proposalId: string, vote: 'yes' | 'no' | 'abstain') => void;
  deviceVerified: boolean;
  isVoting: boolean;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  active: {
    label: 'Đang bỏ phiếu',
    color: 'bg-eco-green-100 text-eco-green-700 dark:bg-eco-green-900/30 dark:text-eco-green-400',
    icon: <Clock className="w-3 h-3" />,
  },
  passed: {
    label: 'Đã thông qua',
    color: 'bg-water-blue-100 text-water-blue-700 dark:bg-water-blue-900/30 dark:text-water-blue-400',
    icon: <CheckCircle className="w-3 h-3" />,
  },
  rejected: {
    label: 'Bị từ chối',
    color: 'bg-alert-red-100 text-alert-red-700 dark:bg-alert-red-900/30 dark:text-alert-red-400',
    icon: <XCircle className="w-3 h-3" />,
  },
  executed: {
    label: 'Đã thực thi',
    color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
    icon: <Ban className="w-3 h-3" />,
  },
  pending: {
    label: 'Chờ xử lý',
    color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    icon: <AlertTriangle className="w-3 h-3" />,
  },
};

const proposalTypeLabels: Record<string, string> = {
  algorithm_update: 'Cập nhật thuật toán',
  fund_allocation: 'Phân bổ quỹ',
  system_parameter: 'Tham số hệ thống',
  emergency_action: 'Hành động khẩn cấp',
};

export default function ProposalCard({ proposal, onVote, deviceVerified, isVoting }: ProposalCardProps) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const config = statusConfig[proposal.status] || statusConfig.pending;

  useEffect(() => {
    const calcTimeLeft = () => {
      if (proposal.status !== 'active') {
        setTimeLeft('');
        return;
      }
      const now = new Date();
      const end = new Date(proposal.voting_ends_at);
      const diff = end.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Đã kết thúc');
        return;
      }

      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      if (days > 0) {
        setTimeLeft(`${days} ngày ${hours} giờ`);
      } else {
        const mins = Math.floor((diff % 3600000) / 60000);
        setTimeLeft(`${hours} giờ ${mins} phút`);
      }
    };

    calcTimeLeft();
    const interval = setInterval(calcTimeLeft, 60000);
    return () => clearInterval(interval);
  }, [proposal.voting_ends_at, proposal.status]);

  const totalPower = proposal.yes_votes + proposal.no_votes + (proposal.total_votes - proposal.yes_votes - proposal.no_votes);
  const yesPct = totalPower > 0 ? (proposal.yes_votes / totalPower) * 100 : 0;
  const noPct = totalPower > 0 ? (proposal.no_votes / totalPower) * 100 : 0;
  const abstainPct = totalPower > 0 ? ((proposal.total_votes - proposal.yes_votes - proposal.no_votes) / totalPower) * 100 : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
              {config.icon}
              {config.label}
            </span>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {proposalTypeLabels[proposal.proposal_type] || proposal.proposal_type}
            </span>
          </div>
          <h3 className="font-semibold text-base truncate">{proposal.title}</h3>
        </div>
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
        {proposal.description}
      </p>

      {proposal.status === 'active' && timeLeft && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
          <Clock className="w-3 h-3" />
          <span>Còn lại: {timeLeft}</span>
        </div>
      )}

      {proposal.status !== 'pending' && totalPower > 0 && (
        <div className="space-y-2 mb-4">
          <div className="flex h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div
              className="bg-eco-green-500 transition-all duration-500"
              style={{ width: `${yesPct}%` }}
            />
            <div
              className="bg-alert-red-500 transition-all duration-500"
              style={{ width: `${noPct}%` }}
            />
            <div
              className="bg-gray-400 dark:bg-gray-500 transition-all duration-500"
              style={{ width: `${abstainPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-eco-green-600 dark:text-eco-green-400">
              <ThumbsUp className="w-3 h-3 inline mr-0.5" />
              {yesPct.toFixed(1)}%
            </span>
            <span className="text-alert-red-500">
              <ThumbsDown className="w-3 h-3 inline mr-0.5" />
              {noPct.toFixed(1)}%
            </span>
            <span className="text-muted-foreground">
              <Minus className="w-3 h-3 inline mr-0.5" />
              {abstainPct.toFixed(1)}%
            </span>
          </div>
          <div className="text-xs text-muted-foreground">
            Tổng số phiếu: {totalPower.toFixed(1)} · Ngưỡng: {proposal.required_threshold}%
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Tạo lúc: {formatDate(proposal.created_at)}
        </span>

        {proposal.status === 'active' && (
          <div className="flex gap-2">
            <button
              onClick={() => onVote(proposal.id, 'yes')}
              disabled={!deviceVerified || isVoting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-eco-green-100 text-eco-green-700 hover:bg-eco-green-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-eco-green-900/30 dark:text-eco-green-400"
            >
              <ThumbsUp className="w-3 h-3" />
              Đồng ý
            </button>
            <button
              onClick={() => onVote(proposal.id, 'no')}
              disabled={!deviceVerified || isVoting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-alert-red-100 text-alert-red-700 hover:bg-alert-red-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-alert-red-900/30 dark:text-alert-red-400"
            >
              <ThumbsDown className="w-3 h-3" />
              Từ chối
            </button>
            <button
              onClick={() => onVote(proposal.id, 'abstain')}
              disabled={!deviceVerified || isVoting}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-400"
            >
              <Minus className="w-3 h-3" />
              Trắng
            </button>
          </div>
        )}

        {proposal.status === 'executed' && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
            <Ban className="w-3 h-3" />
            Đã thực thi
          </span>
        )}
      </div>
    </div>
  );
}
