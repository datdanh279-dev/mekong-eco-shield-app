'use client';

import { useState } from 'react';
import { useMarketListings, useCreateOrder, useMarketStats } from '@/hooks/useTokens';
import ListingCard from '@/components/ListingCard';
import {
  Search,
  SlidersHorizontal,
  Grid3X3,
  List,
  ShoppingBag,
  X,
  Package,
  MapPin,
  Timer,
  AlertTriangle,
} from 'lucide-react';
import type { EmergencyListing } from '@/types';

const goodsOptions = [
  { value: '', label: 'Tất cả' },
  { value: 'rice', label: 'Gạo' },
  { value: 'water', label: 'Nước uống' },
  { value: 'floatation', label: 'Phao cứu sinh' },
  { value: 'medicine', label: 'Thuốc men' },
  { value: 'fuel', label: 'Nhiên liệu' },
  { value: 'shelter', label: 'Lều trại' },
  { value: 'other', label: 'Khác' },
];

export default function ExchangePage() {
  const [goodsType, setGoodsType] = useState('');
  const [zone, setZone] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedListing, setSelectedListing] = useState<EmergencyListing | null>(null);
  const [buyQuantity, setBuyQuantity] = useState(1);

  const { data: listingsData, isLoading } = useMarketListings({
    goods_type: goodsType || undefined,
    zone: zone || undefined,
    page,
  });
  const { data: stats } = useMarketStats();
  const createOrder = useCreateOrder();

  const listings = listingsData?.items || [];

  const handleBuy = (listing: EmergencyListing) => {
    setSelectedListing(listing);
    setBuyQuantity(1);
  };

  const handleConfirmOrder = async () => {
    if (!selectedListing) return;
    try {
      await createOrder.mutateAsync({
        listing_id: selectedListing.id,
        quantity: buyQuantity,
      });
      setSelectedListing(null);
    } catch {}
  };

  const totalCost = selectedListing
    ? (buyQuantity * Number(selectedListing.price_per_unit))
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chợ khẩn cấp</h1>
          <p className="text-sm text-muted-foreground">
            Mua bán hàng hóa cứu trợ bằng token sinh tồn
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg border transition-colors ${
              viewMode === 'grid'
                ? 'border-eco-green-500 bg-eco-green-50 dark:bg-eco-green-950/20'
                : 'border-border hover:bg-accent'
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg border transition-colors ${
              viewMode === 'list'
                ? 'border-eco-green-500 bg-eco-green-50 dark:bg-eco-green-950/20'
                : 'border-border hover:bg-accent'
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Niêm yết</p>
            <p className="text-lg font-bold">{stats.active_listings}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Giao dịch/24h</p>
            <p className="text-lg font-bold">{stats.trades_24h}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Quỹ khẩn cấp</p>
            <p className="text-lg font-bold">
              {Number(stats.emergency_reserve).toLocaleString('vi-VN')}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Tổng tài khoản</p>
            <p className="text-lg font-bold">{stats.total_accounts}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={zone}
            onChange={(e) => { setZone(e.target.value); setPage(1); }}
            placeholder="Tìm theo khu vực..."
            className="w-full rounded-lg border border-input bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={goodsType}
          onChange={(e) => { setGoodsType(e.target.value); setPage(1); }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {goodsOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-24 bg-muted rounded" />
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-4 w-20 bg-muted rounded" />
                </div>
              </div>
              <div className="h-10 w-full bg-muted rounded-lg mt-4" />
            </div>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Không có niêm yết nào đang hoạt động</p>
        </div>
      ) : (
        <>
          <div
            className={
              viewMode === 'grid'
                ? 'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'space-y-3'
            }
          >
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onBuy={handleBuy} />
            ))}
          </div>

          {listingsData && listingsData.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Trước
              </button>
              <span className="text-xs text-muted-foreground">
                Trang {page} / {listingsData.total_pages}
              </span>
              <button
                disabled={page >= listingsData.total_pages}
                onClick={() => setPage((p) => p + 1)}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Sau
              </button>
            </div>
          )}
        </>
      )}

      {selectedListing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setSelectedListing(null)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Xác nhận mua</h2>
              <button
                onClick={() => setSelectedListing(null)}
                className="p-1 rounded-md hover:bg-accent"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span>
                  {selectedListing.goods_type} - {Number(selectedListing.price_per_unit).toLocaleString('vi-VN')} token/{selectedListing.unit}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span>{selectedListing.location_zone}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Timer className="w-4 h-4 text-muted-foreground" />
                <span>
                  Còn lại: {selectedListing.quantity} {selectedListing.unit}
                </span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Số lượng ({selectedListing.unit})
              </label>
              <input
                type="number"
                min={1}
                max={Math.floor(Number(selectedListing.quantity))}
                value={buyQuantity}
                onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="rounded-lg bg-muted p-3 mb-6">
              <div className="flex items-center justify-between text-sm">
                <span>Tổng cộng</span>
                <span className="font-bold text-eco-green-600">
                  {totalCost.toLocaleString('vi-VN')} token
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmOrder}
                disabled={createOrder.isPending || buyQuantity <= 0}
                className="flex-1 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
              >
                {createOrder.isPending ? 'Đang xử lý...' : 'Xác nhận mua'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
