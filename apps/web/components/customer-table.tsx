'use client';

import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type CustomerRow } from '@/lib/crm';
import { initials } from '@/lib/utils';
import { Loading } from '@/components/loading';

const STATUS: Record<string, string> = {
  lead: 'Lead',
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
};

const statusClass: Record<string, string> = {
  lead: 'bg-amber-100 text-amber-800',
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-slate-100 text-slate-600',
};

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
  onSort,
  sortConfig,
}: {
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
  onSort?: (key: string) => void;
  sortConfig?: { key: string; direction: 'asc' | 'desc' } | null;
}) {
  const router = useRouter();

  if (loading) return <Loading text="Đang tải danh sách..." />;

  const rowPadding = density === 'compact' ? 'py-2' : 'py-3.5';

  return (
    <table className="w-full text-left whitespace-nowrap">
      <thead className="sticky top-0 z-10 border-b border-border bg-card text-[11px] uppercase tracking-wider text-muted-foreground shadow-sm">
        <tr>
          {/* Checkbox */}
          <th className="w-10 px-4 py-3 text-center">
            <input
              type="checkbox"
              className="cursor-pointer"
              checked={isAllSelected}
              ref={(input) => {
                if (input) input.indeterminate = isPartial;
              }}
              onChange={(e) => {
                if (e.target.checked) onSelectAll();
                else onClearSelection();
              }}
            />
          </th>
          
          {/* CỘT MỚI: MÃ KHÁCH HÀNG */}
          <th className="px-2 py-3 font-semibold">Mã KH</th>

          {/* Tên khách hàng */}
          <th className="px-4 py-3 font-semibold">
            <button type="button" onClick={() => onSort?.('name')} className="inline-flex items-center gap-1 hover:text-foreground">
              Khách hàng
              {(!sortConfig || sortConfig.key !== 'name') && <ArrowUpDown size={12} className="opacity-40" />}
              {sortConfig?.key === 'name' && sortConfig.direction === 'asc' && <ArrowUp size={12} />}
              {sortConfig?.key === 'name' && sortConfig.direction === 'desc' && <ArrowDown size={12} />}
            </button>
          </th>

          <th className="px-4 py-3 font-semibold">Liên hệ</th>
          <th className="px-4 py-3 font-semibold">Nguồn</th>
          <th className="px-4 py-3 font-semibold">Trạng thái</th>
          
          <th className="px-4 py-3 font-semibold text-center">
            <button type="button" onClick={() => onSort?.('oppCount')} className="inline-flex items-center gap-1 hover:text-foreground">
              Cơ hội
              {(!sortConfig || sortConfig.key !== 'oppCount') && <ArrowUpDown size={12} className="opacity-40" />}
              {sortConfig?.key === 'oppCount' && sortConfig.direction === 'asc' && <ArrowUp size={12} />}
              {sortConfig?.key === 'oppCount' && sortConfig.direction === 'desc' && <ArrowDown size={12} />}
            </button>
          </th>

          <th className="px-4 py-3 font-semibold">Phụ trách</th>
          
          <th className="px-4 py-3 font-semibold">
            <button type="button" onClick={() => onSort?.('createdAt')} className="inline-flex items-center gap-1 hover:text-foreground">
              Ngày tạo
              {(!sortConfig || sortConfig.key !== 'createdAt') && <ArrowUpDown size={12} className="opacity-40" />}
              {sortConfig?.key === 'createdAt' && sortConfig.direction === 'asc' && <ArrowUp size={12} />}
              {sortConfig?.key === 'createdAt' && sortConfig.direction === 'desc' && <ArrowDown size={12} />}
            </button>
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border text-[13px]">
        {rows.map((row) => {
          const isSelected = selected.has(row.id);
          const isActive = activeId === row.id;
          
          return (
            <tr
              key={row.id}
              onClick={() => router.push(`/khach-hang/${row.id}`)}
              className={`group cursor-pointer transition-colors hover:bg-muted/40 ${
                isActive ? 'bg-muted/60' : isSelected ? 'bg-primary/5' : ''
              }`}
            >
              {/* Checkbox */}
              <td className={`px-4 ${rowPadding} text-center`} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  className="cursor-pointer"
                  checked={isSelected}
                  onChange={() => onToggle(row.id)}
                />
              </td>

              {/* MÃ KHÁCH HÀNG */}
              <td className={`px-2 ${rowPadding}`}>
                <span className="font-mono text-xs font-semibold text-primary" title={row.code || ''}>
                  {row.code || row.shortCode || '—'}
                </span>
              </td>

              {/* TÊN VÀ CÔNG TY (Tăng font size) */}
              <td className={`px-4 ${rowPadding}`}>
                <div className="flex items-center gap-3">
                  <span className="avatar-initials inline-flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                    {initials(row.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold text-foreground">{row.name}</p>
                    {row.company && row.company !== row.name && (
                      <p className="truncate text-[13px] text-muted-foreground mt-0.5">{row.company}</p>
                    )}
                  </div>
                </div>
              </td>

              {/* LIÊN HỆ (Tăng font size) */}
              <td className={`px-4 ${rowPadding}`}>
                <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
                  {row.phone && <span>{row.phone}</span>}
                  {row.email && <span className="truncate max-w-[200px]" title={row.email}>{row.email}</span>}
                  {!row.phone && !row.email && <span>—</span>}
                </div>
              </td>

              {/* NGUỒN */}
              <td className={`px-4 ${rowPadding}`}>
                {row.sourceName ? (
                  <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-700">
                    {row.sourceName}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              {/* TRẠNG THÁI */}
              <td className={`px-4 ${rowPadding}`}>
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ${statusClass[row.status] || 'bg-slate-100 text-slate-600'}`}>
                  {STATUS[row.status] || row.status}
                </span>
              </td>

              {/* CƠ HỘI */}
              <td className={`px-4 ${rowPadding} text-center`}>
                {row.oppCount > 0 ? (
                  <span className="inline-flex items-center justify-center rounded-md bg-amber-100 px-2 py-1 text-[13px] font-bold text-amber-800">
                    {row.oppCount}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>

              {/* PHỤ TRÁCH (Tăng font size) */}
              <td className={`px-4 ${rowPadding} text-[13px] font-medium`}>
                {row.assigneeName || <span className="text-muted-foreground">—</span>}
              </td>

              {/* NGÀY TẠO (Tăng font size) */}
              <td className={`px-4 ${rowPadding} text-[13px] text-muted-foreground`}>
                {row.createdAt.slice(0, 10)}
              </td>
            </tr>
          );
        })}
        {rows.length === 0 && (
          <tr>
            <td colSpan={9} className="py-12 text-center text-sm text-muted-foreground">
              Không có khách hàng nào khớp bộ lọc
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}