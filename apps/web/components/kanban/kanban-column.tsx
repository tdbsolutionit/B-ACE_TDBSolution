'use client';

import { Plus } from 'lucide-react';
import type { ProjectRow, StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { KanbanCard } from './kanban-card';

type Props = {
  stage: StageRow;
  deals: ProjectRow[];
  dragId: string | null;
  isOver: boolean;
  onDragOver: () => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onCreate: (stageId: string) => void;
};

export function KanbanColumn({
  stage,
  deals,
  dragId,
  isOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onDragEnd,
  onCreate,
}: Props) {
  const total = deals.reduce((sum, d) => sum + (d.value ?? 0), 0);
  const sorted = [...deals].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <section
      className={`flex w-[280px] shrink-0 flex-col rounded-lg border bg-muted/20 transition-all ${
        isOver ? 'border-primary bg-primary/5 ring-2 ring-primary/30' : 'border-border'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOver();
      }}
      onDragLeave={(e) => {
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        onDragLeave();
      }}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
    >
      <header className="sticky top-0 z-10 rounded-t-lg bg-card/95 px-3 py-2.5 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="size-2 shrink-0 rounded-full" style={{ background: stage.color }} />
            <h3 className="truncate text-xs font-semibold" style={{ color: stage.color }}>
              {stage.name}
            </h3>
            <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              {deals.length}
            </span>
          </div>
          {!stage.isWon && !stage.isLost && (
            <button
              type="button"
              onClick={() => onCreate(stage.id)}
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Thêm deal vào cột này"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        {deals.length > 0 && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Tổng <strong className="text-foreground">{compactMoney(total)}</strong>
          </p>
        )}
      </header>

      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {sorted.map((deal) => (
          <KanbanCard
            key={deal.id}
            deal={deal}
            dragging={dragId === deal.id}
            onDragStart={() => onDragStart(deal.id)}
            onDragEnd={onDragEnd}
          />
        ))}

        {sorted.length === 0 && (
          <div className="flex flex-col items-center gap-1 rounded-md border border-dashed border-border p-6 text-center">
            <p className="text-[11px] font-medium text-muted-foreground">
              {isOver ? 'Thả vào đây' : 'Chưa có deal'}
            </p>
            <p className="text-[10px] text-muted-foreground/70">
              {isOver ? '' : 'Kéo thả hoặc bấm + để thêm'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}