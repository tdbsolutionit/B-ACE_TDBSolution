'use client';

import { useEffect, useMemo, useState } from 'react';
import { Filter } from 'lucide-react';
import type { ProjectRow, StageRow } from '@/lib/crm';
import { KanbanColumn } from './kanban-column';
import { useRealtime } from '@/lib/realtime';

type Props = {
  rows: ProjectRow[];
  stages: StageRow[];
  onMove: (dealId: string, stageId: string) => void;
  onCreate: (stageId: string) => void;
};

export function KanbanBoard({ rows, stages, onMove, onCreate }: Props) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const { on } = useRealtime();

  useEffect(() => {
    const unsub = on('deal:stage-changed', (event) => {
      const id = event.payload?.id;
      if (!id) return;

      setHighlightedId(id);
      window.setTimeout(() => setHighlightedId(null), 2500);
    });
    return unsub;
  }, [on]);

  const owners = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => {
      if (r.owner) set.add(r.owner);
    });
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    if (ownerFilter === 'all') return rows;
    return rows.filter((r) => r.owner === ownerFilter);
  }, [rows, ownerFilter]);

  const byStage = useMemo(() => {
    const map = new Map<string, ProjectRow[]>();
    stages.forEach((s) => map.set(s.id, []));
    filtered.forEach((row) => {
      const key =
        row.stageId && map.has(row.stageId)
          ? row.stageId
          : stages.find((s) => s.name === row.stage)?.id;
      if (key) map.get(key)!.push(row);
    });
    return map;
  }, [filtered, stages]);
  

  function handleDrop(stageId: string) {
    const id = dragId;
    setOverStageId(null);
    setDragId(null);
    if (!id) return;
    const deal = rows.find((r) => r.id === id);
    if (!deal || deal.stageId === stageId) return;
    onMove(id, stageId);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
        <div className="flex items-center gap-2 text-xs">
          <Filter size={14} className="text-muted-foreground" />
          <span className="text-muted-foreground">Lọc theo:</span>
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-7 rounded-md border border-input bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">Tất cả ({rows.length})</option>
            {owners.map((o) => (
              <option key={o} value={o}>
                {o} ({rows.filter((r) => r.owner === o).length})
              </option>
            ))}
          </select>
          {ownerFilter !== 'all' && (
            <button
              type="button"
              onClick={() => setOwnerFilter('all')}
              className="text-[11px] text-primary hover:underline"
            >
              Xoá lọc
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">Kéo thẻ giữa các cột để đổi giai đoạn</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={byStage.get(stage.id) ?? []}
            dragId={dragId}
            isOver={overStageId === stage.id}
            highlightedId={highlightedId} 
            onDragOver={() => setOverStageId(stage.id)}
            onDragLeave={() => setOverStageId((cur) => (cur === stage.id ? null : cur))}
            onDrop={() => handleDrop(stage.id)}
            onDragStart={setDragId}
            onDragEnd={() => {
              setDragId(null);
              setOverStageId(null);
            }}
            onCreate={onCreate}
          />
        ))}
      </div>
    </div>
  );
}
