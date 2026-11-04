'use client';
import { useState } from 'react';
import type { CustomerDetail, UpdateCustomerPayload } from '../../_types';

interface EditCustomerModalProps {
  customer: CustomerDetail;
  onClose: () => void;
  onSubmit: (payload: UpdateCustomerPayload) => Promise<void>;
}

export function EditCustomerModal({ customer, onClose, onSubmit }: EditCustomerModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload: UpdateCustomerPayload = {
      code: String(data.get('code') || ''),
      name: String(data.get('name') || ''),
      company: String(data.get('company') || ''),
      phone: String(data.get('phone') || ''),
      email: String(data.get('email') || ''),
      address: String(data.get('address') || ''),
      taxCode: String(data.get('taxCode') || ''),
      industry: String(data.get('industry') || ''),
      type: String(data.get('type') || 'business'),
      status: String(data.get('status') || 'lead'),
      sourceName: String(data.get('sourceName') || ''),
    };

    try {
      setSubmitting(true);
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <form className="modal-card max-w-2xl" onSubmit={handleSubmit}>
        <h2 className="text-lg font-semibold">Sửa thông tin khách hàng</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Cập nhật thông tin chi tiết của khách hàng.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Mã khách hàng</label>
            <input
              name="code"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.code || ''}
              placeholder="VD: KH00001"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">
              Tên gọi / Tên ngắn <span className="text-destructive">*</span>
            </label>
            <input
              required
              name="name"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.name}
              placeholder="VD: KDC"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Tên công ty đầy đủ</label>
            <input
              name="company"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.company || ''}
              placeholder="VD: CÔNG TY TNHH..."
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Số điện thoại</label>
            <input
              name="phone"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.phone || ''}
              placeholder="0909 xxx xxx"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.email || ''}
              placeholder="email@congty.vn"
            />
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Địa chỉ</label>
            <input
              name="address"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.address || ''}
              placeholder="Số nhà, đường, phường, quận..."
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Mã số thuế</label>
            <input
              name="taxCode"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.taxCode || ''}
              placeholder="Mã số thuế"
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Lĩnh vực / Ngành nghề</label>
            <input
              name="industry"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.industry || ''}
              placeholder="VD: Xây dựng, Công nghệ..."
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Loại khách</label>
            <select name="type" className="crm-select" defaultValue={customer.type}>
              <option value="business">Doanh nghiệp</option>
              <option value="personal">Cá nhân</option>
            </select>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium">Trạng thái</label>
            <select name="status" className="crm-select" defaultValue={customer.status}>
              <option value="lead">Lead</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Ngừng hoạt động</option>
            </select>
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <label className="text-sm font-medium">Nguồn khách hàng</label>
            <input
              name="sourceName"
              className="h-10 rounded-md border border-input px-3 text-sm"
              defaultValue={customer.sourceName || ''}
              placeholder="VD: Website, Giới thiệu, Zalo..."
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-border pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border px-4 text-sm hover:bg-accent"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Lưu thay đổi
          </button>
        </div>
      </form>
    </>
  );
}