'use client';

import { useEffect, useRef } from 'react';

type Routes = Record<string, string>;

/**
 * Phím tắt dạng "G → X" như Gmail/Linear.
 * Nhấn G, sau đó X trong vòng 1.2s để chuyển trang.
 */
export function useGotoSequence(routes: Routes, onGoto: (path: string) => void) {
  const waiting = useRef(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    function reset() {
      waiting.current = false;
      if (timer.current) {
        window.clearTimeout(timer.current);
        timer.current = null;
      }
    }

    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (inInput) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const key = event.key.toLowerCase();

      // Bước 1: chờ chữ G
      if (!waiting.current) {
        if (key === 'g') {
          waiting.current = true;
          // Tự reset sau 1.2s nếu không nhấn gì
          timer.current = window.setTimeout(reset, 1200);
        }
        return;
      }

      // Bước 2: đã có G → chờ chữ tiếp theo
      reset();
      const path = routes[key];
      if (path) {
        event.preventDefault();
        onGoto(path);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      reset();
    };
  }, [routes, onGoto]);
}
