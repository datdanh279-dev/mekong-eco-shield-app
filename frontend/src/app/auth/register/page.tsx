'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Eye, EyeOff, Sprout } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const { register, isRegistering, registerError } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'farmer' | 'investor'>('farmer');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (useAuthStore.getState().isAuthenticated) {
      router.replace('/dashboard');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setFormError('Vui lòng điền đầy đủ thông tin');
      return;
    }

    if (password.length < 6) {
      setFormError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Mật khẩu xác nhận không khớp');
      return;
    }

    register({
      email,
      password,
      full_name: fullName,
      role,
      phone: phone || undefined,
    });
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Mekong Eco-Shield AI" className="w-16 h-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tham gia hệ thống giám sát sinh thái nông nghiệp
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="role" className="block text-sm font-medium mb-1">
                Bạn là
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole('farmer')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    role === 'farmer'
                      ? 'border-eco-green-500 bg-eco-green-50 dark:bg-eco-green-950/20 text-eco-green-700'
                      : 'border-input bg-background text-muted-foreground hover:border-eco-green-300'
                  }`}
                >
                  Nông dân
                </button>
                <button
                  type="button"
                  onClick={() => setRole('investor')}
                  className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                    role === 'investor'
                      ? 'border-water-blue-500 bg-water-blue-50 dark:bg-water-blue-950/20 text-water-blue-700'
                      : 'border-input bg-background text-muted-foreground hover:border-water-blue-300'
                  }`}
                >
                  Nhà đầu tư
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-1">
                Họ và tên
              </label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nguyễn Văn A"
                required
              />
            </div>

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
              <label htmlFor="phone" className="block text-sm font-medium mb-1">
                Số điện thoại (không bắt buộc)
              </label>
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="0912345678"
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
                  placeholder="Ít nhất 6 ký tự"
                  required
                  autoComplete="new-password"
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

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                Xác nhận mật khẩu
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Nhập lại mật khẩu"
                required
                autoComplete="new-password"
              />
            </div>

            {(formError || registerError) && (
              <div className="rounded-lg bg-alert-red-50 dark:bg-alert-red-950/20 p-3 text-sm text-alert-red-600">
                {formError || (registerError as any)?.message || 'Đăng ký thất bại. Vui lòng thử lại.'}
              </div>
            )}

            <button
              type="submit"
              disabled={isRegistering}
              className="w-full rounded-lg bg-eco-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {isRegistering ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
              {isRegistering ? 'Đang đăng ký...' : 'Đăng ký'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link href="/auth/login" className="text-eco-green-600 hover:text-eco-green-700 font-medium">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
