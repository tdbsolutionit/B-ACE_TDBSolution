'use client';

import Link from 'next/link';
import { ChevronRight, User } from 'lucide-react';
import { type ProjectRow, type StageRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';

interface ProjectHeaderProps {
  project: ProjectRow & { lostReason?: string | null };
  stages: StageRow[];
  onEdit: () => void;
  onChooseStage: (stage: StageRow) => void;
}

export function ProjectHeader({ project, stages, onEdit, onChooseStage }: ProjectHeaderProps) {
  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="customers" className="hover:text-foreground">Khách hàng</Link>
        <ChevronRight size={12} />
        <Link href={`customers/${project.customerId}`} className="hover:text-foreground">{project.customer}</Link>
        <ChevronRight size={12} />
        <span className="font-medium text-foreground">{project.name}</span>
      </div>

      <div className="data-panel mb-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-xl font-bold">{project.name}</h1>
              {project.code && (
                <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                  {project.code}
                </span>
              )}
              <span className="stage-badge" style={{ background: `${project.stageColor}20`, color: project.stageColor }}>{project.stage}</span>
            </div>
            <div className="mt-2.5 flex flex-wrap items-center text-xs text-slate-500">
              <span>Giá trị: <strong className="text-slate-900">{project.value > 0 ? compactMoney(project.value) : '—'}</strong></span>
              <span className="mx-3 text-slate-300">·</span>
              <span>Xác suất: <strong className="text-slate-900">{project.probability}%</strong></span>
              <span className="mx-3 text-slate-300">·</span>
              <span>Chốt dự kiến: <strong className="text-slate-900">{project.closeDate || '—'}</strong></span>
              <span className="mx-3 text-slate-300">·</span>
              <span>Phụ trách: <strong className="text-slate-900">{project.owner || '—'}</strong></span>
              {project.status === 'lost' && project.lostReason && <span className="ml-3">Lý do thua: <strong className="text-slate-900">{project.lostReason}</strong></span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onEdit} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent">Sửa</button>
            <Link href={`customers/${project.customerId}`} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs hover:bg-accent"><User size={14} /> Khách hàng</Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {stages.map((stage) => (
            <button key={stage.id} type="button" onClick={() => onChooseStage(stage)} className={stage.id === project.stageId ? 'rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground' : 'rounded-full border px-3 py-1 text-xs hover:bg-accent'}>
              {stage.name}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}