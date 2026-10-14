'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Phone,
  StickyNote,
} from 'lucide-react';
import type { CustomerRow } from '@/lib/crm';
import { initials } from '@/lib/utils';
import { LoadingRows } from '@/components/loading';
import { QuickLogCall } from '@/components/quick-log-call';
import { QuickNote } from '@/components/quick-note';

const STATUS: Record<string, string> = {
  lead: 'Lead',
  active: 'Đang hoạt động',
  inactive: 'Ngừng hoạt động',
};

type SortKey = 'name' | 'createdAt' | 'openOppCount';
type SortDir = 'asc' | 'desc';
type Density = 'compact' | 'comfortable';

type Props = {
  rows: CustomerRow[];
  loading?: boolean;
  density?: Density;
  activeId?: string;
  selected: Set<string>;
  onToggle: (id: string, index?: number, shiftKey?: boolean) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  isAllSelected: boolean;
  isPartial: boolean;
};

export function CustomerTable({
  rows,
  loading,
  density = 'comfortable',
  selected,
  onToggle,
  onSelectAll,
  onClearSelection,
  isAllSelected,
  isPartial,
  activeId,
}: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const rowRefs = useRef<Array<HTMLTableRowElement | null>>([]);

  const [logCallCustomer, setLogCallCustomer] = useState<CustomerRow | null>(null);
  const [noteCustomer, setNoteCustomer] = useState<CustomerRow | null>(null);

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = (a.name || '').localeCompare(b.name || '');
    else if (sortKey === 'createdAt')
      cmp = (a.createdAt || '').localeCompare(b.createdAt || '');
    else if (sortKey === 'openOppCount')
      cmp = (a.openOppCount || 0) - (b.openOppCount || 0);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      )
        return;

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIdx((i) => Math.min(i + 1, sorted.length - 1));
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === 'x' || e.key === ' ') {
        if (focusedIdx >= 0 && sorted[focusedIdx]) {
          e.preventDefault();
          onToggle(sorted[focusedIdx].id, focusedIdx);
        }
      } else if (e.key === 'Enter') {
        if (focusedIdx >= 0 && sorted[focusedIdx]) {
          e.preventDefault();
          window.location.href = `/khach-hang/${sorted[focusedIdx].id}`;
        }
      } else if (e.key === 'Escape') {
        onClearSelection();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [sorted, focusedIdx, onToggle, onClearSelection]);

  useEffect(() => {
    rowRefs.current[focusedIdx]?.scrollIntoView({ block: 'nearest' });
  }, [focusedIdx]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const cellPy = density === 'compact' ? 'py-2' : 'py-3';

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="w-10 px-3 py-2.5 text-left">
                <button
                  type="button"
                  onClick={() => (isAllSelected ? onClearSelection() : onSelectAll())}
                  className="flex size-4 items-center justify-center rounded border border-input bg-background transition-colors hover:border-primary"
                  aria-label="Chọn tất cả"
                >
                  {isAllSelected && <Check size={11} className="text-primary" />}
                  {isPartial && <span className="h-0.5 w-2 bg-primary" />}
                </button>
              </th>

              <SortHeader
                label="Khách hàng"
                active={sortKey === 'name'}
                dir={sortDir}
                onClick={() => toggleSort('name')}
              />
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Liên hệ
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Nguồn
              </th>
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Trạng thái
              </th>
              <SortHeader
                label="Cơ hội"
                active={sortKey === 'openOppCount'}
                dir={sortDir}
                onClick={() => toggleSort('openOppCount')}
              />
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Phụ trách
              </th>
              <SortHeader
                label="Ngày tạo"
                active={sortKey === 'createdAt'}
                dir={sortDir}
                onClick={() => toggleSort('createdAt')}
              />
              <th className="w-32 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={9} className="p-0">
                  <LoadingRows count={6} />
                </td>
              </tr>
            )}

            {!loading && sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center">
                  <p className="text-sm text-muted-foreground">
                    Không có khách hàng nào khớp bộ lọc
                  </p>
                </td>
              </tr>
            )}

            {!loading &&
              sorted.map((row, index) => {
                const isSel = selected.has(row.id);
                const isFocus = focusedIdx === index;
                return (
                  <tr
                    key={row.id}
                    ref={(el) => {
                      rowRefs.current[index] = el;
                    }}
                    onClick={() => setFocusedIdx(index)}
                    className={`group border-b border-border/60 transition-colors ${
                      activeId === row.id
                        ? 'bg-primary/10 border-l-2 border-l-primary'
                        : isSel
                          ? 'bg-primary/5'
                          : isFocus
                            ? 'bg-accent'
                            : 'hover:bg-accent/50'
                    }`}
                  >
                    <td className={`${cellPy} px-3`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggle(row.id, index, e.shiftKey);
                        }}
                        className={`flex size-4 items-center justify-center rounded border transition-colors ${
                          isSel
                            ? 'border-primary bg-primary'
                            : 'border-input bg-background hover:border-primary'
                        }`}
                      >
                        {isSel && <Check size={11} className="text-primary-foreground" />}
                      </button>
                    </td>

                    <td className={`${cellPy} px-3`}>
                      <Link
                        href={`/khach-hang/${row.id}`}
                        className="flex items-center gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={`avatar-initials avatar-tone-${index % 4} inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold`}
                        >
                          {initials(row.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-foreground">
                            {row.name}
                          </span>
                          {row.company && (
                            <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                              {row.company}
                            </span>
                          )}
                        </span>
                      </Link>
                    </td>

                    <td className={`${cellPy} px-3`}>
                      <p className="text-xs">{row.phone || '—'}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {row.email || '—'}
                      </p>
                    </td>

                    <td className={`${cellPy} px-3`}>
                      <span className="source-badge">{row.sourceName || '—'}</span>
                    </td>

                    <td className={`${cellPy} px-3`}>
                      <span
                        className={
                          row.status === 'active'
                            ? 'status-badge status-success'
                            : row.status === 'inactive'
                              ? 'status-badge status-warning'
                              : 'status-badge status-blue'
                        }
                      >
                        {STATUS[row.status]}
                      </span>
                    </td>

                    <td className={`${cellPy} px-3`}>
                      {row.openOppCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {row.openOppCount} đang mở
                        </span>
                      ) : row.oppCount > 0 ? (
                        <span className="text-xs text-muted-foreground">
                          ({row.oppCount} lead)
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>

                    <td className={`${cellPy} px-3 text-xs`}>
                      {row.assigneeName || '—'}
                    </td>

                    <td className={`${cellPy} px-3 text-[11px] text-muted-foreground`}>
                      {row.createdAt.slice(0, 10)}
                    </td>

                    <td className={`${cellPy} px-3`}>
                      <div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          title="Ghi cuộc gọi"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLogCallCustomer(row);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-green-50 hover:text-green-600"
                        >
                          <Phone size={14} />
                        </button>

                        <button
                          type="button"
                          title="Ghi chú"
                          onClick={(e) => {
                            e.stopPropagation();
                            setNoteCustomer(row);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-amber-50 hover:text-amber-600"
                        >
                          <StickyNote size={14} />
                        </button>

                        {row.phone && (
                          <button
                            type="button"
                            title="Nhắn tin"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `tel:${row.phone}`;
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            <MessageSquare size={14} />
                          </button>
                        )}

                        {row.email && (
                          <button
                            type="button"
                            title="Email"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = `mailto:${row.email}`;
                            }}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            <Mail size={14} />
                          </button>
                        )}

                        <Link
                          href={`/khach-hang/${row.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          title="Chi tiết"
                        >
                          <MoreHorizontal size={14} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Quick modals */}
      <QuickLogCall
        open={!!logCallCustomer}
        onClose={() => setLogCallCustomer(null)}
        customer={logCallCustomer}
      />
      <QuickNote
        open={!!noteCustomer}
        onClose={() => setNoteCustomer(null)}
        customer={noteCustomer}
      />
    </>
  );
}

function SortHeader({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <th className="px-3 py-2.5 text-left">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground"
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ArrowUp size={11} className="text-primary" />
          ) : (
            <ArrowDown size={11} className="text-primary" />
          )
        ) : (
          <ArrowUpDown size={11} className="opacity-40" />
        )}
      </button>
    </th>
  );
}