import type { ComponentType } from 'react';
import { FolderKanban, History, StickyNote, User } from 'lucide-react';
import type { CustomerTabId } from '../_types';

interface CustomerTabsProps {
  activeTab: CustomerTabId;
  projectCount: number;
  onChange: (tab: CustomerTabId) => void;
}

const TABS: Array<{
  id: CustomerTabId;
  label: string;
  icon: ComponentType<{ size?: number }>;
}> = [
  { id: 'info', label: 'Thông tin', icon: User },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
  { id: 'activities', label: 'Lịch sử tương tác', icon: History },
  { id: 'notes', label: 'Ghi chú', icon: StickyNote },
];

export function CustomerTabs({ activeTab, projectCount, onChange }: CustomerTabsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-1 border-b border-border pb-2">
      {TABS.map(({ id, label, icon: Icon }) => {
        const displayLabel = id === 'projects' ? `${label} (${projectCount})` : label;
        const isActive = activeTab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`inline-flex h-9 items-center gap-2 rounded-md px-3 text-sm font-medium ${
              isActive ? 'bg-secondary text-secondary-foreground' : 'hover:bg-accent'
            }`}
          >
            <Icon size={16} /> {displayLabel}
          </button>
        );
      })}
    </div>
  );
}