'use client';

import { Download, FileUp, Search } from 'lucide-react';

interface ProjectToolbarProps {
  q: string;
  setQ: (q: string) => void;
  onExport: () => void;
  onImportClick: () => void;
  onAddClick: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ProjectToolbar({ q, setQ, onExport, onImportClick, onAddClick, fileInputRef, onFileChange }: ProjectToolbarProps) {
  return (
    <>
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-[28px] font-bold">Quản lý Dự án</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Theo dõi tiến độ thực thi, hồ sơ và tài liệu dự án.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onExport} className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
            <Download size={16} className="mr-2" /> Xuất
          </button>
          <button type="button" onClick={onImportClick} className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent">
            <FileUp size={16} className="mr-2" /> Import
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={onFileChange}
          />
          <button type="button" onClick={onAddClick} className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
            + Thêm dự án
          </button>
        </div>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <div className="relative min-w-[250px] flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
          <input
            className="h-8 w-full rounded-md border border-input bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-primary/40"
            placeholder="Tìm mã dự án, tên, khách hàng..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
    </>
  );
}