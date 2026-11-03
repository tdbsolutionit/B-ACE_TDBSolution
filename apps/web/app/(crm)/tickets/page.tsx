'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast';
import { Ticket, Search, Plus, RotateCw, Lock, MessageSquare, MoreHorizontal, Clock, CheckCircle2 } from 'lucide-react';
import { CreateTicketForm } from './_components/create-ticket-form';
import { CustomerSelect } from '@/components/shared/customer-select';
import { Modal } from '@/components/ui/modal';

type TicketRow = {
  id: string;
  code: string;
  title: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  customer: { id: string; name: string; company: string };
  assignedTo?: string | null;
  assigneeName?: string | null;
  department?: string;
  replyCount?: number;
};

const TICKET_TABS = [
  { id: 'all', label: 'Tất cả', icon: Ticket, color: 'gray' },
  { id: 'open', label: 'Đang chờ', icon: Clock, color: 'orange' },
  { id: 'in_progress', label: 'Đang xử lý', icon: RotateCw, color: 'blue' },
  { id: 'resolved', label: 'Hoàn thành', icon: CheckCircle2, color: 'green' },
] as const;

export default function TicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState('');

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setLoading(true);
      const res = await api<TicketRow[]>('/tickets');
      setTickets(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      let matchStatus = false;
      if (statusFilter === 'all') matchStatus = true;
      else if (statusFilter === 'resolved') matchStatus = ticket.status === 'resolved' || ticket.status === 'closed';
      else matchStatus = ticket.status === statusFilter;

      const matchSearch = 
        ticket.title.toLowerCase().includes(q.toLowerCase()) ||
        ticket.code.toLowerCase().includes(q.toLowerCase()) ||
        ticket.customer.name.toLowerCase().includes(q.toLowerCase());
        
      return matchStatus && matchSearch;
    });
  }, [tickets, statusFilter, q]);

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      <div className="px-6 pt-6 pb-2">
        <h1 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <Ticket className="text-teal-600" size={28} /> Danh sách Ticket
        </h1>
        <p className="mt-1 text-sm text-slate-500">Quản lý và theo dõi toàn bộ yêu cầu hỗ trợ của bạn</p>
      </div>

      <div className="px-6 py-4 flex flex-wrap items-center gap-2">
        {TICKET_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = statusFilter === tab.id;
          
          let activeClass = 'bg-slate-800 text-white border-slate-800';
          if (tab.color === 'orange') activeClass = 'bg-orange-500 text-white border-orange-500';
          if (tab.color === 'blue') activeClass = 'bg-blue-600 text-white border-blue-600';
          if (tab.color === 'green') activeClass = 'bg-green-600 text-white border-green-600';
          
          let inactiveClass = 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50';
          if (tab.color === 'orange') inactiveClass = 'bg-white border-orange-200 text-orange-600 hover:bg-orange-50';
          if (tab.color === 'blue') inactiveClass = 'bg-white border-blue-200 text-blue-600 hover:bg-blue-50';
          if (tab.color === 'green') inactiveClass = 'bg-white border-green-200 text-green-600 hover:bg-green-50';

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors border ${
                isActive ? activeClass : inactiveClass
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            className="h-9 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
            placeholder="Tìm theo mã ticket, tiêu đề..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select 
            className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 outline-none"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">Tất cả phòng ban</option>
            <option value="tech">Phòng Kỹ thuật</option>
            <option value="sales">Phòng Kinh doanh</option>
          </select>
          <button onClick={loadTickets} className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <RotateCw size={14} /> Làm mới
          </button>
          <button onClick={() => setOpen(true)} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90">
            <Plus size={16} /> Gửi ticket
          </button>
        </div>
      </div>

      <div className="px-6 pb-10 flex-1 overflow-auto">
        <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 w-12 text-center">STT</th>
                <th className="px-4 py-3">Mã Ticket</th>
                <th className="px-4 py-3">Tiêu Đề Ticket</th>
                <th className="px-4 py-3">Phòng ban</th>
                <th className="px-4 py-3 text-center">Trả lời</th>
                <th className="px-4 py-3">Hỗ Trợ Bởi</th>
                <th className="px-4 py-3">Trạng Thái</th>
                <th className="px-4 py-3">Lần Cuối</th>
                <th className="px-4 py-3 text-center w-12">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">Đang tải danh sách ticket...</td>
                </tr>
              ) : filteredTickets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">Không tìm thấy ticket nào phù hợp.</td>
                </tr>
              ) : (
                filteredTickets.map((ticket, index) => (
                  <tr 
                    key={ticket.id} 
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-blue-600"># {ticket.code}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 truncate max-w-[250px]" title={ticket.title}>
                      {ticket.title}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[13px]">{ticket.department || 'Phòng Kỹ thuật'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-600">
                        <MessageSquare size={12} /> {ticket.replyCount ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[13px]">{ticket.assigneeName || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        ticket.status === 'closed' || ticket.status === 'resolved' ? 'bg-slate-100 text-slate-600' :
                        ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {ticket.status === 'closed' && <Lock size={10} />}
                        {ticket.status === 'closed' ? 'Đã đóng' : 
                         ticket.status === 'resolved' ? 'Hoàn thành' :
                         ticket.status === 'in_progress' ? 'Đang xử lý' : 'Đang chờ'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[13px] flex items-center gap-1.5 mt-1">
                      <Clock size={12} className="text-slate-400" /> {new Date(ticket.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button type="button" className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-5xl h-[90vh] max-h-[90vh] overflow-hidden rounded-xl shadow-2xl bg-white flex flex-col">
              <CreateTicketForm
                onClose={() => setOpen(false)}
                onSuccess={() => {
                  setOpen(false);
                  loadTickets();
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}