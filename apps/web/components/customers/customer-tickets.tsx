'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { Plus, Ticket as TicketIcon } from 'lucide-react';

export function CustomerTickets({ customerId }: { customerId: string }) {
  const [tickets, setTickets] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  function load() {
    api<any[]>(`/tickets?customerId=${customerId}`)
      .then((res) => setTickets(Array.isArray(res) ? res : []))
      .catch(console.error);
  }

  useEffect(() => {
    load();
  }, [customerId]);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try {
      await api('/tickets', {
        method: 'POST',
        body: JSON.stringify({
          customerId,
          title: String(data.get('title')),
          description: String(data.get('description')),
          priority: String(data.get('priority')),
        }),
      });
      toast.success('Đã tạo ticket');
      setOpen(false);
      load();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="mt-6 border-t pt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <TicketIcon size={18} className="text-primary" /> Lịch sử Hỗ trợ (Tickets)
        </h3>
        <button onClick={() => setOpen(true)} className="flex items-center gap-1 text-sm bg-primary text-white px-3 py-1.5 rounded-md hover:bg-primary/90">
          <Plus size={16} /> Tạo Ticket
        </button>
      </div>

      {tickets.length === 0 ? (
        <p className="text-sm text-muted-foreground">Khách hàng này chưa gửi ticket nào.</p>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div>
                <p className="font-semibold text-sm">
                  <span className="font-mono text-xs text-muted-foreground mr-2">{t.code}</span>
                  {t.title}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(t.createdAt).toLocaleDateString('vi-VN')}</p>
              </div>
              <span className="text-xs font-semibold px-2 py-1 rounded bg-muted">{t.status}</span>
            </div>
          ))}
        </div>
      )}

      {open && (
        <>
          <div className="modal-backdrop" onClick={() => setOpen(false)} />
          <form className="modal-card" onSubmit={create}>
            <h2 className="text-base font-semibold">Tạo Ticket mới</h2>
            <div className="mt-4 space-y-4">
              <input name="title" required placeholder="Tiêu đề sự cố..." className="h-10 w-full rounded-md border px-3 text-sm" />
              <textarea name="description" placeholder="Mô tả chi tiết..." className="w-full rounded-md border p-3 text-sm min-h-[100px]" />
              <select name="priority" className="crm-select">
                <option value="low">Thấp</option>
                <option value="medium">Bình thường</option>
                <option value="high">Cao</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 border rounded-md text-sm">Hủy</button>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md text-sm">Tạo</button>
              </div>
            </div>
          </form>
        </>
      )}
    </div>
  );
}