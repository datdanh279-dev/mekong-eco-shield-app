'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useCreateFarm, useUpdateFarm } from '@/hooks/useFarms';
import type { Farm, FarmCreatePayload, CropType, SoilType, WaterSource } from '@/types';

interface FarmFormProps {
  isOpen: boolean;
  onClose: () => void;
  farm?: Farm;
}

const cropTypes: { value: CropType; label: string }[] = [
  { value: 'rice', label: 'Lúa' },
  { value: 'fruit', label: 'Cây ăn trái' },
  { value: 'vegetable', label: 'Rau màu' },
  { value: 'aquaculture', label: 'Thủy sản' },
  { value: 'mixed', label: 'Đa canh' },
];

const soilTypes: { value: SoilType; label: string }[] = [
  { value: 'clay', label: 'Đất sét' },
  { value: 'sandy', label: 'Đất cát' },
  { value: 'loamy', label: 'Đất thịt' },
  { value: 'peat', label: 'Đất than bùn' },
  { value: 'saline', label: 'Đất nhiễm mặn' },
];

const waterSources: { value: WaterSource; label: string }[] = [
  { value: 'river', label: 'Sông' },
  { value: 'canal', label: 'Kênh rạch' },
  { value: 'groundwater', label: 'Nước ngầm' },
  { value: 'rainfed', label: 'Nước mưa' },
  { value: 'mixed', label: 'Kết hợp' },
];

const provinces = [
  'An Giang', 'Bạc Liêu', 'Bến Tre', 'Cà Mau', 'Cần Thơ',
  'Đồng Tháp', 'Hậu Giang', 'Kiên Giang', 'Long An', 'Sóc Trăng',
  'Tiền Giang', 'Trà Vinh', 'Vĩnh Long',
];

export default function FarmForm({ isOpen, onClose, farm }: FarmFormProps) {
  const createFarm = useCreateFarm();
  const updateFarm = useUpdateFarm(farm?.id || '');
  const isEditing = !!farm;

  const [form, setForm] = useState<FarmCreatePayload>({
    name: farm?.name || '',
    description: farm?.description || '',
    area_ha: farm?.area_ha || 0,
    crop_type: farm?.crop_type || 'rice',
    soil_type: farm?.soil_type || 'loamy',
    water_source: farm?.water_source || 'river',
    address: farm?.address || '',
    province: farm?.province || '',
    district: farm?.district || '',
    boundary: farm?.boundary || {
      type: 'Polygon',
      coordinates: [[]],
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = 'Vui lòng nhập tên trang trại';
    if (form.area_ha <= 0) newErrors.area_ha = 'Diện tích phải lớn hơn 0';
    if (!form.province) newErrors.province = 'Vui lòng chọn tỉnh/thành';
    if (!form.district.trim()) newErrors.district = 'Vui lòng nhập quận/huyện';
    if (!form.address.trim()) newErrors.address = 'Vui lòng nhập địa chỉ';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      if (isEditing) {
        await updateFarm.mutateAsync(form);
      } else {
        await createFarm.mutateAsync(form);
      }
      onClose();
    } catch {
      setErrors({ submit: 'Có lỗi xảy ra, vui lòng thử lại' });
    }
  };

  const isPending = createFarm.isPending || updateFarm.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? 'Chỉnh sửa trang trại' : 'Thêm trang trại mới'}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Chỉnh sửa trang trại' : 'Thêm trang trại mới'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-accent transition-colors"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Tên trang trại <span className="text-alert-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="VD: Trang trại ông Năm"
            />
            {errors.name && <p className="text-xs text-alert-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Mô tả
            </label>
            <textarea
              id="description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px]"
              placeholder="Mô tả về trang trại..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="area_ha" className="block text-sm font-medium mb-1">
                Diện tích (ha) <span className="text-alert-red-500">*</span>
              </label>
              <input
                id="area_ha"
                type="number"
                step="0.01"
                min="0"
                value={form.area_ha}
                onChange={(e) => setForm({ ...form, area_ha: parseFloat(e.target.value) || 0 })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.area_ha && <p className="text-xs text-alert-red-500 mt-1">{errors.area_ha}</p>}
            </div>

            <div>
              <label htmlFor="crop_type" className="block text-sm font-medium mb-1">
                Loại cây trồng
              </label>
              <select
                id="crop_type"
                value={form.crop_type}
                onChange={(e) => setForm({ ...form, crop_type: e.target.value as CropType })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {cropTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="soil_type" className="block text-sm font-medium mb-1">
                Loại đất
              </label>
              <select
                id="soil_type"
                value={form.soil_type}
                onChange={(e) => setForm({ ...form, soil_type: e.target.value as SoilType })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {soilTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="water_source" className="block text-sm font-medium mb-1">
                Nguồn nước
              </label>
              <select
                id="water_source"
                value={form.water_source}
                onChange={(e) => setForm({ ...form, water_source: e.target.value as WaterSource })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {waterSources.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="province" className="block text-sm font-medium mb-1">
              Tỉnh/Thành <span className="text-alert-red-500">*</span>
            </label>
            <select
              id="province"
              value={form.province}
              onChange={(e) => setForm({ ...form, province: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Chọn tỉnh/thành</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            {errors.province && <p className="text-xs text-alert-red-500 mt-1">{errors.province}</p>}
          </div>

          <div>
            <label htmlFor="district" className="block text-sm font-medium mb-1">
              Quận/Huyện <span className="text-alert-red-500">*</span>
            </label>
            <input
              id="district"
              type="text"
              value={form.district}
              onChange={(e) => setForm({ ...form, district: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="VD: Châu Đốc"
            />
            {errors.district && <p className="text-xs text-alert-red-500 mt-1">{errors.district}</p>}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium mb-1">
              Địa chỉ <span className="text-alert-red-500">*</span>
            </label>
            <input
              id="address"
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Số nhà, đường, thôn/xã"
            />
            {errors.address && <p className="text-xs text-alert-red-500 mt-1">{errors.address}</p>}
          </div>

          {errors.submit && (
            <div className="rounded-lg bg-alert-red-50 dark:bg-alert-red-950/20 p-3 text-sm text-alert-red-600">
              {errors.submit}
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Đang xử lý...' : isEditing ? 'Cập nhật' : 'Thêm mới'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
