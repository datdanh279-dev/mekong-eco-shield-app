'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isLoading = useAuthStore((s) => s.isLoading);
  const pendingRegister = useAuthStore((s) => s.pendingRegister);

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated && user?.status === 'pending') {
        useAuthStore.getState().logout();
        router.replace('/auth/login');
      } else if (isAuthenticated) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.svg" alt="Mekong Eco-Shield AI" className="w-16 h-16 animate-pulse" />
        <div className="skeleton h-4 w-48" />
      </div>
    </div>
  );
}
