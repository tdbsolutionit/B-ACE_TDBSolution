import type { ReactNode } from 'react';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string;
  note?: string;
  tone: string;
}

export function StatCard({ icon, label, value, note, tone }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-md ${tone}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate text-base font-bold leading-tight" title={value}>
            {value}
          </p>
        </div>
      </div>
      {note && <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{note}</p>}
    </div>
  );
}