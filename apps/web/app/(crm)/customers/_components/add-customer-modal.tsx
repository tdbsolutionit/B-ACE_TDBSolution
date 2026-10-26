'use client';

import { useState } from 'react';
import { api } from '@/lib/auth';
import { type CustomerRow } from '@/lib/crm';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/toast';

interface AddCustomerModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (newCustomer: CustomerRow) => void;
}

export function AddCustomerModal({ open, onClose, onSuccess }: AddCustomerModalProps) {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', company: '', phone: '', email: '', address: '',
    type: 'business' as 'individual' | 'business',
    status: 'active' as 'lead' | 'active' | 'inactive',
    sourceName: 'Website', taxCode: '', industry: '',
  });

  if (!open) return null;

  async function handleSubmit() {
    if (!form.name.trim()) {
      setError('Nhập tên khách hàng');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const created = await api<CustomerRow>('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          email: form.email,
          address: form.address,
          type: form.type === 'business' ? 'business' : 'personal',
          status: form.status,
          sourceName: form.sourceName,
          taxCode: form.taxCode,
          industry: form.industry,
        }),
      });
      
      toast.success(`Đã thêm ${created.name}`);
      onSuccess(created); // Trả data về cho parent
      onClose();
      
      // Reset form
      setForm({
        name: '', company: '', phone: '', email: '', address: '',
        type: 'business', status: 'active', sourceName: 'Website', taxCode: '', industry: '',
      });
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Không lưu được khách hàng');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card max-w-2xl">
        <h2 className="text-lg font-semibold">Thêm khách hàng</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chọn loại khách hàng và điền thông tin</p>
        
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setForm({ ...form, type: 'individual' })} className={`rounded-lg border-2 p-3 text-center ${form.type === 'individual' ? 'border-primary bg-primary/5' : 'border-input'}`}>
              <p className="text-sm font-semibold">Cá nhân</p>
            </button>
            <button type="button" onClick={() => setForm({ ...form, type: 'business' })} className={`rounded-lg border-2 p-3 text-center ${form.type === 'business' ? 'border-primary bg-primary/5' : 'border-input'}`}>
              <p className="text-sm font-semibold">Doanh nghiệp</p>
            </button>
          </div>

          <Input placeholder={form.type === 'business' ? 'Tên doanh nghiệp *' : 'Tên khách hàng *'} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          
          {form.type === 'business' && (
            <div className="grid grid-cols-2 gap-4">
              <Input placeholder="Mã số thuế" value={form.taxCode} onChange={(e) => setForm({ ...form, taxCode: e.target.value })} />
              <Input placeholder="Lĩnh vực" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input placeholder="Số điện thoại" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          
          <Input placeholder="Địa chỉ" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          
          <div className="grid grid-cols-2 gap-4">
            <select className="crm-select w-full" value={form.sourceName} onChange={(e) => setForm({ ...form, sourceName: e.target.value })}>
              {['Website', 'Zalo', 'Facebook', 'Email', 'Giới thiệu', 'Danh sách công ty'].map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="crm-select w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}>
              <option value="lead">Lead</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Đang lưu...' : 'Lưu'}</Button>
          </div>
        </div>
      </div>
    </>
  );
}