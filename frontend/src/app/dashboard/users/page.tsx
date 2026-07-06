'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import {
  Shield,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  User as UserIcon,
  AlertTriangle,
  X,
} from 'lucide-react';
import type { User } from '@/types';

const tabs = [
  {
    key: 'pending' as const,
    label: 'Chờ duyệt',
    icon: Clock,
    activeClass: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    iconClass: 'text-amber-500',
    badgeClass: 'bg-amber-500',
  },
  {
    key: 'active' as const,
    label: 'Đã duyệt',
    icon: CheckCircle2,
    activeClass: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
    iconClass: 'text-green-500',
    badgeClass: 'bg-green-500',
  },
  {
    key: 'rejected' as const,
    label: 'Từ chối',
    icon: XCircle,
    activeClass: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    iconClass: 'text-red-500',
    badgeClass: 'bg-red-500',
  },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const roleConfig: Record<string, { label: string; gradient: string; dot: string }> = {
  farmer: { label: 'Nông dân', gradient: 'from-green-500 to-emerald-600', dot: 'bg-green-500' },
  investor: { label: 'Doanh nghiệp / Đầu tư', gradient: 'from-blue-500 to-cyan-600', dot: 'bg-blue-500' },
  user: { label: 'Người dân', gradient: 'from-purple-500 to-violet-600', dot: 'bg-purple-500' },
  admin: { label: 'Quản trị viên', gradient: 'from-amber-500 to-orange-600', dot: 'bg-amber-500' },
};

function Avatar({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      className={`w-10 h-10 rounded-full bg-gradient-to-br ${roleConfig[role]?.gradient || 'from-gray-500 to-gray-600'} flex items-center justify-center shrink-0 shadow-lg`}
    >
      <span className="text-xs font-bold text-white">{initials}</span>
    </div>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  type,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: string;
  type: 'approve' | 'reject';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  const isApprove = type === 'approve';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-card rounded-2xl shadow-2xl border border-border p-6 w-full max-w-sm mx-4">
        <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isApprove ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
          <AlertTriangle className={`w-6 h-6 ${isApprove ? 'text-green-600' : 'text-red-600'}`} />
        </div>
        <h3 className="text-lg font-bold text-center mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-accent transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white transition-colors ${
              isApprove
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-red-600 hover:bg-red-700'
            }`}
          >
            {isApprove ? 'Duyệt' : 'Từ chối'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [search, setSearch] = useState('');
  const [checking, setChecking] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('pending');
  const [confirmState, setConfirmState] = useState<{
    type: 'approve' | 'reject';
    user: User;
  } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      router.replace('/dashboard');
    } else {
      setChecking(false);
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data } = await api.get<{ data: User[] }>('/admin/users');
      return data.data;
    },
    enabled: !checking && currentUser?.role === 'admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.patch(`/admin/users/${userId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setToast({ message: 'Đã duyệt tài khoản thành công', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Có lỗi xảy ra, vui lòng thử lại', type: 'error' });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.patch(`/admin/users/${userId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setToast({ message: 'Đã từ chối tài khoản', type: 'success' });
    },
    onError: () => {
      setToast({ message: 'Có lỗi xảy ra, vui lòng thử lại', type: 'error' });
    },
  });

  const users = usersData || [];
  const grouped = {
    pending: users.filter((u) => u.status === 'pending'),
    active: users.filter((u) => u.status === 'active'),
    rejected: users.filter((u) => u.status === 'rejected'),
  };

  const filtered = (list: User[]) =>
    list.filter(
      (u) =>
        u.full_name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase())
    );

  const handleConfirm = () => {
    if (!confirmState) return;
    if (confirmState.type === 'approve') {
      approveMutation.mutate(confirmState.user.id);
    } else {
      rejectMutation.mutate(confirmState.user.id);
    }
    setConfirmState(null);
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-eco-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    );
  }

  const currentList = filtered(grouped[activeTab]);

  return (
    <>
      {toast && (
        <div
          className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 transition-all duration-300 ${
            toast.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-300'
              : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-300'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <ConfirmModal
        open={confirmState !== null}
        title={confirmState?.type === 'approve' ? 'Duyệt tài khoản' : 'Từ chối tài khoản'}
        message={
          confirmState
            ? `Bạn có chắc chắn muốn ${confirmState.type === 'approve' ? 'duyệt' : 'từ chối'} tài khoản của "${confirmState.user.full_name}"?`
            : ''
        }
        type={confirmState?.type || 'approve'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmState(null)}
      />

      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-cyan-600 p-6 shadow-xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-white/15 backdrop-blur rounded-xl">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Quản lý người dùng</h1>
            </div>
            <p className="text-emerald-50/80 text-sm">Duyệt và quản lý tài khoản người dùng đăng ký</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc email..."
              className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => {
            const count = grouped[tab.key].length;
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? tab.activeClass + ' shadow-sm border' : 'text-muted-foreground hover:bg-accent border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? tab.iconClass : ''}`} />
                {tab.label}
                {count > 0 && (
                  <span
                    className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold text-white ${tab.badgeClass}`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-40" />
                    <div className="h-3 bg-muted rounded w-60" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <UserIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">Không có người dùng nào</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Người dùng
                    </th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Vai trò
                    </th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Trạng thái
                    </th>
                    <th className="text-left py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Ngày đăng ký
                    </th>
                    <th className="text-right py-3.5 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {currentList.map((u) => (
                    <tr
                      key={u.id}
                      className="group hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={u.full_name} role={u.role} />
                          <div>
                            <p className="font-semibold text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {u.full_name}
                            </p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                          u.role === 'farmer' ? 'bg-green-50 text-green-700 dark:bg-transparent dark:border dark:border-green-400' :
                          u.role === 'investor' ? 'bg-blue-50 text-blue-700 dark:bg-transparent dark:border dark:border-blue-400' :
                          u.role === 'user' ? 'bg-purple-50 text-purple-700 dark:bg-transparent dark:border dark:border-purple-400' :
                          'bg-amber-50 text-amber-700 dark:bg-transparent dark:border dark:border-amber-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${roleConfig[u.role]?.dot || 'bg-gray-500'}`} />
                          {roleConfig[u.role]?.label || u.role}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {u.status === 'pending' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                            Chờ duyệt
                          </span>
                        )}
                        {u.status === 'active' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-3 py-1 rounded-full border border-green-200 dark:border-green-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Đã duyệt
                          </span>
                        )}
                        {u.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            Từ chối
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                        })}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {(u.status === 'pending' || u.status === 'rejected') && (
                            <button
                              onClick={() => setConfirmState({ type: 'approve', user: u })}
                              disabled={approveMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Duyệt
                            </button>
                          )}
                          {(u.status === 'pending' || u.status === 'active') && (
                            <button
                              onClick={() => setConfirmState({ type: 'reject', user: u })}
                              disabled={rejectMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:opacity-50 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 transition-all"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              {u.status === 'active' ? 'Vô hiệu' : 'Từ chối'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
