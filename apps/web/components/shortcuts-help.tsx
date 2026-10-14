'use client';

import { X } from 'lucide-react';
import { useEffect } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

const GROUPS = [
  {
    title: 'Chung',
    items: [
      { keys: ['⌘', 'K'], desc: 'Mở ô tìm kiếm nhanh' },
      { keys: ['/'], desc: 'Focus ô tìm kiếm' },
      { keys: ['?'], desc: 'Hiện bảng trợ giúp này' },
      { keys: ['Esc'], desc: 'Đóng hộp thoại' },
    ],
  },
  {
    title: 'Điều hướng',
    items: [
      { keys: ['G', 'H'], desc: 'Về Tổng quan' },
      { keys: ['G', 'C'], desc: 'Khách hàng' },
      { keys: ['G', 'D'], desc: 'Dự án' },
      { keys: ['G', 'O'], desc: 'Cơ hội' },
      { keys: ['G', 'T'], desc: 'Công việc' },
      { keys: ['G', 'R'], desc: 'Báo cáo' },
    ],
  },
  {
    title: 'Danh sách khách hàng',
    items: [
      { keys: ['J'], desc: 'Di chuyển xuống' },
      { keys: ['K'], desc: 'Di chuyển lên' },
      { keys: ['Space'], desc: 'Chọn / bỏ chọn dòng' },
      { keys: ['Enter'], desc: 'Mở chi tiết' },
      { keys: ['Shift', 'Click'], desc: 'Chọn range' },
    ],
  },
  {
    title: 'Command Palette',
    items: [
      { keys: ['↑', '↓'], desc: 'Di chuyển kết quả' },
      { keys: ['↵'], desc: 'Chọn' },
      { keys: ['Esc'], desc: 'Đóng' },
    ],
  },
];

export function ShortcutsHelp({ open, onClose }: Props) {
  // Đóng khi nhấn Esc
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[640px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <h2 className="font-display text-base font-semibold">Phím tắt</h2>
            <p className="text-[11px] text-muted-foreground">
              Thao tác nhanh không cần chuột
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="subtle-scrollbar max-h-[70vh] overflow-y-auto p-5">
          <div className="grid gap-6 md:grid-cols-2">
            {GROUPS.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {group.title}
                </h3>
                <ul className="space-y-1.5">
                  {group.items.map((item, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent/50"
                    >
                      <span className="text-xs text-foreground">{item.desc}</span>
                      <span className="flex shrink-0 items-center gap-1">
                        {item.keys.map((k, j) => (
                          <span key={j} className="flex items-center gap-1">
                            {j > 0 && (
                              <span className="text-[10px] text-muted-foreground">+</span>
                            )}
                            <kbd className="inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[11px] font-medium text-foreground">
                              {k}
                            </kbd>
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 px-5 py-2.5 text-center text-[11px] text-muted-foreground">
          Nhấn <kbd className="mx-0.5 rounded border border-border bg-card px-1 py-0.5 font-mono text-[10px]">?</kbd> bất kỳ lúc nào để mở bảng này
        </div>
      </div>
    </>
  );
}
