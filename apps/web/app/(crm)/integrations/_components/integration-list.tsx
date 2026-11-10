'use client';

import { Search, Boxes, MessageSquare, CreditCard, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  Boxes, MessageSquare, CreditCard, Sparkles
};

interface IntegrationListProps {
  integrations: any[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
}

export function IntegrationList({ integrations, selectedId, onSelect, search, onSearchChange }: IntegrationListProps) {
  const filtered = integrations.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.category.toLowerCase().includes(search.toLowerCase())
  );

  const grouped = filtered.reduce((acc, curr) => {
    if (!acc[curr.category]) acc[curr.category] = [];
    acc[curr.category].push(curr);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="flex w-[320px] shrink-0 flex-col border-r border-border bg-muted/10">
      <div className="flex h-14 items-center border-b border-border px-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Danh mục tích hợp</h2>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
          <input
            type="text"
            placeholder="Tìm kiếm nền tảng..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background pl-8 pr-3 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-4 subtle-scrollbar">
        {Object.entries(grouped).map(([category, apps]) => {
          const appList = apps as any[];
          
          return (
            <div key={category} className="mb-4">
              <h3 className="mb-1 px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {category}
              </h3>
              <div className="space-y-0.5">
                {appList.map(app => {
                  const Icon = ICON_MAP[app.icon] || Boxes;
                  const isSelected = selectedId === app.id;

                  return (
                    <button
                      key={app.id}
                      onClick={() => onSelect(app.id)}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors ${
                        isSelected 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : 'text-foreground hover:bg-muted/80'
                      }`}
                    >
                      <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon size={16} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{app.name}</p>
                        <p className="truncate text-[11px] text-muted-foreground">{app.description}</p>
                      </div>
                      {app.hasError ? (
                        <AlertCircle size={14} className="text-red-500" />
                      ) : app.isConnected ? (
                        <div className="size-2 rounded-full bg-green-500" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Không tìm thấy tích hợp nào.</p>
        )}
      </div>
    </div>
  );
}