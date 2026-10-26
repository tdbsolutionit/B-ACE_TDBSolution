'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CustomerListPane } from '@/app/(crm)/customers/_components/customer-list-pane';

const STORAGE_KEY = 'bace.split.leftPct';
const DEFAULT_PCT = 70;
const MIN_PCT = 25;
const MAX_PCT = 65;

export default function KhachHangLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const isFullMode = searchParams.get('full') === '1';
  
  // SỬA LỖI REGEX TẠI ĐÂY: Thêm dấu / chuẩn xác
  const hasDetail = /^\/customers\/[^/]+/.test(pathname);
  
  const [isNarrow, setIsNarrow] = useState(false);
  const [leftPct, setLeftPct] = useState(DEFAULT_PCT);
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Responsive check
  useEffect(() => {
    function check() {
      setIsNarrow(window.innerWidth < 1280);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ESC để đóng preview (quay về danh sách)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) return;
      if (document.querySelector('.modal-backdrop')) return;

      if (hasDetail) router.push('/customers');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hasDetail, router]);

  // Drag handlers
  const onMouseDown = useCallback(() => {
    setDragging(true);
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
    setLeftPct(clamped);
  }, [dragging]);

  const onMouseUp = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    localStorage.setItem(STORAGE_KEY, String(leftPct));
  }, [dragging, leftPct]);

  // Global listeners khi đang drag
  useEffect(() => {
    if (!dragging) return;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);

  // SỬA LỖI LOGIC RENDER TẠI ĐÂY: Ưu tiên check isFullMode trước
  if (isFullMode) {
    return (
      <div className="h-full w-full">
        <div className="subtle-scrollbar h-full overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  // Chưa chọn khách → list full width
  if (!hasDetail) {
    return (
      <div className="h-full w-full">
        <CustomerListPane />
      </div>
    );
  }

  // Màn hình hẹp → chỉ detail
  if (isNarrow) {
    return (
      <div className="h-full w-full">
        <div className="subtle-scrollbar h-full overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  // Màn hình rộng → split view với thanh kéo
  return (
    <div
      ref={containerRef}
      className="grid h-full w-full"
      style={{ gridTemplateColumns: `${leftPct}% 4px 1fr` }}
    >
      {/* List pane */}
      <div className="overflow-hidden">
        <CustomerListPane />
      </div>

      {/* Draggable divider */}
      <div
        onMouseDown={onMouseDown}
        className={`relative h-full cursor-col-resize transition-colors ${
          dragging ? 'bg-primary/60' : 'bg-border hover:bg-primary/40'
        }`}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        <div className={`absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full transition-colors ${
          dragging ? 'bg-primary' : 'bg-border/0 group-hover:bg-primary/60'
        }`} />
      </div>

      {/* Detail pane */}
      <div className="overflow-hidden bg-background">
        <div className="subtle-scrollbar h-full overflow-auto">
          {children}
        </div>
      </div>
    </div>
  );
}