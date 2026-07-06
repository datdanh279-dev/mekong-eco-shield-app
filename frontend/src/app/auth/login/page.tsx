'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { LogIn, Eye, EyeOff, Clock, XCircle, Leaf } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pendingRegister = useAuthStore((s) => s.pendingRegister);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (useAuthStore.getState().isAuthenticated) {
      router.replace('/dashboard');
    }
  }, []);

  const err = loginError as any;
  const isPending = err?.code === 'ACCOUNT_PENDING' || err?.status === 403;
  const isRejected = err?.code === 'ACCOUNT_REJECTED' || err?.status === 403;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    login({ email, password });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-emerald-950 dark:via-gray-950 dark:to-cyan-950" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 dark:bg-cyan-800/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hệ thống giám sát sinh thái nông nghiệp
          </p>
        </div>

        {pendingRegister && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur p-4 mb-4 shadow-sm">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold mb-1">
              <Clock className="w-4 h-4" />
              Tài khoản chưa được duyệt
            </div>
            <p className="text-sm text-amber-600 dark:text-amber-300">
              Tài khoản <strong>{pendingRegister.email}</strong> đang chờ quản trị viên xét duyệt.
              Vui lòng kiểm tra email hoặc quay lại sau.
            </p>
          </div>
        )}

        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold mb-1.5">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all"
                placeholder="nongdan@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && isPending && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 text-sm text-amber-600">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <Clock className="w-4 h-4" />
                  Tài khoản chưa được duyệt
                </div>
                Tài khoản của bạn đang chờ quản trị viên xét duyệt. Vui lòng quay lại sau.
              </div>
            )}

            {loginError && isRejected && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600">
                <div className="flex items-center gap-2 font-semibold mb-1">
                  <XCircle className="w-4 h-4" />
                  Tài khoản đã bị từ chối
                </div>
                Tài khoản của bạn đã bị từ chối. Vui lòng liên hệ quản trị viên để biết thêm chi tiết.
              </div>
            )}

            {loginError && !isPending && !isRejected && (
              <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600">
                {err?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có tài khoản?{' '}
              <Link href="/auth/register" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Bằng cách đăng nhập, bạn đồng ý với{' '}
            <Link href="#" className="underline hover:text-foreground">Điều khoản sử dụng</Link>
            {' '}và{' '}
            <Link href="#" className="underline hover:text-foreground">Chính sách bảo mật</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
