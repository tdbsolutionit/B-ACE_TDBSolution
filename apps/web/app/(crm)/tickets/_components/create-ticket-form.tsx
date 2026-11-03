'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { CustomerSelect } from '@/components/shared/customer-select';
import { ArrowLeft, Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List, Paperclip, Send, RotateCcw, RotateCw, Type, MoreHorizontal, Plus } from 'lucide-react';

interface CreateTicketFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type TeamOption = { id: string; name: string };

export function CreateTicketForm({ onClose, onSuccess }: CreateTicketFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const [htmlContent, setHtmlContent] = useState('');

  useEffect(() => {
    api<TeamOption[]>('/teams')
      .then(res => setTeams(Array.isArray(res) ? res : []))
      .catch(console.error);
  }, []);

  const handleCommand = (command: string) => {
    document.execCommand(command, false, undefined);
    if (editorRef.current) {
      setHtmlContent(editorRef.current.innerHTML);
    }
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    setSaving(true);
    setError('');
    
    try {
      await api('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          customerId: String(data.get('customerId')),
          title: String(data.get('title')),
          description: htmlContent || String(data.get('description') || ''),
          priority: 'medium',
          departmentId: String(data.get('departmentId')) || undefined,
        }),
      });
      toast.success('Đã gửi ticket thành công');
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi khi tạo ticket');
      toast.error('Không thể tạo ticket');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full bg-white min-h-0">
      <div className="bg-primary px-6 py-5 flex items-center gap-4 text-primary-foreground shrink-0">
        <button type="button" onClick={onClose} className="flex items-center gap-1.5 rounded-md border border-white/40 px-3 py-1.5 text-sm font-medium hover:bg-white/10 transition-colors">
          <ArrowLeft size={16} /> Quay lại
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Type size={20} /> Thêm mới Ticket
          </h1>
          <p className="text-sm text-white/80 mt-0.5">Gửi yêu cầu hỗ trợ đến B-ACE</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 overflow-y-auto space-y-6 min-h-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mb-2">
              <span className="w-1 h-4 bg-primary rounded-sm"></span>
              Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input name="title" required className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Mô tả ngắn gọn vấn đề của bạn" />
          </div>

          <div>
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mb-2">
              <span className="w-1 h-4 bg-primary rounded-sm"></span>
              Chọn phòng ban <span className="text-red-500">*</span>
            </label>
            <select name="departmentId" required className="h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none">
              <option value="">Chọn phòng ban...</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mb-1">
            <span className="w-1 h-4 bg-primary rounded-sm"></span>
            Nội dung chi tiết <span className="text-red-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mb-2">Mô tả rõ vấn đề, bước tái hiện và thông tin liên quan để được hỗ trợ nhanh hơn.</p>
          
          <div className="border border-slate-300 rounded-md overflow-hidden focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
            <div className="flex flex-wrap items-center gap-1 border-b border-slate-300 bg-slate-50 p-2 text-slate-600">
              <button type="button" onClick={() => handleCommand('undo')} className="p-1.5 hover:bg-slate-200 rounded"><RotateCcw size={16} /></button>
              <button type="button" onClick={() => handleCommand('redo')} className="p-1.5 hover:bg-slate-200 rounded"><RotateCw size={16} /></button>
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <button type="button" onClick={() => handleCommand('bold')} className="p-1.5 font-bold hover:bg-slate-200 rounded"><Bold size={16} /></button>
              <button type="button" onClick={() => handleCommand('italic')} className="p-1.5 italic hover:bg-slate-200 rounded"><Italic size={16} /></button>
              <button type="button" onClick={() => handleCommand('underline')} className="p-1.5 underline hover:bg-slate-200 rounded"><Underline size={16} /></button>
              <div className="w-px h-4 bg-slate-300 mx-1"></div>
              <button type="button" onClick={() => handleCommand('justifyLeft')} className="p-1.5 hover:bg-slate-200 rounded"><AlignLeft size={16} /></button>
              <button type="button" onClick={() => handleCommand('justifyCenter')} className="p-1.5 hover:bg-slate-200 rounded"><AlignCenter size={16} /></button>
              <button type="button" onClick={() => handleCommand('justifyRight')} className="p-1.5 hover:bg-slate-200 rounded"><AlignRight size={16} /></button>
              <button type="button" onClick={() => handleCommand('insertUnorderedList')} className="p-1.5 hover:bg-slate-200 rounded"><List size={16} /></button>
            </div>
            <div 
              ref={editorRef}
              contentEditable
              onInput={(e) => setHtmlContent(e.currentTarget.innerHTML)}
              className="min-h-[200px] w-full p-4 text-sm outline-none overflow-y-auto"
              data-placeholder="Nhập nội dung..."
            />
            <style jsx>{`
              [contentEditable]:empty:before {
                content: attr(data-placeholder);
                color: #94a3b8;
                pointer-events: none;
                display: block;
              }
            `}</style>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
              <span className="w-1 h-4 bg-primary rounded-sm"></span>
              Tệp đính kèm
            </label>
            <button type="button" className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary text-primary px-3 text-xs font-medium hover:bg-primary/5">
              <Plus size={14} /> Thêm (1/5)
            </button>
          </div>
          <p className="text-xs text-slate-500 mb-3">Hỗ trợ ảnh, PDF, Word, Excel, ZIP — tối đa 10MB/file</p>
          
          <div className="flex items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50/50 p-3">
            <div className="inline-flex items-center gap-2 rounded bg-white px-3 py-1.5 border border-slate-200 shadow-sm text-sm font-medium">
              <Paperclip size={14} className="text-slate-500" /> File #1
            </div>
            <span className="text-sm text-slate-500">Chưa chọn file</span>
          </div>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 mb-2">
            <span className="w-1 h-4 bg-primary rounded-sm"></span>
            Khách hàng liên kết <span className="text-red-500">*</span>
          </label>
          <CustomerSelect name="customerId" required />
        </div>

        {error && <p className="text-sm text-red-500 font-medium bg-red-50 p-3 rounded-md">{error}</p>}
      </form>

      <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-3 shrink-0">
        <button type="submit" form="create-ticket-form" onClick={() => {}} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-colors">
          <Send size={16} /> {saving ? 'Đang gửi...' : 'Gửi Ticket'}
        </button>
        <button type="button" onClick={onClose} className="inline-flex h-10 items-center justify-center rounded-md border border-slate-300 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          Hủy
        </button>
      </div>
    </div>
  );
}