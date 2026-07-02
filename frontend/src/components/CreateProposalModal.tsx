'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    description: string;
    proposal_type: string;
    target_param?: Record<string, unknown>;
    voting_days: number;
  }) => void;
  isSubmitting: boolean;
}

const proposalTypes = [
  { value: 'algorithm_update', label: 'Cập nhật thuật toán' },
  { value: 'fund_allocation', label: 'Phân bổ quỹ' },
  { value: 'system_parameter', label: 'Tham số hệ thống' },
  { value: 'emergency_action', label: 'Hành động khẩn cấp' },
];

const votingPeriods = [
  { value: 3, label: '3 ngày' },
  { value: 7, label: '7 ngày (Mặc định)' },
  { value: 14, label: '14 ngày' },
  { value: 30, label: '30 ngày' },
];

export default function CreateProposalModal({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateProposalModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [proposalType, setProposalType] = useState('system_parameter');
  const [targetParam, setTargetParam] = useState('{}');
  const [votingDays, setVotingDays] = useState(7);
  const [showConfirm, setShowConfirm] = useState(false);
  const [jsonError, setJsonError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) return;

    let parsedParam: Record<string, unknown> | undefined;
    try {
      parsedParam = JSON.parse(targetParam);
      setJsonError('');
    } catch {
      setJsonError('JSON không hợp lệ');
      return;
    }

    if (showConfirm) {
      onSubmit({
        title: title.trim(),
        description: description.trim(),
        proposal_type: proposalType,
        target_param: Object.keys(parsedParam || {}).length > 0 ? parsedParam : undefined,
        voting_days: votingDays,
      });
      setShowConfirm(false);
      setTitle('');
      setDescription('');
      setProposalType('system_parameter');
      setTargetParam('{}');
      setVotingDays(7);
    } else {
      setShowConfirm(true);
    }
  };

  const handleBack = () => {
    setShowConfirm(false);
  };

  const canSubmit = title.trim() && description.trim() && !jsonError;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {showConfirm ? 'Xác nhận tạo đề xuất' : 'Tạo đề xuất mới'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-accent transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {showConfirm ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-muted p-3 space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">Tiêu đề:</span>
                <p className="text-sm font-medium">{title}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Mô tả:</span>
                <p className="text-sm line-clamp-3">{description}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Loại:</span>
                <p className="text-sm">{proposalTypes.find(t => t.value === proposalType)?.label}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Thời gian bỏ phiếu:</span>
                <p className="text-sm">{votingDays} ngày</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Sau khi tạo, đề xuất sẽ được đưa ra bỏ phiếu cho tất cả thiết bị đang hoạt động.
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleBack}
                disabled={isSubmitting}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
              >
                Quay lại
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Đang tạo...' : 'Xác nhận tạo'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tiêu đề</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề đề xuất"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eco-green-500"
                maxLength={500}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Mô tả</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết về đề xuất"
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eco-green-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Loại đề xuất</label>
              <select
                value={proposalType}
                onChange={(e) => setProposalType(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eco-green-500"
              >
                {proposalTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Tham số mục tiêu (JSON)
                <span className="text-xs text-muted-foreground ml-1">(Tùy chọn)</span>
              </label>
              <textarea
                value={targetParam}
                onChange={(e) => {
                  setTargetParam(e.target.value);
                  try {
                    JSON.parse(e.target.value);
                    setJsonError('');
                  } catch {
                    setJsonError('JSON không hợp lệ');
                  }
                }}
                placeholder='{"param": "value"}'
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-eco-green-500 resize-none"
              />
              {jsonError && (
                <p className="text-xs text-alert-red-500 mt-1">{jsonError}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Thời gian bỏ phiếu</label>
              <select
                value={votingDays}
                onChange={(e) => setVotingDays(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eco-green-500"
              >
                {votingPeriods.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 rounded-lg bg-eco-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-eco-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
