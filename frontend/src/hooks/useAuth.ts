'use client';

import { useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import api from '@/utils/api';
import { useAuthStore } from '@/store/authStore';
import type { LoginPayload, RegisterPayload, User } from '@/types';

export function useAuth() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading, setAuth, setUser, setLoading, logout } =
    useAuthStore();

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  const loginMutation = useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await api.post<{ user: User; token: string }>('/auth/login', payload);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      router.push('/dashboard');
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post<{ user: User; token: string }>('/auth/register', payload);
      return data;
    },
    onSuccess: (data) => {
      setAuth(data.user, data.token);
      router.push('/dashboard');
    },
  });

  const logoutAction = useCallback(() => {
    logout();
    router.push('/auth/login');
  }, [logout, router]);

  const updateProfile = useMutation({
    mutationFn: async (payload: Partial<User>) => {
      const { data } = await api.patch<User>('/auth/profile', payload);
      return data;
    },
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
    },
  });

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutate,
    loginError: loginMutation.error,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutate,
    registerError: registerMutation.error,
    isRegistering: registerMutation.isPending,
    logout: logoutAction,
    updateProfile: updateProfile.mutate,
    isUpdatingProfile: updateProfile.isPending,
  };
}
