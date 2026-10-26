'use client';

import { Download, FileUp, LayoutGrid, Plus, Rows, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CustomerToolbarProps {
  totalFiltered: number;
  totalMeta: number;
  tab: string;
  setTab: (tab: string) => void;
  q: string;
  setQ: (q: string) => void;
  density: 'compact' | 'comfortable';
  setDensity: (d: 'compact' | 'comfortable') => void;
  permHasCreate: boolean;
  onExport: () => void;
  onImportClick: () => void;
  onAddClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tabsData: readonly (readonly [string, string, number])[];
}

export function CustomerToolbar({
  totalFiltered, totalMeta, tab, setTab, q, setQ, density, setDensity,
  permHasCreate, onExport, onImportClick, onAddClick, fileInputRef, onFileChange, tabsData
}: CustomerToolbarProps) {
  return (
    <>
      {/* Header & Actions */}
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold">Khách hàng</h1>
          <p className="text-[11px] text-muted-foreground">{totalFiltered} / {totalMeta} khách hàng</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <Button variant="outline" className="h-8 px-2.5 text-xs" title="Xuất danh sách" onClick={onExport}>
            <Download size={14} />
          </Button>
          {permHasCreate && (
            <>
              <Button variant="outline" className="h-8 px-2.5 text-xs" title="Nhập khách từ file Excel/CSV" onClick={onImportClick}>
                <FileUp size={14} />
              </Button>
              <input ref={fileInputRef} type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={onFileChange} />
              <Button className="h-8 gap-1 px-2.5 text-xs" onClick={onAddClick}>
                <Plus size={14} /> Thêm
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border px-3">
        <div className="-mt-0 flex items-center gap-1 overflow-x-auto">
          {tabsData.map(([key, label, count]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative whitespace-nowrap px-2.5 py-2.5 text-xs font-medium ${tab === key ? 'text-primary' : 'text-muted-foreground'}`}
            >
              {label}
              <span className="ml-1 text-[10px] text-muted-foreground">{count}</span>
              {tab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Search & Density */}
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <div className="relative min-w-[160px] flex-1">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
          <Input
            className="h-8 pl-8 text-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm theo tên, mã KH, SĐT, email..."
          />
        </div>
        <button
          type="button"
          onClick={() => setDensity(density === 'compact' ? 'comfortable' : 'compact')}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
          title={density === 'compact' ? 'Chuyển sang thoáng' : 'Chuyển sang gọn'}
        >
          {density === 'compact' ? <LayoutGrid size={13} /> : <Rows size={13} />}
        </button>
      </div>
    </>
  );
}