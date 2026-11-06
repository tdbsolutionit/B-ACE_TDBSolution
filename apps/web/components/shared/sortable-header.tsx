import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { type SortOrder } from '@/hooks/use-sort';

interface SortableHeaderProps {
  label: string;
  field: string;
  currentSortBy: string;
  currentSortOrder: SortOrder;
  onSort: (field: string) => void;
  className?: string;
}

export function SortableHeader({
  label,
  field,
  currentSortBy,
  currentSortOrder,
  onSort,
  className = '',
}: SortableHeaderProps) {
  const isSorted = currentSortBy === field;

  return (
    <th
      className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5 px-3 py-2">
        {label}
        {!isSorted ? (
          <ArrowUpDown size={14} className="text-muted-foreground/40" />
        ) : currentSortOrder === 'asc' ? (
          <ArrowUp size={14} className="text-primary" />
        ) : (
          <ArrowDown size={14} className="text-primary" />
        )}
      </div>
    </th>
  );
}