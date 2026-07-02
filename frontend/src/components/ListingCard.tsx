'use client';

import { useEffect, useState } from 'react';
import { Wheat, Droplets, LifeBuoy, Pill, Fuel, Tent, Package, Clock, MapPin, User } from 'lucide-react';
import type { EmergencyListing } from '@/types';

const goodsIcons: Record<string, React.ReactNode> = {
  rice: <Wheat className="w-6 h-6 text-amber-600" />,
  water: <Droplets className="w-6 h-6 text-water-blue-500" />,
  floatation: <LifeBuoy className="w-6 h-6 text-orange-500" />,
  medicine: <Pill className="w-6 h-6 text-alert-red-500" />,
  fuel: <Fuel className="w-6 h-6 text-yellow-500" />,
  shelter: <Tent className="w-6 h-6 text-eco-green-500" />,
  other: <Package className="w-6 h-6 text-muted-foreground" />,
};

const goodsLabels: Record<string, string> = {
  rice: 'Gạo',
  water: 'Nước uống',
  floatation: 'Phao cứu sinh',
  medicine: 'Thuốc men',
  fuel: 'Nhiên liệu',
  shelter: 'Lều trại',
  other: 'Khác',
};

const unitLabels: Record<string, string> = {
  kg: 'kg',
  liter: 'lít',
  piece: 'cái',
  pack: 'gói',
};

interface ListingCardProps {
  listing: EmergencyListing;
  onBuy: (listing: EmergencyListing) => void;
}

export default function ListingCard({ listing, onBuy }: ListingCardProps) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function updateTimer() {
      const now = new Date();
      const expires = new Date(listing.expires_at);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Hết hạn');
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);

      if (hours > 24) {
        setTimeLeft(`${Math.floor(hours / 24)} ngày`);
      } else {
        setTimeLeft(`${hours}g ${minutes}p`);
      }
    }

    updateTimer();
    const interval = setInterval(updateTimer, 60000);
    return () => clearInterval(interval);
  }, [listing.expires_at]);

  const icon = goodsIcons[listing.goods_type] || goodsIcons.other;

  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:border-eco-green-300 hover:shadow-md transition-all duration-200">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold truncate">
              {goodsLabels[listing.goods_type] || listing.goods_type}
            </h4>
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              {timeLeft}
            </span>
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
            <span className="font-medium text-foreground">{listing.quantity}</span>
            <span>{unitLabels[listing.unit] || listing.unit}</span>
            <span className="mx-1">·</span>
            <span className="font-medium text-eco-green-600">
              {Number(listing.price_per_unit).toLocaleString('vi-VN')} token
            </span>
            <span className="text-xs">/{unitLabels[listing.unit] || listing.unit}</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {listing.location_zone}
            </span>
            {listing.seller_name && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {listing.seller_name}
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={() => onBuy(listing)}
        disabled={listing.time_remaining_hours <= 0}
        className="w-full mt-4 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Mua ngay
      </button>
    </div>
  );
}
