import { Building2, Mail, MapPin, Phone, User } from 'lucide-react';
import { initials } from '@/lib/utils';
import { CUSTOMER_STATUS_LABELS } from '../_constants';
import type { CustomerDetail } from '../_types';

interface CustomerInfoCardProps {
  customer: CustomerDetail;
}

function resolveStatusClass(status: string): string {
  if (status === 'active') return 'status-badge status-success';
  if (status === 'inactive') return 'status-badge status-warning';
  return 'status-badge status-blue';
}

export function CustomerInfoCard({ customer }: CustomerInfoCardProps) {
  const isBusiness = customer.type === 'business';

  return (
    <div className="detail-card-compact mb-3">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="avatar-initials inline-flex size-12 items-center justify-center rounded-full text-base font-bold">
            {initials(customer.name)}
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold">{customer.name}</h1>

              {customer.code && (
                <span className="rounded-md bg-primary/15 px-2 py-0.5 font-mono text-xs font-bold text-primary">
                  Mã KH: {customer.code}{' '}
                  {customer.shortCode ? `(${customer.shortCode})` : ''}
                </span>
              )}

              {isBusiness ? (
                <span className="badge-type badge-type-business">
                  <Building2 size={12} /> Doanh nghiệp
                </span>
              ) : (
                <span className="badge-type badge-type-individual">
                  <User size={12} /> Cá nhân
                </span>
              )}
            </div>

            {customer.company && customer.company !== customer.name && (
              <p className="mt-1 text-xs font-semibold text-foreground/80">
                {customer.company}
              </p>
            )}

            <div className="mt-1.5 space-y-0.5 text-xs text-muted-foreground">
              {isBusiness && customer.taxCode && (
                <p>
                  MST: <strong className="text-foreground">{customer.taxCode}</strong>
                </p>
              )}
              {isBusiness && customer.industry && (
                <p>
                  Lĩnh vực:{' '}
                  <strong className="text-foreground">{customer.industry}</strong>
                </p>
              )}
              {isBusiness && customer.contactName && (
                <p>
                  PIC: <strong className="text-foreground">{customer.contactName}</strong>
                  {customer.contactPhone ? ` · ${customer.contactPhone}` : ''}
                </p>
              )}
              {!isBusiness &&
                customer.company &&
                customer.company === customer.name && <p>{customer.company}</p>}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className={resolveStatusClass(customer.status)}>
                {CUSTOMER_STATUS_LABELS[customer.status]}
              </span>
              {customer.sourceName && (
                <span className="source-badge">{customer.sourceName}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5 text-xs">
          {customer.phone && (
            <div className="flex items-center gap-2">
              <Phone size={16} className="text-muted-foreground" />
              {customer.phone}
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-muted-foreground" />
              {customer.email}
            </div>
          )}
          {customer.address && (
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-muted-foreground" />
              {customer.address}
            </div>
          )}
          {customer.assigneeName && (
            <div className="flex items-center gap-2">
              <User size={16} className="text-muted-foreground" />
              Phụ trách: <strong>{customer.assigneeName}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}