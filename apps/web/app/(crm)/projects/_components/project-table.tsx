'use client';

import { useRouter } from 'next/navigation';
import { type ProjectRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/badges';
import { SortableHeader } from '@/components/shared/sortable-header';
import { type SortOrder } from '@/hooks/use-sort';

interface ProjectTableProps {
  rows: ProjectRow[];
  bulk: any; 
  sortBy: string;
  sortOrder: SortOrder;
  onSort: (field: string) => void;
}

export function ProjectTable({ rows, bulk, sortBy, sortOrder, onSort }: ProjectTableProps) {
  const router = useRouter();

  const sortProps = {
    currentSortBy: sortBy,
    currentSortOrder: sortOrder,
    onSort: onSort
  };

  return (
    <section className="data-panel overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="border-b border-border bg-muted/40 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3 w-12 text-center">
              <input
                type="checkbox"
                className="cursor-pointer"
                checked={bulk.isAllSelected}
                onChange={bulk.isAllSelected ? bulk.clear : bulk.selectAll}
              />
            </th>
            <SortableHeader label="Mã dự án" field="code" {...sortProps} />
            <SortableHeader label="Tên dự án" field="name" {...sortProps} />
            <th className="px-4 py-3 font-semibold">Khách hàng</th>
            <SortableHeader label="Trạng thái" field="status" {...sortProps} className="text-center" />
            <SortableHeader label="Giá trị" field="value" {...sortProps} className="text-right" />
            <SortableHeader label="Ngày chốt" field="expectedCloseDate" {...sortProps} className="text-right" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((project) => (
            <tr
              key={project.id}
              className={`group cursor-pointer hover:bg-muted/30 transition-colors ${bulk.selected.has(project.id) ? 'bg-muted/50' : ''}`}
              onClick={() => router.push(`/projects/${project.id}`)}
            >
              <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={bulk.selected.has(project.id)}
                  onChange={() => bulk.toggle(project.id)}
                />
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-xs font-semibold text-primary truncate block max-w-[250px]" title={project.code || ''}>
                  {project.code || '—'}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-foreground truncate max-w-[250px]">
                {project.name}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {project.customer || '—'}
              </td>
              <td className="px-4 py-3 text-center">
                <StatusBadge status={project.status} />
              </td>
              <td className="px-4 py-3 text-right font-medium">
                {project.value > 0 ? compactMoney(project.value) : <span className="text-muted-foreground/50">—</span>}
              </td>
              <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                {project.closeDate || <span className="text-muted-foreground/50">—</span>}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                Chưa có dự án nào.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}