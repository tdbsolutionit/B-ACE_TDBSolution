'use client';

import { useRouter } from 'next/navigation';
import { type CustomerRow } from '@/lib/crm';
import { initials } from '@/lib/utils';
import { Loading } from '@/components/shared/loading';
import { StatusBadge } from '@/components/shared/badges';
import { type SortOrder } from '@/hooks/use-sort';
import { SortableHeader } from '@/components/shared/sortable-header';

interface CustomerTableProps {
  rows: CustomerRow[];
  loading?: boolean;
  density: 'compact' | 'comfortable';
  selected: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
  isPartial: boolean;
  activeId?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort?: (field: string) => void;
}

export function CustomerTable({
  rows, 
  loading, 
  density, 
  selected, 
  onToggle, 
  onSelectAll, 
  onClearSelection,
  isAllSelected, 
  isPartial, 
  activeId, 
  sortBy,       // <-- THÊM VÀO ĐÂY
  sortOrder,    // <-- THÊM VÀO ĐÂY
  onSort,
}: CustomerTableProps) {
  const router = useRouter();

  if (loading) return <Loading text="Đang tải danh sách..." />;

  const rowPadding = density === 'compact' ? 'py-2' : 'py-3.5';

  const sortProps = {
    currentSortBy: sortBy || '',
    currentSortOrder: sortOrder || 'asc',
    onSort: onSort || (() => { })
  };

  return (
    <table className="w-full text-left whitespace-nowrap">
      <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] uppercase tracking-wider text-muted-foreground shadow-sm">
        <tr>
          <th className="w-10 px-4 py-3 text-center">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={isAllSelected}
              ref={(input) => { if (input) input.indeterminate = isPartial; }}
              onChange={(e) => { if (e.target.checked) onSelectAll(); else onClearSelection(); }}
            />
          </th>
          <SortableHeader label="MÃ KH" field="code" {...sortProps} />
          <SortableHeader label="Khách hàng" field="name" {...sortProps} />
          <th className="px-4 py-3 font-semibold">Liên hệ</th>
          <th className="px-4 py-3 font-semibold">Nguồn</th>
          <SortableHeader label="Trạng Thái" field="status" {...sortProps} />
          <SortableHeader label="Cơ hội" field="oppCount" {...sortProps} className="text-center" />
          <SortableHeader label="Người phụ trách" field="assigneeName" {...sortProps} />
          <SortableHeader label="Ngày tạo" field="createdAt" {...sortProps} />
        </tr>
      </thead>
      <tbody className="divide-y divide-border text-[13px]">
        {rows.map((row) => {
          const isSelected = selected.has(row.id);
          const isActive = activeId === row.id;

          return (
            <tr
              key={row.id}
              onClick={() => router.push(`/customers/${row.id}`)}
              className={`group cursor-pointer transition-colors hover:bg-muted/40 ${isActive ? 'bg-muted/60' : isSelected ? 'bg-primary/5' : ''}`}
            >
              <td className={`px-4 ${rowPadding} text-center`} onClick={(e) => e.stopPropagation()}>
                <input type="checkbox" className="cursor-pointer" checked={isSelected} onChange={() => onToggle(row.id)} />
              </td>
              <td className={`px-2 ${rowPadding}`}>
                <span className="font-mono text-xs font-semibold text-primary" title={row.code || ''}>
                  {row.code || row.shortCode || '—'}
                </span>
              </td>
              <td className={`px-4 ${rowPadding}`}>
                <div className="flex items-center gap-3">
                  <span className="avatar-initials inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {initials(row.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{row.name}</p>
                    {row.company && row.company !== row.name && <p className="truncate text-[13px] text-muted-foreground mt-0.5">{row.company}</p>}
                  </div>
                </div>
              </td>
              <td className={`px-4 ${rowPadding}`}>
                <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
                  {row.phone && <span>{row.phone}</span>}
                  {row.email && <span className="truncate max-w-[200px]" title={row.email}>{row.email}</span>}
                  {!row.phone && !row.email && <span>—</span>}
                </div>
              </td>
              <td className={`px-4 ${rowPadding}`}>
                {row.sourceName ? <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-700">{row.sourceName}</span> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className={`px-4 ${rowPadding}`}>
                <StatusBadge status={row.status} />
              </td>
              <td className={`px-4 ${rowPadding} text-center`}>
                {row.oppCount > 0 ? <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2 py-1 text-[13px] font-bold text-amber-800">{row.oppCount}</span> : <span className="text-muted-foreground">—</span>}
              </td>
              <td className={`px-4 ${rowPadding} text-[13px] font-medium`}>
                {row.assigneeName || <span className="text-muted-foreground">—</span>}
              </td>
              <td className={`px-4 ${rowPadding} text-[13px] text-muted-foreground`}>
                {row.createdAt.slice(0, 10)}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">Không có khách hàng nào khớp bộ lọc</td>
          </tr>
        )}
      </tbody>
    </table>
  );
}