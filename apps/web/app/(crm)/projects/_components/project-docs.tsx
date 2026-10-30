'use client';

import Link from 'next/link';
import { ClipboardList, FileText, Plus, ShoppingCart } from 'lucide-react';
import { type DocCard } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';

const TABS = [
  { id: 'proposal' as const, label: 'Đề xuất', icon: ClipboardList, color: '#16a34a', bg: '#dcfce7' },
  { id: 'quote' as const, label: 'Báo giá', icon: FileText, color: '#C9A961', bg: '#F5EBD0' },
  { id: 'po' as const, label: 'Đơn hàng', icon: ShoppingCart, color: '#d97706', bg: '#fef3c7' },
];

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: 'Nháp', bg: '#fef3c7', color: '#92400e' },
  sent: { label: 'Đã gửi', bg: '#F5EBD0', color: '#A8894A' },
  accepted: { label: 'Chấp nhận', bg: '#dcfce7', color: '#166534' },
  rejected: { label: 'Từ chối', bg: '#fee2e2', color: '#991b1b' },
  expired: { label: 'Hết hạn', bg: '#f1f5f9', color: '#475569' },
};

interface ProjectDocsProps {
  projectId: string;
  docs: DocCard[];
  tab: typeof TABS[number]['id'];
  setTab: (tab: typeof TABS[number]['id']) => void;
}

export function ProjectDocs({ projectId, docs, tab, setTab }: ProjectDocsProps) {
  const current = TABS.find((item) => item.id === tab)!;
  const cards = docs.filter((doc) => doc.kind === tab);

  return (
    <div className="data-panel">
      <div className="mb-5 flex overflow-x-auto border-b border-border">
        {TABS.map((item) => {
          const Icon = item.icon;
          const count = docs.filter((doc) => doc.kind === item.id).length;
          return (
            <button key={item.id} type="button" onClick={() => setTab(item.id)} className={tab === item.id ? 'doc-tab active' : 'doc-tab'}>
              <Icon size={16} />
              <span>{item.label}</span>
              <span className="tab-count">{count}</span>
            </button>
          );
        })}
      </div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted-foreground">{cards.length} {current.label.toLowerCase()}{cards.length === 0 ? ' - chưa có' : ''}</p>
        <Link href={tab === 'quote' ? `/projects/${projectId}/quotes/create` : `/projects/${projectId}/quotes/create?kind=${tab}`} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-[13px] font-medium text-white" style={{ background: current.color }}>
          <Plus size={14} /> Tạo {current.label.toLowerCase()}
        </Link>
      </div>
      {cards.length === 0 ? (
        <div className="py-10 text-center">
          <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full" style={{ background: current.bg, color: current.color }}>
            <current.icon size={32} />
          </div>
          <p className="text-sm font-medium">Chưa có {current.label.toLowerCase()}</p>
        </div>
      ) : (
        <div className="doc-card-grid">
          {cards.map((card) => {
            const status = STATUS[card.status] || STATUS.draft;
            return (
              <Link key={card.id} href={`/quotes/${card.id}`} className="rounded-[10px] border border-border bg-white p-4 hover:shadow-md">
                <p className="text-xs font-semibold" style={{ color: current.color }}>{card.number}</p>
                <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ background: status.bg, color: status.color }}>{status.label}</span>
                <p className="mb-3 mt-3 line-clamp-2 min-h-9 text-[13px] font-medium">{card.title}</p>
                <div className="flex items-center justify-between border-t border-border pt-2.5">
                  <span className="text-[11px] text-slate-400">{card.date.split('-').reverse().join('/')}</span>
                  <strong className="text-sm" style={{ color: current.color }}>{compactMoney(card.price)}</strong>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}