'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Flame, TrendingUp } from 'lucide-react';
import { api } from '@/lib/auth';

type Opportunity = {
  id: string;
  title: string;
  value?: number;
  stage?: string;
  status?: string;
  probability?: number;
  updatedAt?: string;
  customerName?: string;
  closeDate?: string;
};

type Props = {
  max?: number;
};

export function HotDealsWidget({ max = 5 }: Props) {
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Opportunity[]>('/opportunities')
      .then((rows) => {
        // Lọc deal đang mở, chưa won/lost
        const open = rows.filter((r) => r.status !== 'won' && r.status !== 'lost');
        // Sắp xếp theo giá trị giảm dần
        const sorted = open.sort((a, b) => (b.value || 0) - (a.value || 0));
        setDeals(sorted.slice(0, max));
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, [max]);

  const total = deals.reduce((sum, d) => sum + (d.value || 0), 0);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
            <Flame size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Deal cần chú ý</h2>
            <p className="text-[10px] text-muted-foreground">
              {loading ? 'Đang tải…' : `Tổng ${formatMoney(total)}`}
            </p>
          </div>
        </div>
        <Link
          href="/du-an"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
        >
          Pipeline <ArrowRight size={11} />
        </Link>
      </header>

      {!loading && deals.length === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <TrendingUp size={22} className="text-muted-foreground" />
          <p className="text-xs font-medium">Chưa có deal đang mở</p>
          <p className="text-[10px] text-muted-foreground">Tạo cơ hội mới từ khách hàng</p>
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <div className="size-4 animate-pulse rounded bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      <ul className="space-y-1">
        {deals.map((deal) => (
          <li key={deal.id}>
            <Link
              href={`/du-an/${deal.id}`}
              className="flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50"
            >
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-orange-50 text-orange-600">
                <AlertTriangle size={13} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{deal.title}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  {deal.customerName && <span className="truncate">{deal.customerName}</span>}
                  {deal.stage && (
                    <>
                      <span className="mx-0.5">·</span>
                      <span className="truncate">{deal.stage}</span>
                    </>
                  )}
                </p>
              </div>
              {deal.value != null && (
                <span className="shrink-0 text-xs font-bold text-primary">
                  {formatMoney(deal.value)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatMoney(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}
