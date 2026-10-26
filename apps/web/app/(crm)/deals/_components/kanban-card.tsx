'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, Calendar } from 'lucide-react';
import type { ProjectRow } from '@/lib/crm';
import { compactMoney, initials } from '@/lib/utils';

type Props = {
  deal: ProjectRow;
  dragging: boolean;
  highlighted?: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
};

export function KanbanCard({ deal, dragging, highlighted, onDragStart, onDragEnd }: Props) {
  const router = useRouter();
  const prob = deal.probability ?? 0;
  const probColor = prob >= 70 ? 'bg-green-500' : prob >= 40 ? 'bg-amber-500' : 'bg-red-400';

  let daysLeft: number | null = null;
  let overdue = false;
  if (deal.closeDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const close = new Date(deal.closeDate);
    close.setHours(0, 0, 0, 0);
    daysLeft = Math.round((close.getTime() - today.getTime()) / 86_400_000);
    overdue = daysLeft < 0;
  }

  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => router.push(`/projects/${deal.id}`)}
      className={`kanban-card group cursor-grab active:cursor-grabbing ${dragging ? 'dragging' : ''
        } ${highlighted ? 'ring-2 ring-primary animate-pulse' : ''    // ← THÊM
        }`}
    >
      {deal.code && (
        <p className="mb-1 truncate font-mono text-[10px] font-semibold text-primary">
          {deal.code}
        </p>
      )}
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-snug">{deal.name}</p>
        {deal.value > 0 && (
          <span className="shrink-0 text-xs font-bold text-primary">
            {compactMoney(deal.value)}
          </span>
        )}
      </div>

      {deal.customer && (
        <p className="mt-1 truncate text-[11px] text-muted-foreground">{deal.customer}</p>
      )}

      {!deal.isLead && (
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Xác suất</span>
            <span className="font-medium">{prob}%</span>
          </div>
          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
            <div className={`h-full transition-all ${probColor}`} style={{ width: `${prob}%` }} />
          </div>
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        {deal.owner && (
          <span className="flex items-center gap-1">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-primary/10 text-[8px] font-semibold text-primary">
              {initials(deal.owner)}
            </span>
            <span className="truncate">{deal.owner}</span>
          </span>
        )}
        {daysLeft !== null && (
          <span className={`flex shrink-0 items-center gap-1 ${overdue ? 'text-destructive' : ''}`}>
            {overdue ? <AlertCircle size={10} /> : <Calendar size={10} />}
            {overdue ? `Quá ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Hôm nay' : `${daysLeft}d`}
          </span>
        )}
      </div>

      {deal.isLead && (
        <span className="mt-2 inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-700">
          Lead
        </span>
      )}
    </article>
  );
}