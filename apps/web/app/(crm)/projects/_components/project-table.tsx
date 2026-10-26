'use client';

import { useRouter } from 'next/navigation';
import { type ProjectRow } from '@/lib/crm';
import { compactMoney } from '@/lib/utils';
import { STATUS } from '../_lib/project-utils'; // Import từ _lib

interface ProjectTableProps {
  rows: ProjectRow[];
  bulk: any; 
}

export function ProjectTable({ rows, bulk }: ProjectTableProps) {
  const router = useRouter();

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
            <th className="px-4 py-3 font-semibold">Mã dự án</th>
            <th className="px-4 py-3 font-semibold">Tên dự án</th>
            <th className="px-4 py-3 font-semibold">Khách hàng</th>
            <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
            <th className="px-4 py-3 font-semibold text-right">Giá trị</th>
            <th className="px-4 py-3 font-semibold text-right">Ngày chốt</th>
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
                <span className={`inline-flex items-center justify-center whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium ${
                  project.status === 'won' ? 'bg-green-100 text-green-700' :
                  project.status === 'lost' ? 'bg-red-100 text-red-700' :
                  'bg-blue-100 text-blue-700'
                }`}>
                  {STATUS[project.status]}
                </span>
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