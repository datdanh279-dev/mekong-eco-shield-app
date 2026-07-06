'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useFarms, useDeleteFarm } from '@/hooks/useFarms';
import FarmForm from '@/components/FarmForm';
import { Plus, Search, MapPin, Sprout, MoreHorizontal, Edit, Trash2, ExternalLink } from 'lucide-react';
import { getCropTypeLabel, formatArea, formatDate } from '@/utils/format';

export default function FarmsPage() {
  const [search, setSearch] = useState('');
  const [province, setProvince] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const { data, isLoading } = useFarms({ search, province: province || undefined, per_page: 50 });
  const deleteFarm = useDeleteFarm();

  const farms = data?.data || [];

  const provinces = [
    'An Giang', 'Bạc Liêu', 'Bến Tre', 'Cà Mau', 'Cần Thơ',
    'Đồng Tháp', 'Hậu Giang', 'Kiên Giang', 'Long An', 'Sóc Trăng',
    'Tiền Giang', 'Trà Vinh', 'Vĩnh Long',
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý trang trại</h1>
          <p className="text-sm text-muted-foreground">
            Danh sách trang trại trong hệ thống
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Thêm trang trại
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm trang trại..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Tìm kiếm trang trại"
          />
        </div>
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Lọc theo tỉnh"
        >
          <option value="">Tất cả tỉnh</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
              <div className="skeleton h-5 w-3/4" />
              <div className="skeleton h-4 w-1/2" />
              <div className="skeleton h-4 w-full" />
            </div>
          ))}
        </div>
      ) : farms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Sprout className="w-16 h-16 text-muted-foreground/40 mb-4" />
          <h3 className="font-semibold text-lg mb-1">Chưa có trang trại</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Thêm trang trại đầu tiên để bắt đầu giám sát
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700"
          >
            <Plus className="w-4 h-4" />
            Thêm trang trại
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {farms.map((farm) => (
            <div
              key={farm.id}
              className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow relative group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                    <Link
                      href={`/dashboard/farms/detail?id=${farm.id}`}
                      className="font-semibold hover:text-eco-green-600 transition-colors"
                    >
                      {farm.name}
                    </Link>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                    <MapPin className="w-3 h-3" />
                    {farm.district}, {farm.province}
                  </div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(showMenu === farm.id ? null : farm.id)}
                    className="p-1 rounded-md hover:bg-accent transition-colors opacity-0 group-hover:opacity-100"
                    aria-label="Menu thao tác"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  {showMenu === farm.id && (
                    <div className="absolute right-0 top-8 w-40 rounded-lg border border-border bg-card shadow-lg z-10">
                      <div className="p-1">
                        <Link
                          href={`/dashboard/farms/detail?id=${farm.id}`}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Chi tiết
                        </Link>
                        <button
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full text-left"
                        >
                          <Edit className="w-4 h-4" />
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Xóa trang trại này?')) {
                              deleteFarm.mutate(farm.id);
                            }
                            setShowMenu(null);
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors w-full text-left text-alert-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                          Xóa
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1.5">
                  <Sprout className="w-4 h-4 text-eco-green-500" />
                  <span>{getCropTypeLabel(farm.crop_type)}</span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{formatArea(farm.area_ha)}</span>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>Thêm: {formatDate(farm.created_at)}</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    farm.status === 'active'
                      ? 'bg-eco-green-50 dark:bg-eco-green-950/20 text-eco-green-600'
                      : farm.status === 'inactive'
                      ? 'bg-muted text-muted-foreground'
                      : 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-600'
                  }`}
                >
                  {farm.status === 'active' ? 'Đang hoạt động' : farm.status === 'inactive' ? 'Ngừng' : 'Chờ duyệt'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <FarmForm isOpen={showForm} onClose={() => setShowForm(false)} />

      {showMenu && (
        <div className="fixed inset-0 z-0" onClick={() => setShowMenu(null)} />
      )}
    </div>
  );
}
