'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  Flame,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { api } from '@/lib/auth';
import type { ProjectRow } from '@/lib/crm';

type Risk = 'urgent' | 'warning' | 'watch' | 'normal';

type RiskInfo = {
  level: Risk;
  label: string;
  bg: string;
  text: string;
  icon: React.ReactNode;
};

const TABS = [
  { key: 'all', label: 'Tất cả' },
  { key: 'urgent', label: 'Khẩn cấp' },
  { key: 'warning', label: 'Cảnh báo' },
  { key: 'watch', label: 'Deal lớn' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const HIGH_VALUE = 100_000_000; // 100M

function classify(deal: ProjectRow): RiskInfo | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const close = deal.closeDate ? new Date(deal.closeDate) : null;
  if (close) close.setHours(0, 0, 0, 0);

  const daysToClose = close
    ? Math.round((close.getTime() - today.getTime()) / 86_400_000)
    : null;

  const prob = deal.probability ?? 0;
  const value = deal.value ?? 0;

  // 1. Quá hạn chốt
  if (daysToClose !== null && daysToClose < 0) {
    return {
      level: 'urgent',
      label: `Quá hạn ${Math.abs(daysToClose)} ngày`,
      bg: 'bg-red-50',
      text: 'text-red-700',
      icon: <AlertCircle size={11} />,
    };
  }

  // 2. Sắp đến hạn + xác suất thấp
  if (daysToClose !== null && daysToClose <= 7 && prob < 50) {
    return {
      level: 'warning',
      label: `Chốt sau ${daysToClose} ngày · ${prob}%`,
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      icon: <Clock size={11} />,
    };
  }

  // 3. Deal lớn
  if (value >= HIGH_VALUE && prob < 70) {
    return {
      level: 'watch',
      label: `Deal lớn · ${prob}%`,
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      icon: <Sparkles size={11} />,
    };
  }

  return null;
}

const LEVEL_ORDER: Record<Risk, number> = {
  urgent: 0,
  warning: 1,
  watch: 2,
  normal: 3,
};

type Props = {
  max?: number;
};

export function HotDealsWidget({ max = 8 }: Props) {
  const [deals, setDeals] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>('all');

  useEffect(() => {
    api<ProjectRow[]>('/opportunities')
      .then((rows) => {
        const open = rows.filter(
          (r) => r.status !== 'won' && r.status !== 'lost' && !r.isLead,
        );
        setDeals(open);
      })
      .catch(() => setDeals([]))
      .finally(() => setLoading(false));
  }, []);

  // Phân loại + sắp xếp
  const enriched = useMemo(() => {
    return deals
      .map((deal) => ({ deal, risk: classify(deal) }))
      .sort((a, b) => {
        const aLevel = a.risk?.level ?? 'normal';
        const bLevel = b.risk?.level ?? 'normal';
        const diff = LEVEL_ORDER[aLevel] - LEVEL_ORDER[bLevel];
        if (diff !== 0) return diff;
        return (b.deal.value ?? 0) - (a.deal.value ?? 0);
      });
  }, [deals]);

  const counts = useMemo(() => {
    return {
      all: enriched.length,
      urgent: enriched.filter((e) => e.risk?.level === 'urgent').length,
      warning: enriched.filter((e) => e.risk?.level === 'warning').length,
      watch: enriched.filter((e) => e.risk?.level === 'watch').length,
    };
  }, [enriched]);

  const filtered = useMemo(() => {
    if (tab === 'all') return enriched;
    return enriched.filter((e) => e.risk?.level === tab);
  }, [enriched, tab]);

  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const display = filtered.slice(0, max);

  return (
    <section className="rounded-lg border border-border bg-card p-4">
      {/* Header */}
      <header className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-md bg-orange-100 text-orange-600">
            <Flame size={14} />
          </div>
          <div>
            <h2 className="text-sm font-semibold leading-tight">Deal cần chú ý</h2>
            <p className="text-[10px] text-muted-foreground">
              {loading ? 'Đang tải…' : `${counts.all} deal · ${formatMoney(total)}`}
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

      {/* Filter tabs */}
      {!loading && counts.all > 0 && (
        <div className="mb-2 flex items-center gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const c = counts[t.key];
            if (t.key !== 'all' && c === 0) return null;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent'
                }`}
              >
                {t.label}
                <span className={`ml-1 ${active ? 'text-primary/70' : 'text-muted-foreground/60'}`}>
                  {c}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Empty states */}
      {!loading && counts.all === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <TrendingUp size={22} className="text-muted-foreground" />
          <p className="text-xs font-medium">Chưa có deal đang mở</p>
          <p className="text-[10px] text-muted-foreground">Tạo cơ hội mới từ khách hàng</p>
        </div>
      )}

      {!loading && counts.all > 0 && filtered.length === 0 && (
        <div className="flex flex-col items-center gap-1.5 py-6 text-center">
          <Sparkles size={20} className="text-muted-foreground" />
          <p className="text-xs font-medium">Không có deal nào ở mục này</p>
          <p className="text-[10px] text-muted-foreground">Mọi thứ đang trong tầm kiểm soát</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1.5">
              <div className="size-7 animate-pulse rounded-md bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-2 w-1/2 animate-pulse rounded bg-muted/60" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Deal list */}
      <ul className="space-y-1">
        {display.map(({ deal, risk }) => (
          <li key={deal.id}>
            <Link
              href={`/du-an/${deal.id}`}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/50 ${
                risk?.level === 'urgent' ? 'bg-red-50/40' : ''
              }`}
            >
              {/* Icon rủi ro */}
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-md ${
                  risk?.level === 'urgent'
                    ? 'bg-red-100 text-red-600'
                    : risk?.level === 'warning'
                      ? 'bg-amber-100 text-amber-600'
                      : risk?.level === 'watch'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-muted text-muted-foreground'
                }`}
              >
                {risk?.level === 'urgent' ? (
                  <AlertTriangle size={13} />
                ) : risk?.level === 'warning' ? (
                  <Clock size={13} />
                ) : risk?.level === 'watch' ? (
                  <Sparkles size={13} />
                ) : (
                  <TrendingUp size={13} />
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{deal.name}</p>
                <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                  {risk && (
                    <span
                      className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-semibold ${risk.bg} ${risk.text}`}
                    >
                      {risk.icon}
                      {risk.label}
                    </span>
                  )}
                  {deal.customer && (
                    <span className="truncate text-muted-foreground">{deal.customer}</span>
                  )}
                </div>
              </div>

              {/* Value */}
              {deal.value > 0 && (
                <span className="shrink-0 text-xs font-bold text-primary">
                  {formatMoney(deal.value)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Footer hint */}
      {!loading && counts.urgent > 0 && (
        <p className="mt-2.5 border-t border-border pt-2 text-center text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <AlertCircle size={10} className="text-destructive" />
            Có <strong className="text-destructive">{counts.urgent}</strong> deal quá hạn cần xử lý ngay
          </span>
        </p>
      )}
    </section>
  );
}

function formatMoney(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ`;
  if (v >= 1_000_000) return `${Math.round(v / 1_000_000)} tr`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}