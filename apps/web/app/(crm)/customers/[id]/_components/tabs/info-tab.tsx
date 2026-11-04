import { CUSTOMER_STATUS_LABELS } from '../../_constants';
import type { CustomerDetail } from '../../_types';
import { InfoRow } from '../ui/info-row';

interface InfoTabProps {
  customer: CustomerDetail;
}

export function InfoTab({ customer }: InfoTabProps) {
  const isBusiness = customer.type === 'business';

  return (
    <dl className="w-full space-y-1.5 text-sm">
      {customer.code && (
        <InfoRow
          label="Mã khách hàng"
          value={`${customer.code} ${
            customer.shortCode ? `(Mã số: ${customer.shortCode})` : ''
          }`}
        />
      )}
      <InfoRow label="Tên gọi / Tên ngắn" value={customer.name} />
      {customer.company && <InfoRow label="Tên công ty đầy đủ" value={customer.company} />}
      {isBusiness && <InfoRow label="Mã số thuế" value={customer.taxCode || '—'} />}
      {isBusiness && <InfoRow label="Lĩnh vực" value={customer.industry || '—'} />}
      <InfoRow label="Điện thoại" value={customer.phone || '—'} />
      <InfoRow label="Email" value={customer.email || '—'} />
      <InfoRow label="Địa chỉ" value={customer.address || '—'} />
      <InfoRow label="Trạng thái" value={CUSTOMER_STATUS_LABELS[customer.status]} />
      <InfoRow label="Nguồn" value={customer.sourceName || '—'} />
      <InfoRow label="Phụ trách" value={customer.assigneeName || '—'} />
      <InfoRow label="Ngày tạo" value={customer.createdAt.slice(0, 10)} />
    </dl>
  );
}