'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/components/Providers';
import { useAppStore } from '@/store/appStore';
import {
  Bell,
  Moon,
  Sun,
  User,
  LogOut,
  Settings,
  Menu,
  ChevronDown,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const toggleSidebar = useAppStore((s) => s.toggleSidebar);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isAuthPage = pathname?.startsWith('/auth');

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-3">
          {!isAuthPage && (
            <button
              onClick={toggleSidebar}
              className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Mekong Eco-Shield AI" className="w-8 h-8" />
            <div className="hidden sm:block">
              <span className="font-bold text-lg text-eco-green-700 dark:text-eco-green-400">
                Mekong Eco-Shield
              </span>
              <span className="text-[10px] block leading-tight text-muted-foreground -mt-0.5">
                Danh Đạt
              </span>
            </div>
          </Link>
        </div>

        {!isAuthPage && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-md hover:bg-accent transition-colors"
              aria-label={theme === 'dark' ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-md hover:bg-accent transition-colors relative"
                aria-label="Thông báo"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-alert-red-500 rounded-full" />
              </button>
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 rounded-lg border border-border bg-card shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <p className="font-semibold text-sm">Thông báo</p>
                  </div>
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Không có thông báo mới
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-accent transition-colors"
                aria-label="Menu người dùng"
              >
                <div className="w-8 h-8 rounded-full bg-eco-green-100 dark:bg-eco-green-900 flex items-center justify-center">
                  <User className="w-4 h-4 text-eco-green-700 dark:text-eco-green-300" />
                </div>
                <span className="hidden md:inline text-sm font-medium max-w-[120px] truncate">
                  {user?.full_name || 'Người dùng'}
                </span>
                <ChevronDown className="w-4 h-4 hidden md:inline text-muted-foreground" />
              </button>
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-card shadow-lg z-50">
                  <div className="p-3 border-b border-border">
                    <p className="font-medium text-sm">{user?.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                  <div className="p-1">
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Cài đặt
                    </Link>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full text-left text-alert-red-500"
                    >
                      <LogOut className="w-4 h-4" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
