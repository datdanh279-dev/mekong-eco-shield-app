import { create } from 'zustand';
import type { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingRegister: { email: string; full_name: string } | null;
  token_balance: number;
  token_tier: string;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  setLoading: (loading: boolean) => void;
  setPendingRegister: (info: { email: string; full_name: string } | null) => void;
  setTokenBalance: (balance: number, tier: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  pendingRegister: null,
  token_balance: 0,
  token_tier: 'bronze',

  setAuth: (user, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true, isLoading: false, pendingRegister: null });
  },

  setUser: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user));
    set({ user });
  },

  setLoading: (loading) => set({ isLoading: loading }),

  setPendingRegister: (info) => set({ pendingRegister: info }),

  setTokenBalance: (balance, tier) => set({ token_balance: balance, token_tier: tier }),

  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null, isAuthenticated: false, isLoading: false, token_balance: 0, token_tier: 'bronze', pendingRegister: null });
  },

  hydrate: () => {
    try {
      const token = localStorage.getItem('auth_token');
      const userStr = localStorage.getItem('auth_user');
      if (token && userStr) {
        const user = JSON.parse(userStr) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },
}));
