'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useAuthStore } from '@/store/authStore';
import { UserPlus, Eye, EyeOff, Clock, Leaf, Sprout, Building2, Users } from 'lucide-react';

const roles = [
  { value: 'farmer' as const, label: 'Nông dân', icon: Sprout, desc: 'Chủ trang trại, nông dân', gradient: 'from-emerald-500 to-green-600' },
  { value: 'investor' as const, label: 'Doanh nghiệp / Đầu tư', icon: Building2, desc: 'Đối tác đầu tư, doanh nghiệp', gradient: 'from-blue-500 to-cyan-600' },
  { value: 'user' as const, label: 'Người dân', icon: Users, desc: 'Cư dân địa phương, người quan tâm', gradient: 'from-purple-500 to-violet-600' },
];

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register, isRegistering, registerError } = useAuth();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const pendingRegister = useAuthStore((s) => s.pendingRegister);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'farmer' | 'investor' | 'user'>('farmer');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [step, setStep] = useState(1);

  const isPending = searchParams?.get('status') === 'pending';

  useEffect(() => {
    useAuthStore.getState().hydrate();
    if (useAuthStore.getState().isAuthenticated) {
      router.replace('/dashboard');
    }
  }, []);

  if (isPending && pendingRegister) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-emerald-950 dark:via-gray-950 dark:to-cyan-950" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 dark:bg-cyan-800/10 rounded-full blur-3xl" />
        <div className="w-full max-w-md relative">
          <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 shadow-2xl text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 shadow-lg shadow-amber-500/30">
              <Clock className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Đăng ký thành công!</h1>
            <p className="text-muted-foreground mb-2">
              Cảm ơn <strong className="text-emerald-600">{pendingRegister.full_name}</strong> đã đăng ký tài khoản.
            </p>
            <p className="text-muted-foreground mb-6">
              Tài khoản của bạn đang chờ quản trị viên xét duyệt.
              Bạn sẽ nhận được thông báo qua email <strong className="text-emerald-600">{pendingRegister.email}</strong> khi tài khoản được kích hoạt.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded-xl p-3 mb-6 border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Trạng thái: <strong>Chờ duyệt</strong></span>
            </div>
            <Link
              href="/auth/login"
              className="inline-block w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all"
            >
              Quay lại đăng nhập
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-cyan-50 dark:from-emerald-950 dark:via-gray-950 dark:to-cyan-950" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-200/30 dark:bg-emerald-800/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-200/30 dark:bg-cyan-800/10 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/25 mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold">Đăng ký tài khoản</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Tham gia hệ thống giám sát sinh thái nông nghiệp
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-100 dark:border-emerald-900 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step >= s
                    ? 'bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/25'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {s}
                </div>
                {s < 3 && <div className={`w-8 h-0.5 rounded transition-all ${step > s ? 'bg-emerald-500' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-[fadeIn_0.3s_ease-in]">
                <div>
                  <label className="block text-sm font-semibold mb-3">Chọn vai trò của bạn</label>
                  <div className="grid grid-cols-1 gap-3">
                    {roles.map((r) => {
                      const Icon = r.icon;
                      return (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => { setRole(r.value); setStep(2); }}
                          className={`group relative rounded-xl border-2 p-4 text-left transition-all ${
                            role === r.value
                              ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-md'
                              : 'border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 hover:border-emerald-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${r.gradient} flex items-center justify-center shadow-lg transition-transform group-hover:scale-105`}>
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-sm">{r.label}</div>
                              <div className="text-xs text-muted-foreground">{r.desc}</div>
                            </div>
                            {role === r.value && (
                              <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all"
                >
                  Tiếp theo
                </button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-[fadeIn_0.3s_ease-in]">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-semibold mb-1.5">
                    Họ và tên
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all"
                    placeholder="Nguyễn Văn A"
                    required
                  />
                </div>
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
                  <label htmlFor="phone" className="block text-sm font-semibold mb-1.5">
                    Số điện thoại <span className="text-muted-foreground font-normal">(không bắt buộc)</span>
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all"
                    placeholder="0912345678"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 shadow-lg shadow-emerald-500/25 transition-all"
                  >
                    Tiếp theo
                  </button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-[fadeIn_0.3s_ease-in]">
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
                      placeholder="Ít nhất 6 ký tự"
                      required
                      autoComplete="new-password"
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
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-1.5">
                    Xác nhận mật khẩu
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all"
                    placeholder="Nhập lại mật khẩu"
                    required
                    autoComplete="new-password"
                  />
                </div>

                {(formError || registerError) && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-4 text-sm text-red-600">
                    {formError || (registerError as any)?.message || 'Đăng ký thất bại. Vui lòng thử lại.'}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="flex-1 rounded-xl border border-border px-4 py-3 text-sm font-medium hover:bg-accent transition-colors"
                  >
                    Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isRegistering}
                    className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 text-sm font-bold text-white hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {isRegistering ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <UserPlus className="w-4 h-4" />
                    )}
                    {isRegistering ? 'Đang đăng ký...' : 'Đăng ký'}
                  </button>
                </div>
              </div>
            )}
          </form>

          <div className="mt-6 pt-4 border-t border-border text-center">
            <p className="text-sm text-muted-foreground">
              Đã có tài khoản?{' '}
              <Link href="/auth/login" className="text-emerald-600 hover:text-emerald-700 font-semibold">
                Đăng nhập
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 border-[3px] border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Đang tải...</p>
        </div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  );
}
