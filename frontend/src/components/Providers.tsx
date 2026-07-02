'use client';

import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from '@/store/appStore';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const storedTheme = useAppStore((s) => s.theme);
  const setStoredTheme = useAppStore((s) => s.setTheme);
  const [resolvedTheme, setResolvedTheme] = useState<Theme>('light');

  useEffect(() => {
    setMounted(true);
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolve = () => {
      if (storedTheme === 'dark') return 'dark';
      if (storedTheme === 'light') return 'light';
      return mediaQuery.matches ? 'dark' : 'light';
    };

    const t = resolve();
    setResolvedTheme(t);
    document.documentElement.classList.toggle('dark', t === 'dark');

    const handler = () => {
      if (storedTheme === 'system') {
        const sys = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(sys);
        document.documentElement.classList.toggle('dark', sys === 'dark');
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [storedTheme]);

  const setTheme = (t: Theme) => {
    setStoredTheme(t);
  };

  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme: resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30000,
            retry: 2,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
