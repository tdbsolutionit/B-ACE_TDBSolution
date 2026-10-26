'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/auth';
import { usePermission } from '@/hooks/use-permission';
import { toast } from '@/components/ui/toast'; // <--- Import toast
import { UsersManagement } from '@/app/(crm)/settings/_components/UsersManagement';
import { PipelineSection } from '@/app/(crm)/settings/_components/PipelineSection';
import { TeamsManagement } from '@/app/(crm)/settings/_components/TeamsManagement';
import { RolesManagement } from '@/app/(crm)/settings/_components/RolesManagement';
import { SecuritySection } from '@/app/(crm)/settings/_components/SecuritySection';

import { CompanyForm, INITIAL_COMPANY, NotificationKey, toForm, toPayload, parseApiError } from '@/app/(crm)/settings/_components/settings-utils';
import { ComingSoon, Card } from '@/app/(crm)/settings/_components/SettingsUI'; // Bỏ StatusBanner
import { CompanySection } from '@/app/(crm)/settings/_components/CompanySection';
import { NotificationSection } from '@/app/(crm)/settings/_components/NotificationSection';

type SectionKey = 'company' | 'users' | 'pipeline' | 'teams' | 'roles' | 'fields' | 'notifications' | 'security' | 'billing';

const SECTIONS: { key: SectionKey; label: string }[] = [
    { key: 'company', label: 'Thông tin công ty' },
    { key: 'users', label: 'Người dùng & phân quyền' },
    { key: 'pipeline', label: 'Pipeline & giai đoạn' },
    { key: 'teams', label: 'Nhóm & nhân viên' },
    { key: 'roles', label: 'Vai trò & quyền hạn' },
    { key: 'fields', label: 'Trường tùy chỉnh' },
    { key: 'notifications', label: 'Thông báo' },
    { key: 'security', label: 'Bảo mật' },
    { key: 'billing', label: 'Gói & thanh toán' },
];

export default function SettingsPage() {
    const perm = usePermission();
    const canEdit = perm.has('setting:update');
    
    const [active, setActive] = useState<SectionKey>('company');
    const [company, setCompany] = useState<CompanyForm>(INITIAL_COMPANY);
    const [notify, setNotify] = useState<Record<NotificationKey, boolean>>({
        newLead: true, taskDue: true, stageChange: false, weeklyReport: true,
    });
    
    const [saving, setSaving] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<any>({});
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // --- LOAD DATA ---
    useEffect(() => {
        let cancelled = false;
        async function loadCompanySettings() {
            try {
                const data = await api<CompanyForm>('/tenants/me');
                if (!cancelled) setCompany(toForm(data));
            } catch (error) {
                // api() đã tự động hiển thị Toast lỗi, không cần làm gì thêm
                console.error(error);
            }
        }
        void loadCompanySettings();
        return () => { cancelled = true; };
    }, []);

    // --- HANDLERS ---
    const updateCompany = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
        setCompany((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev: any) => ({ ...prev, [key]: undefined }));
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Kích thước ảnh không được vượt quá 2MB');
            return;
        }

        setUploadingLogo(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await api<{ fileUrl: string }>('/files/upload', { method: 'POST', body: formData });
            if (!res || !res.fileUrl) throw new Error('API không trả về đường dẫn file');

            let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.103.8:3001';
            if (apiUrl.endsWith('/api')) apiUrl = apiUrl.replace('/api', '');

            updateCompany('logoUrl', `${apiUrl}${res.fileUrl}`);
            toast.success('Đã tải logo lên thành công');
        } catch (error) {
            // api() đã tự động hiển thị Toast lỗi
        } finally {
            setUploadingLogo(false);
            e.target.value = '';
        }
    };

    async function handleSaveCompany() {
        setSaving(true);
        setFieldErrors({});

        try {
            // Đặt tham số thứ 3 là `true` để tắt Toast lỗi tự động (vì ta sẽ hiện lỗi đỏ dưới input)
            const saved = await api<CompanyForm>('/tenants/me', {
                method: 'PATCH',
                body: JSON.stringify(toPayload(company)),
            }, true);
            
            setCompany(toForm(saved));
            toast.success('Đã lưu thay đổi thông tin công ty');
            window.dispatchEvent(new Event('tenant:updated'));
        } catch (error) {
            const { title, fields } = parseApiError(error);
            setFieldErrors(fields);
            
            // Nếu lỗi không phải do nhập liệu sai (không có lỗi ở field nào) -> Hiện Toast
            if (Object.keys(fields).length === 0) {
                toast.error(title || 'Không lưu được thông tin công ty');
            }
        } finally {
            setSaving(false);
        }
    }

    const activeLabel = SECTIONS.find((s) => s.key === active)?.label ?? '';

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
            <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cài đặt</h1>
                    <p className="mt-1 text-sm text-slate-500">Quản lý thông tin công ty, người dùng và quy tắc hoạt động của CRM.</p>
                </div>
                {active === 'company' && canEdit && (
                    <button type="button" onClick={handleSaveCompany} disabled={saving} className="h-11 whitespace-nowrap rounded-lg bg-[#0B6E78] px-5 text-sm font-semibold text-white hover:bg-[#095a63] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78] focus-visible:ring-offset-2">
                        {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                    </button>
                )}
            </header>

            {/* ĐÃ XÓA BANNER STATUS Ở ĐÂY */}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <nav aria-label="Nhóm cài đặt" className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible">
                    {SECTIONS.map((s) => (
                        <button key={s.key} type="button" onClick={() => setActive(s.key)} aria-current={active === s.key ? 'page' : undefined} className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === s.key ? 'bg-white font-semibold text-[#0B6E78] shadow-sm' : 'text-slate-700 hover:bg-slate-200/60'}`}>
                            {s.label}
                        </button>
                    ))}
                </nav>

                <div className="min-w-0 flex-1 space-y-6">
                    {active === 'company' && (
                        <>
                            <CompanySection form={company} errors={fieldErrors} onChange={updateCompany} onLogoUpload={handleLogoUpload} uploadingLogo={uploadingLogo} fileInputRef={fileInputRef} canEdit={canEdit} />
                            <Card title="Vùng nguy hiểm" description="Các thao tác dưới đây không thể hoàn tác." danger>
                                <button type="button" className="h-11 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2">
                                    Xóa toàn bộ dữ liệu CRM
                                </button>
                            </Card>
                        </>
                    )}
                    {active === 'notifications' && (
                        <NotificationSection values={notify} onToggle={(key, next) => setNotify((prev) => ({ ...prev, [key]: next }))} />
                    )}
                    {active === 'users' && <UsersManagement />}
                    {active === 'pipeline' && <PipelineSection />}
                    {active === 'teams' && <TeamsManagement />}
                    {active === 'roles' && <RolesManagement />}
                    {active === 'security' && <SecuritySection />}
                    {active !== 'company' && active !== 'notifications' && active !== 'users' && active !== 'pipeline' && active !== 'teams' && active !== 'roles' && active !== 'security' && (
                        <ComingSoon label={activeLabel} />
                    )}
                </div>
            </div>
        </div>
    );
}