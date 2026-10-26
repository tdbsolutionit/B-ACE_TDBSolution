'use client';

import { UploadCloud } from 'lucide-react';
import { CompanyForm, FieldErrors } from './settings-utils';
import { Card, Field, inputCls } from './SettingsUI';

interface CompanySectionProps {
    form: CompanyForm;
    errors: FieldErrors;
    onChange: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void;
    onLogoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    uploadingLogo: boolean;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    canEdit: boolean;
}

export function CompanySection({ form, errors, onChange, onLogoUpload, uploadingLogo, fileInputRef, canEdit }: CompanySectionProps) {
    return (
        <div className="space-y-6">
            <fieldset disabled={!canEdit} className="contents">
                <Card title="Thông tin cơ bản" description="Thông tin này sẽ hiển thị trên các file Báo giá, Đề xuất xuất ra PDF.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tên công ty *" error={errors.name}>
                            {(id) => <input id={id} className={inputCls} value={form.name} onChange={(e) => onChange('name', e.target.value)} placeholder="VD: Công ty TNHH ABC" />}
                        </Field>
                        <Field label="Mã số thuế" error={errors.taxCode}>
                            {(id) => <input id={id} className={inputCls} value={form.taxCode} onChange={(e) => onChange('taxCode', e.target.value)} placeholder="VD: 0318137951" />}
                        </Field>
                        <Field label="Email liên hệ" error={errors.email}>
                            {(id) => <input id={id} type="email" className={inputCls} value={form.email} onChange={(e) => onChange('email', e.target.value)} placeholder="email@congty.vn" />}
                        </Field>
                        <Field label="Số điện thoại" error={errors.phone}>
                            {(id) => <input id={id} type="tel" className={inputCls} value={form.phone} onChange={(e) => onChange('phone', e.target.value)} placeholder="0909 xxx xxx" />}
                        </Field>
                        <Field label="Website" error={errors.website}>
                            {(id) => <input id={id} className={inputCls} value={form.website} onChange={(e) => onChange('website', e.target.value)} placeholder="www.congty.vn" />}
                        </Field>
                        <Field label="Địa chỉ" error={errors.address}>
                            {(id) => <input id={id} className={inputCls} value={form.address} onChange={(e) => onChange('address', e.target.value)} placeholder="Số 1, Đường ABC, Quận X, TP.HCM" />}
                        </Field>
                    </div>
                </Card>

                <Card title="Thông tin thanh toán (In trên Báo giá)" description="Thông tin tài khoản ngân hàng của công ty bạn để khách hàng chuyển khoản.">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Tên ngân hàng" error={errors.bankName}>
                            {(id) => <input id={id} className={inputCls} value={form.bankName} onChange={(e) => onChange('bankName', e.target.value)} placeholder="VD: Ngân Hàng TMCP và PT VN CN Gia Định (BIDV)" />}
                        </Field>
                        <Field label="Số tài khoản" error={errors.bankAccount}>
                            {(id) => <input id={id} className={inputCls} value={form.bankAccount} onChange={(e) => onChange('bankAccount', e.target.value)} placeholder="VD: 8601216868" />}
                        </Field>
                        <Field label="Chủ tài khoản" error={errors.bankOwner}>
                            {(id) => <input id={id} className={inputCls} value={form.bankOwner} onChange={(e) => onChange('bankOwner', e.target.value)} placeholder="VD: CÔNG TY TNHH ..." />}
                        </Field>
                    </div>
                </Card>

                <Card title="Logo công ty" description="Hiển thị ở góc trên cùng của file PDF Báo giá. (PNG, JPG tối đa 2MB)">
                    <div className="flex items-center gap-4">
                        {form.logoUrl ? (
                            <div className="relative rounded-lg border bg-white p-2">
                                <img src={form.logoUrl} alt="Logo" className="h-16 object-contain" />
                                <button type="button" onClick={() => onChange('logoUrl', '')} className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200">✕</button>
                            </div>
                        ) : (
                            <div className="flex h-20 w-48 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-slate-500">
                                <UploadCloud size={20} className="mb-1" />
                                <span className="text-xs font-medium">Chưa có logo</span>
                            </div>
                        )}
                        <div>
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/svg+xml" onChange={onLogoUpload} />
                            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingLogo} className="text-sm font-semibold text-[#0B6E78] hover:underline disabled:opacity-50">
                                {uploadingLogo ? 'Đang tải lên...' : 'Chọn file từ máy tính'}
                            </button>
                            <p className="text-xs text-slate-500 mt-1">Hoặc kéo thả ảnh vào đây</p>
                        </div>
                    </div>
                </Card>

                <Card title="Nội dung Báo giá / Đề xuất" description="Tùy chỉnh các điều khoản và chữ ký in trên file PDF.">
                    <div className="grid gap-4">
                        <Field label="Tên người ký (Giám đốc)" error={errors.directorName}>
                            {(id) => <input id={id} className={inputCls} value={form.directorName} onChange={(e) => onChange('directorName', e.target.value)} placeholder="VD: Nguyễn Văn A" />}
                        </Field>
                        
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Điều khoản thanh toán" error={errors.quoteTerms}>
                                {(id) => <textarea id={id} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]" rows={4} value={form.quoteTerms} onChange={(e) => onChange('quoteTerms', e.target.value)} placeholder="VD:&#10;- Thanh toán 50% khi ký hợp đồng.&#10;- Thanh toán 50% khi nghiệm thu." />}
                            </Field>
                            <Field label="Ghi chú thêm (Chân trang)" error={errors.quoteNotes}>
                                {(id) => <textarea id={id} className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]" rows={4} value={form.quoteNotes} onChange={(e) => onChange('quoteNotes', e.target.value)} placeholder="VD: Báo giá có hiệu lực trong vòng 15 ngày." />}
                            </Field>
                        </div>

                        <div className="sm:w-1/2 sm:pr-2">
                            <Field label="Đơn vị tính mặc định" error={errors.quoteUnit}>
                                {(id) => <input id={id} className={inputCls} value={form.quoteUnit} onChange={(e) => onChange('quoteUnit', e.target.value)} placeholder="VD: Gói, Bộ, Cái, Tháng..." />}
                            </Field>
                        </div>
                    </div>
                </Card>
             </fieldset>
        </div>
    );
}