'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { useAuth } from '@/hooks/useAuth';
import {
  LayoutDashboard,
  Sprout,
  Radio,
  Bell,
  CreditCard,
  Map,
  ChevronLeft,
  User,
  LogOut,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Tổng quan' },
  { href: '/dashboard/farms', icon: Sprout, label: 'Trang trại' },
  { href: '/dashboard/sensors', icon: Radio, label: 'Cảm biến' },
  { href: '/dashboard/alerts', icon: Bell, label: 'Cảnh báo' },
  { href: '/dashboard/predictions', icon: Map, label: 'Dự báo' },
  { href: '/dashboard/credit', icon: CreditCard, label: 'Tín dụng xanh' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();
  const { user, logout } = useAuth();

  return (
    <aside
      className={`fixed lg:sticky top-16 lg:top-16 left-0 z-40 h-[calc(100vh-4rem)] border-r border-border bg-card transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full lg:w-16 lg:translate-x-0'
      }`}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-end p-3 border-b border-border">
          <button
            onClick={toggleSidebar}
            className="hidden lg:flex p-1.5 rounded-md hover:bg-accent transition-colors"
            aria-label={sidebarOpen ? 'Thu gọn sidebar' : 'Mở rộng sidebar'}
          >
            <ChevronLeft
              className={`w-4 h-4 transition-transform ${!sidebarOpen && 'lg:rotate-180'}`}
            />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin p-2 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-eco-green-100 dark:bg-eco-green-900/30 text-eco-green-700 dark:text-eco-green-400'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className={`truncate ${!sidebarOpen && 'lg:hidden'}`}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-border p-3 space-y-2">
          <div className={`flex items-center gap-3 px-3 py-2 ${!sidebarOpen && 'lg:justify-center'}`}>
            <div className="w-8 h-8 rounded-full bg-eco-green-100 dark:bg-eco-green-900 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-eco-green-700 dark:text-eco-green-300" />
            </div>
            <div className={`min-w-0 ${!sidebarOpen && 'lg:hidden'}`}>
              <p className="text-sm font-medium truncate">{user?.full_name || 'Người dùng'}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.role === 'farmer' ? 'Nông dân' : user?.role === 'investor' ? 'Nhà đầu tư' : 'Quản trị viên'}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className={`flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-alert-red-500 transition-colors ${
              !sidebarOpen && 'lg:justify-center'
            }`}
            title={!sidebarOpen ? 'Đăng xuất' : undefined}
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className={`${!sidebarOpen && 'lg:hidden'}`}>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
