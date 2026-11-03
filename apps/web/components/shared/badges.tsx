import { cn } from '@/lib/utils';

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open: { label: 'Mới', className: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'Đang xử lý', className: 'bg-yellow-100 text-yellow-700' },
  resolved: { label: 'Đã xong', className: 'bg-green-100 text-green-700' },
  closed: { label: 'Đã đóng', className: 'bg-gray-100 text-gray-700' },
  draft: { label: 'Nháp', className: 'bg-gray-100 text-gray-700' },
  sent: { label: 'Đã gửi', className: 'bg-blue-100 text-blue-700' },
  accepted: { label: 'Chấp nhận', className: 'bg-green-100 text-green-700' },
  rejected: { label: 'Từ chối', className: 'bg-red-100 text-red-700' },
  expired: { label: 'Hết hạn', className: 'bg-gray-100 text-gray-700' },
  won: { label: 'Thành công', className: 'bg-green-100 text-green-700' },
  lost: { label: 'Thất bại', className: 'bg-red-100 text-red-700' },
};

const PRIORITY_STYLES: Record<string, { label: string; className: string }> = {
  low: { label: 'Thấp', className: 'text-gray-500' },
  medium: { label: 'Bình thường', className: 'text-blue-500' },
  high: { label: 'Cao', className: 'text-orange-500' },
  urgent: { label: 'Khẩn cấp', className: 'text-red-600' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const config = STATUS_STYLES[status] || { label: status, className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.className, className)}>
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority, className }: { priority: string; className?: string }) {
  const config = PRIORITY_STYLES[priority] || { label: priority, className: 'text-gray-500' };
  return (
    <span className={cn("text-xs font-semibold", config.className, className)}>
      {config.label}
    </span>
  );
}