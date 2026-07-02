'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { LogIn, Eye, EyeOff, Sprout } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggingIn, loginError } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (useAuthStore.getState().isAuthenticated) {
      router.replace('/dashboard');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    login({ email, password });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Mekong Eco-Shield AI" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Đăng nhập</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hệ thống giám sát sinh thái nông nghiệp
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="nongdan@example.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <div className="rounded-lg bg-alert-red-50 dark:bg-alert-red-950/20 p-3 text-sm text-alert-red-600">
                {(loginError as any)?.message || 'Đăng nhập thất bại. Vui lòng thử lại.'}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full rounded-lg bg-eco-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {isLoggingIn ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có tài khoản?{' '}
              <Link href="/auth/register" className="text-eco-green-600 hover:text-eco-green-700 font-medium">
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
