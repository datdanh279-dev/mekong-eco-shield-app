'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Vote,
  Monitor,
  FileText,
  CheckCircle,
  Plus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import StatCard from '@/components/StatCard';
import ProposalCard from '@/components/ProposalCard';
import CreateProposalModal from '@/components/CreateProposalModal';
import {
  useGovernanceStats,
  useProposals,
  useCreateProposal,
  useCastVote,
  useRegisterDevice,
} from '@/hooks/useGovernance';
import { useDeviceFingerprint } from '@/hooks/useDeviceFingerprint';

const statusTabs = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang bỏ phiếu' },
  { value: 'passed', label: 'Đã thông qua' },
  { value: 'rejected', label: 'Bị từ chối' },
  { value: 'executed', label: 'Đã thực thi' },
];

export default function GovernancePage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [deviceVerified, setDeviceVerified] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const queryClient = useQueryClient();
  const { fingerprint, isLoading: fpLoading } = useDeviceFingerprint();
  const registerDevice = useRegisterDevice();
  const createProposal = useCreateProposal();
  const castVote = useCastVote();
  const { data: stats, isLoading: statsLoading } = useGovernanceStats();
  const { data: proposals, isLoading: proposalsLoading } = useProposals(statusFilter === 'all' ? undefined : statusFilter);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    if (fpLoading) return;
    if (!fingerprint) return;

    const stored = localStorage.getItem('device_registered_' + fingerprint);
    if (stored === 'true') {
      setDeviceVerified(true);
      return;
    }

    registerDevice.mutate(
      { device_fingerprint: fingerprint },
      {
        onSuccess: () => {
          localStorage.setItem('device_registered_' + fingerprint, 'true');
          setDeviceVerified(true);
        },
        onError: () => {
          showToast('Không thể đăng ký thiết bị. Vui lòng thử lại.', 'error');
        },
      }
    );
  }, [fingerprint, fpLoading, registerDevice, showToast]);

  const handleVote = useCallback(
    (proposalId: string, vote: 'yes' | 'no' | 'abstain') => {
      if (!deviceVerified || !fingerprint) {
        showToast('Vui lòng xác thực thiết bị trước khi bỏ phiếu', 'error');
        return;
      }
      castVote.mutate(
        { proposal_id: proposalId, vote, device_fingerprint: fingerprint },
        {
          onSuccess: () => {
            showToast('Đã ghi nhận phiếu bầu của bạn!', 'success');
          },
          onError: (err: unknown) => {
            const error = err as { message?: string };
            showToast(error?.message || 'Không thể bỏ phiếu. Vui lòng thử lại.', 'error');
          },
        }
      );
    },
    [deviceVerified, castVote, showToast]
  );

  const handleCreateProposal = useCallback(
    (data: {
      title: string;
      description: string;
      proposal_type: string;
      target_param?: Record<string, unknown>;
      voting_days: number;
    }) => {
      createProposal.mutate(data, {
        onSuccess: () => {
          setShowCreateModal(false);
          showToast('Đã tạo đề xuất thành công!', 'success');
          queryClient.invalidateQueries({ queryKey: ['governance'] });
        },
        onError: (err: unknown) => {
          const error = err as { message?: string };
          showToast(error?.message || 'Không thể tạo đề xuất.', 'error');
        },
      });
    },
    [createProposal, queryClient, showToast]
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-lg text-sm font-medium animate-in slide-in-from-top-2 ${
            toast.type === 'success'
              ? 'bg-eco-green-100 text-eco-green-800 dark:bg-eco-green-900/40 dark:text-eco-green-300'
              : 'bg-alert-red-100 text-alert-red-800 dark:bg-alert-red-900/40 dark:text-alert-red-300'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản trị DAO</h1>
          <p className="text-sm text-muted-foreground">
            Hệ thống quản trị phi tập trung - Mọi quyết định đều do cộng đồng quyết định
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!deviceVerified && !fpLoading && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              <AlertTriangle className="w-3 h-3" />
              Chưa xác thực thiết bị
            </span>
          )}
          {deviceVerified && (
            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-eco-green-100 text-eco-green-700 dark:bg-eco-green-900/30 dark:text-eco-green-400">
              <CheckCircle className="w-3 h-3" />
              Đã xác thực
            </span>
          )}
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={!deviceVerified}
            className="inline-flex items-center gap-2 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            Tạo đề xuất
          </button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tổng thiết bị"
          value={stats?.total_devices ?? 0}
          icon={Monitor}
          description="Thiết bị đã đăng ký"
        />
        <StatCard
          title="Cử tri đang hoạt động"
          value={stats?.active_voters ?? 0}
          icon={Vote}
          description="Có quyền bỏ phiếu"
        />
        <StatCard
          title="Đề xuất đang mở"
          value={stats?.open_proposals ?? 0}
          icon={FileText}
          description="Đang chờ bỏ phiếu"
        />
        <StatCard
          title="Đã thông qua"
          value={stats?.passed_proposals ?? 0}
          icon={CheckCircle}
          description="Đề xuất đã được thông qua"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex gap-1">
            {statusTabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === tab.value
                    ? 'bg-eco-green-100 text-eco-green-700 dark:bg-eco-green-900/30 dark:text-eco-green-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => queryClient.invalidateQueries({ queryKey: ['governance'] })}
            className="p-2 rounded-lg text-muted-foreground hover:bg-accent transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4">
          {proposalsLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : proposals && proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <ProposalCard
                  key={proposal.id}
                  proposal={proposal}
                  onVote={handleVote}
                  deviceVerified={deviceVerified}
                  isVoting={castVote.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-3" />
              <p className="text-muted-foreground font-medium">Chưa có đề xuất nào</p>
              <p className="text-sm text-muted-foreground/60 mt-1">
                Hãy tạo đề xuất đầu tiên để bắt đầu quy trình quản trị
              </p>
            </div>
          )}
        </div>
      </div>

      <CreateProposalModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateProposal}
        isSubmitting={createProposal.isPending}
      />
    </div>
  );
}
