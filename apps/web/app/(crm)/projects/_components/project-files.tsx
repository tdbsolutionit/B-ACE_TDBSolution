'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, UploadCloud, Trash2, Download, Loader2, Paperclip } from 'lucide-react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';

type ProjectFile = {
  id: string;
  name: string;
  url: string;
  size: number;
  createdAt: string;
};

interface ProjectFilesProps {
  projectId: string; // Đã sửa thành projectId
}

export function ProjectFiles({ projectId }: ProjectFilesProps) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchFiles();
  }, [projectId]);

  async function fetchFiles() {
    try {
      setLoading(true);
      // Gọi API lấy danh sách file đính kèm
      const res = await api<ProjectFile[]>(`/opportunities/${projectId}/files`);
      setFiles(Array.isArray(res) ? res : []);
    } catch (err) {
      // api() đã tự động bắn toast lỗi, chỉ cần log ra console để debug
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Giới hạn dung lượng file (ví dụ: 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return toast.error('Kích thước file không được vượt quá 10MB');
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await api(`/opportunities/${projectId}/files`, {
        method: 'POST',
        body: formData,
      });
      toast.success('Tải file lên thành công');
      await fetchFiles(); // Refresh danh sách
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDelete(fileId: string, fileName: string) {
    if (!confirm(`Bạn có chắc muốn xóa file "${fileName}"?`)) return;

    try {
      await api(`/opportunities/${projectId}/files/${fileId}`, { method: 'DELETE' });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('Đã xóa file');
    } catch (err) {
      console.error(err);
    }
  }

  function formatSize(bytes: number) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <Paperclip size={18} className="text-muted-foreground" />
            Tài liệu dự án
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">Quản lý hợp đồng, biên bản, tài liệu liên quan.</p>
        </div>
        
        <div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            onChange={handleUpload}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <UploadCloud size={16} />}
            {uploading ? 'Đang tải...' : 'Tải file lên'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : files.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 py-12 text-center">
          <FileText size={32} className="mb-3 text-muted-foreground/40" />
          <p className="text-sm font-medium text-foreground">Chưa có tài liệu nào</p>
          <p className="mt-1 text-xs text-muted-foreground">Bấm nút "Tải file lên" để thêm tài liệu đầu tiên.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((file) => (
            <li key={file.id} className="flex items-center justify-between gap-4 py-3 hover:bg-muted/10 transition-colors">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground" title={file.name}>
                    {file.name}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatSize(file.size)} · {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              
              <div className="flex shrink-0 items-center gap-1">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Tải xuống"
                >
                  <Download size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(file.id, file.name)}
                  className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-50 hover:text-red-600"
                  title="Xóa file"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}