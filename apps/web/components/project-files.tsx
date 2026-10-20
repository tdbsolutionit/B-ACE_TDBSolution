'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, Eye, Paperclip, Trash2 } from 'lucide-react';
import { type ProjectFileRow } from '@/lib/crm';
import { api, apiBlob } from '@/lib/auth';

function sizeLabel(size: number) {
  if (size >= 1_000_000) return `${(size / 1_000_000).toFixed(1)} MB`;
  if (size >= 1000) return `${Math.round(size / 1000)} KB`;
  return `${size} B`;
}

export function ProjectFiles({ opportunityId }: { opportunityId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ProjectFileRow[]>([]);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  // SỬA 1: Đổi API lấy danh sách file
  function load() {
    return api<ProjectFileRow[]>(`/files?opportunityId=${opportunityId}`).then(setRows);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [opportunityId]);

  async function upload(file: File) {
    setBusy(true); 
    setError(''); 
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // SỬA 2: Đổi projectId thành opportunityId
      formData.append('opportunityId', opportunityId); 

      await api<any>('/files/upload', {
        method: 'POST',
        body: formData,
      });

      // SỬA 3: Đổi loadFiles() thành load()
      await load(); 
      
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tải file lên');
    } finally {
      setBusy(false);
    }
  }
  async function openFile(row: ProjectFileRow, download: boolean) {
    try {
      setError(''); 
      setInfo('');

      if (download) {
        const blob = await apiBlob(`/files/${row.id}/download`);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = row.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 30_000);
      } else {
        const isDoc = row.name.match(/\.(doc|docx|xls|xlsx)$/i);
        if (isDoc) setInfo('Đang chuẩn bị bản xem trước, vui lòng đợi trong giây lát...');

        const blob = await apiBlob(`/files/${row.id}/preview`);
        const url = URL.createObjectURL(blob);
        
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          setError('Trình duyệt đang chặn tab mới. Vui lòng cho phép pop-up.');
        }
        
        setInfo('');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (err: any) {
      setError('Không thể tải hoặc xem file: ' + err.message);
      setInfo('');
    }
  }

  async function remove(row: ProjectFileRow) {
    // SỬA 4: Đổi API xóa file
    await api(`/files/${row.id}`, { method: 'DELETE' });
    setRows((current) => current.filter((item) => item.id !== row.id));
  }

  return (
    <div className="data-panel mt-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">Tệp dự án</h2>
        <button type="button" onClick={() => input.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground">
          <Paperclip size={14} /> {busy ? 'Đang tải…' : 'Tải lên'}
        </button>
        <input
          ref={input}
          type="file"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) upload(file).catch((err: Error) => setError(err.message));
          }}
        />
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {info && <p className="mb-2 text-sm text-blue-600">{info}</p>}
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có hợp đồng, brief hay tài liệu đính kèm.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="file-row flex items-center gap-3 rounded-lg px-2 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{row.name}</span>
                <span className="text-[11px] text-muted-foreground">{sizeLabel(row.size)} · {row.createdAt.slice(0, 10)}</span>
              </span>
              <button type="button" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-white" title="Xem" onClick={() => openFile(row, false).catch((err: Error) => setError(err.message))}><Eye size={15} /></button>
              <button type="button" className="inline-flex size-8 items-center justify-center rounded-md hover:bg-white" title="Tải xuống" onClick={() => openFile(row, true).catch((err: Error) => setError(err.message))}><Download size={15} /></button>
              <button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-destructive hover:bg-white" title="Xoá" onClick={() => remove(row).catch((err: Error) => setError(err.message))}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}