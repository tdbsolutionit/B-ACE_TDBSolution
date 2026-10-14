'use client';

import { useCallback, useState } from 'react';

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastIndex, setLastIndex] = useState<number | null>(null);

  const toggle = useCallback(
    (id: string, index?: number, shiftKey = false) => {
      setSelected((current) => {
        const next = new Set(current);

        // Shift+click để chọn range
        if (shiftKey && index != null && lastIndex != null) {
          const start = Math.min(index, lastIndex);
          const end = Math.max(index, lastIndex);
          for (let i = start; i <= end; i++) {
            const item = items[i];
            if (item) next.add(item.id);
          }
          return next;
        }

        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      if (index != null) setLastIndex(index);
    },
    [items, lastIndex],
  );

  const selectAll = useCallback(() => {
    setSelected(new Set(items.map((i) => i.id)));
  }, [items]);

  const clear = useCallback(() => {
    setSelected(new Set());
    setLastIndex(null);
  }, []);

  const isSelected = useCallback((id: string) => selected.has(id), [selected]);

  return {
    selected,
    selectedIds: Array.from(selected),
    count: selected.size,
    toggle,
    selectAll,
    clear,
    isSelected,
    isAllSelected: items.length > 0 && selected.size === items.length,
    isPartial: selected.size > 0 && selected.size < items.length,
  };
}
