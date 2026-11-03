'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import Link from 'next/link';
import { ChevronRight, Mail, Clock, Shield, Building2, CalendarDays, Lock, User } from 'lucide-react';
import { UserSelect } from '@/components/shared/user-select';
import { ActivityForm } from '@/components/shared/activity-form';
import { initials } from '@/lib/utils';

type TicketDetail = {
  id: string;
  code: string;
  title: string;
  description: string | null;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  assignedTo: string | null;
  assigneeName: string | null;
  customer: { id: string; name: string; company: string | null; phone: string | null; email: string | null };
  activities: Array<{ id: string; subject: string; content: string | null; owner: string | null; createdAt: string }>;
};

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api<TicketDetail>(`/tickets/${params.id}`)
      .then(setTicket)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, [params.id]);

  async function updateTicket(data: any) {
    try {
      await api(`/tickets/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      toast.success('Đã cập nhật ticket');
      load();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi cập nhật');
    }
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Đang tải ticket...</div>;
  if (error || !ticket) return <div className="p-8 text-center text-red-500">{error || 'Không tìm thấy ticket'}</div>;

  const isClosed = ticket.status === 'closed';

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/tickets" className="hover:text-foreground">Danh sách Ticket</Link>
        <ChevronRight size={12} />
        <span className="font-medium text-foreground">{ticket.code}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="border-b border-border p-5 flex flex-wrap items-center gap-4 bg-muted/5">
              <span className="avatar-initials inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-lg font-bold">
                {initials(ticket.customer.name)}
              </span>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg font-bold">{ticket.customer.name}</h1>
                  <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">
                    Khách hàng
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail size={12} /> {ticket.customer.email || 'Chưa có email'}</span>
                  <span className="flex items-center gap-1"><Clock size={12} /> {new Date(ticket.createdAt).toLocaleString('vi-VN')}</span>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="rounded-lg border border-border bg-muted/10 p-5 whitespace-pre-wrap text-sm leading-relaxed">
                {ticket.description || <span className="text-muted-foreground italic">Không có mô tả chi tiết.</span>}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Lịch sử phản hồi
            </h2>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
              {ticket.activities.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Chưa có phản hồi nào.</p>
              )}
              
              {ticket.activities.map((act, index) => {
                const isFirstOfDay = index === 0 || new Date(act.createdAt).toDateString() !== new Date(ticket.activities[index - 1].createdAt).toDateString();
                return (
                  <div key={act.id} className="relative flex flex-col gap-2">
                    {isFirstOfDay && (
                      <div className="flex items-center justify-center my-2">
                        <span className="bg-card border border-border px-3 py-1 text-xs font-medium text-muted-foreground rounded-full relative z-10">
                          {new Date(act.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex gap-4 relative z-10">
                      <span className="avatar-initials inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-red-500 text-white text-sm font-bold shadow-sm">
                        {initials(act.owner || 'Admin')}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-sm font-bold">{act.owner || 'Hệ thống'}</span>
                          <span className="text-[11px] text-muted-foreground">{new Date(act.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="rounded-xl rounded-tl-none border border-border bg-muted/20 p-4 shadow-sm">
                          <p className="text-sm font-semibold mb-1">{act.subject}</p>
                          {act.content && <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{act.content}</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {!isClosed && (
              <div className="mt-8 pt-6 border-t border-border">
                <h3 className="text-sm font-semibold mb-3">Trả lời khách hàng</h3>
                <ActivityForm 
                  relatedType="ticket" 
                  relatedId={ticket.id} 
                  onSaved={load} 
                />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm sticky top-6">
            <h3 className="text-base font-bold flex items-center gap-2 mb-6">
              <Shield size={18} className="text-primary" /> Thông tin Phiếu hỗ trợ
            </h3>
            
            <div className="space-y-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Người gửi</p>
                <p className="font-semibold text-sm">{ticket.customer.name}</p>
                <p className="text-xs text-muted-foreground">{ticket.customer.email}</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Bộ phận</p>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <Building2 size={14} className="text-muted-foreground" /> Hỗ trợ kỹ thuật
                </p>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Trạng thái</p>
                <select 
                  className={`h-8 rounded-md px-2 py-1 text-xs font-semibold border-none outline-none cursor-pointer w-full ${
                    isClosed ? 'bg-muted text-muted-foreground' : 
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}
                  value={ticket.status} 
                  disabled={isClosed}
                  onChange={(e) => updateTicket({ status: e.target.value })}
                >
                  <option value="open">Mới</option>
                  <option value="in_progress">Đang xử lý</option>
                  <option value="resolved">Đã xong</option>
                  <option value="closed">Đã đóng</option>
                </select>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Độ ưu tiên</p>
                <select 
                  className="h-8 rounded-md px-2 py-1 text-xs font-semibold border-none outline-none cursor-pointer bg-muted/50 w-full"
                  value={ticket.priority} 
                  disabled={isClosed}
                  onChange={(e) => updateTicket({ priority: e.target.value })}
                >
                  <option value="low">Thấp</option>
                  <option value="medium">Bình thường</option>
                  <option value="high">Cao</option>
                  <option value="urgent">Khẩn cấp</option>
                </select>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Người phụ trách</p>
                <UserSelect 
                  name="assignedTo" 
                  defaultValue={ticket.assignedTo || ''} 
                  defaultLabel="-- Chưa phân công --"
                  disabled={isClosed}
                  onChange={(e) => updateTicket({ assignedTo: e.target.value })}
                />
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Đã gửi</p>
                <p className="font-semibold text-sm flex items-center gap-2">
                  <CalendarDays size={14} className="text-muted-foreground" /> {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-border">
              {isClosed ? (
                <button disabled className="w-full flex items-center justify-center gap-2 rounded-lg bg-muted py-2.5 text-sm font-semibold text-muted-foreground cursor-not-allowed">
                  <Lock size={16} /> Ticket đã được đóng
                </button>
              ) : (
                <button onClick={() => updateTicket({ status: 'closed' })} className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                  <Lock size={16} /> Đóng Ticket này
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}