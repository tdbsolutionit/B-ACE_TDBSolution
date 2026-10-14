'use client';

import { useEffect } from 'react';

type Handler = (event: KeyboardEvent) => void;

/**
 * Global keyboard shortcut hook.
 * @example
 * useKeyboard('k', () => setOpen(true), { meta: true });
 */
export function useKeyboard(
  key: string,
  handler: Handler,
  options: { meta?: boolean; ctrl?: boolean; shift?: boolean; preventDefault?: boolean } = {},
) {
  const { meta, ctrl, shift, preventDefault = true } = options;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Cho phép ⌘K/Ctrl+K kể cả khi đang ở trong input
      const isMetaCombo = meta || ctrl;

      if (!isMetaCombo && inInput) return;

      if (event.key.toLowerCase() !== key.toLowerCase()) return;
      if (meta && !event.metaKey) return;
      if (ctrl && !event.ctrlKey) return;
      if (shift && !event.shiftKey) return;
      if (!meta && !ctrl && (event.metaKey || event.ctrlKey)) return;

      if (preventDefault) event.preventDefault();
      handler(event);
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [key, handler, meta, ctrl, shift, preventDefault]);
}
