'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2, ExternalLink, Pencil, X } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import type { CustomerDetail } from '../_types';

interface CustomerDetailHeaderProps {
  customer: CustomerDetail;
  isFullMode: boolean;
  onConvert: () => void;
  onEdit: () => void;
}

export function CustomerDetailHeader({
  customer,
  isFullMode,
  onConvert,
  onEdit,
}: CustomerDetailHeaderProps) {
  const router = useRouter();
  const perm = usePermission();
  const canUpdate = perm.has('customer:update');
  const isBusiness = customer.type === 'business';

  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground xl:hidden"
      >
        <ArrowLeft size={14} /> Danh sách
      </button>

      <div className="ml-auto flex gap-2">
        {!isBusiness && canUpdate && (
          <button
            type="button"
            onClick={onConvert}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground whitespace-nowrap"
          >
            <Building2 size={16} />{' '}
            <span className="hidden sm:inline">Chuyển thành</span>DN
          </button>
        )}

        {!isFullMode && (
          <Link
            href={`/customers/${customer.id}?full=1`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent whitespace-nowrap"
            title="Mở chi tiết trong tab mới"
          >
            <ExternalLink size={14} />{' '}
            <span className="hidden sm:inline">Mở rộng</span>
          </Link>
        )}

        {canUpdate && (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent whitespace-nowrap"
          >
            <Pencil size={14} /> Sửa
          </button>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
          title="Đóng chi tiết"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}