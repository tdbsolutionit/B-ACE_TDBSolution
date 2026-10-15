'use client';

import { useEffect, useId, useState } from 'react';
import { api } from '@/lib/auth';
import { UsersManagement } from '@/components/users/UsersManagement';
/* ---------- Types & data ---------- */



type SectionKey =
    | 'company'
    | 'users'
    | 'pipeline'
    | 'fields'
    | 'notifications'
    | 'security'
    | 'billing';

const SECTIONS: { key: SectionKey; label: string }[] = [
    { key: 'company', label: 'Thông tin công ty' },
    { key: 'users', label: 'Người dùng & phân quyền' },
    { key: 'pipeline', label: 'Pipeline & giai đoạn' },
    { key: 'fields', label: 'Trường tùy chỉnh' },
    { key: 'notifications', label: 'Thông báo' },
    { key: 'security', label: 'Bảo mật' },
    { key: 'billing', label: 'Gói & thanh toán' },
];

type CompanyForm = {
    name: string;
    taxCode: string;
    email: string;
    phone: string;
    timezone: string;
    currency: string;
    language: string;
    dateFormat: string;
};

const INITIAL_COMPANY: CompanyForm = {
    name: '',
    taxCode: '',
    email: '',
    phone: '',
    timezone: 'Asia/Ho_Chi_Minh',
    currency: 'VND',
    language: 'vi',
    dateFormat: 'DD/MM/YYYY',
};

type FieldErrors = Partial<Record<keyof CompanyForm, string>>;

type Status =
    | { type: 'success'; title: string }
    | { type: 'error'; title: string; details: string[] }
    | null;

const FIELD_LABELS: Record<keyof CompanyForm, string> = {
    name: 'Tên công ty',
    taxCode: 'Mã số thuế',
    email: 'Email liên hệ',
    phone: 'Số điện thoại',
    timezone: 'Múi giờ',
    currency: 'Tiền tệ',
    language: 'Ngôn ngữ',
    dateFormat: 'Định dạng ngày',
};

// API có thể trả null cho trường chưa nhập -> đổi về chuỗi rỗng
function toForm(data: Partial<Record<keyof CompanyForm, string | null>>): CompanyForm {
    return {
        ...INITIAL_COMPANY,
        ...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)),
    };
}

// Chuỗi rỗng -> undefined để backend bỏ qua trường tùy chọn
function toPayload(form: CompanyForm) {
    return Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]),
    );
}

function translateValidation(raw: string): { field?: keyof CompanyForm; text: string } {
    const field = (Object.keys(FIELD_LABELS) as (keyof CompanyForm)[]).find((k) =>
        raw.startsWith(`${k} `),
    );
    const label = field ? FIELD_LABELS[field] : 'Trường này';
    let m: RegExpMatchArray | null;

    if (/must be an email/.test(raw)) return { field, text: `${label} không hợp lệ` };
    if ((m = raw.match(/shorter than or equal to (\d+) characters/)))
        return { field, text: `${label} tối đa ${m[1]} ký tự` };
    if ((m = raw.match(/longer than or equal to (\d+) characters/)))
        return { field, text: `${label} tối thiểu ${m[1]} ký tự` };
    if (/should not be empty/.test(raw)) return { field, text: `${label} không được để trống` };
    return { field, text: raw };
}

function parseApiError(error: unknown): { title: string; details: string[]; fields: FieldErrors } {
    const fallback = 'Không lưu được thông tin công ty. Vui lòng thử lại.';
    if (!(error instanceof Error)) return { title: fallback, details: [], fields: {} };

    let body: { message?: string | string[]; statusCode?: number };
    try {
        body = JSON.parse(error.message);
    } catch {
        return { title: error.message || fallback, details: [], fields: {} };
    }

    const raws = Array.isArray(body.message) ? body.message : body.message ? [body.message] : [];
    const fields: FieldErrors = {};
    const details: string[] = [];

    for (const raw of raws) {
        const { field, text } = translateValidation(raw);
        if (field) {
            if (fields[field]) continue; // mỗi trường chỉ hiện 1 lỗi
            fields[field] = text;
        }
        details.push(text);
    }

    return {
        title: details.length ? 'Vui lòng kiểm tra lại thông tin' : fallback,
        details,
        fields,
    };
}

const NOTIFICATIONS = [
    { key: 'newLead', title: 'Khách hàng tiềm năng mới', desc: 'Khi có lead mới từ form hoặc tích hợp' },
    { key: 'taskDue', title: 'Nhiệm vụ sắp đến hạn', desc: 'Nhắc trước 1 giờ so với hạn xử lý' },
    { key: 'stageChange', title: 'Cơ hội thay đổi giai đoạn', desc: 'Khi cơ hội của bạn được chuyển giai đoạn' },
    { key: 'weeklyReport', title: 'Báo cáo tuần qua email', desc: 'Gửi vào sáng thứ Hai hàng tuần' },
] as const;

type NotificationKey = (typeof NOTIFICATIONS)[number]['key'];

/* ---------- Small UI pieces ---------- */

const inputCls =
    'h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 ' +
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78] focus-visible:ring-offset-1 ' +
    'aria-[invalid=true]:border-red-500';

function Card({
    title,
    description,
    danger,
    children,
}: {
    title: string;
    description: string;
    danger?: boolean;
    children: React.ReactNode;
}) {
    return (
        <section
            className={`rounded-xl border bg-white p-6 ${danger ? 'border-red-200' : 'border-slate-200'}`}
        >
            <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
            <p className="mb-5 mt-1 text-[13px] text-slate-500">{description}</p>
            {children}
        </section>
    );
}

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: (id: string) => React.ReactNode;
}) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-slate-900">
                {label}
            </label>
            {children(id)}
            {error && (
                <p id={`${id}-error`} className="mt-1.5 text-[13px] text-red-700">
                    {error}
                </p>
            )}
        </div>
    );
}

function Switch({
    checked,
    onChange,
    label,
}: {
    checked: boolean;
    onChange: (next: boolean) => void;
    label: string;
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            aria-label={label}
            onClick={() => onChange(!checked)}
            className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78] focus-visible:ring-offset-2 ${checked ? 'bg-[#0B6E78]' : 'bg-slate-300'
                }`}
        >
            <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''
                    }`}
            />
        </button>
    );
}

/* ---------- Sections ---------- */

function CompanySection({
    form,
    errors,
    onChange,
}: {
    form: CompanyForm;
    errors: FieldErrors;
    onChange: <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => void;
}) {
    return (
        <Card
            title="Thông tin công ty"
            description="Hiển thị trên báo giá, email và hóa đơn gửi khách hàng."
        >
            <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tên công ty" error={errors.name}>
                    {(id) => (
                        <input
                            id={id}
                            className={inputCls}
                            value={form.name}
                            aria-invalid={!!errors.name}
                            aria-describedby={errors.name ? `${id}-error` : undefined}
                            onChange={(e) => onChange('name', e.target.value)}
                            placeholder="Tên công ty"
                        />
                    )}
                </Field>
                <Field label="Mã số thuế" error={errors.taxCode}>
                    {(id) => (
                        <input
                            id={id}
                            className={inputCls}
                            value={form.taxCode}
                            aria-invalid={!!errors.taxCode}
                            aria-describedby={errors.taxCode ? `${id}-error` : undefined}
                            onChange={(e) => onChange('taxCode', e.target.value)}
                            placeholder="Mã số thuế"
                        />
                    )}
                </Field>
                <Field label="Email liên hệ" error={errors.email}>
                    {(id) => (
                        <input
                            id={id}
                            type="email"
                            className={inputCls}
                            value={form.email}
                            aria-invalid={!!errors.email}
                            aria-describedby={errors.email ? `${id}-error` : undefined}
                            onChange={(e) => onChange('email', e.target.value)}
                            placeholder="email@congty.vn"
                        />
                    )}
                </Field>
                <Field label="Số điện thoại" error={errors.phone}>
                    {(id) => (
                        <input
                            id={id}
                            type="tel"
                            className={inputCls}
                            value={form.phone}
                            aria-invalid={!!errors.phone}
                            aria-describedby={errors.phone ? `${id}-error` : undefined}
                            onChange={(e) => onChange('phone', e.target.value)}
                            placeholder="Số điện thoại"
                        />
                    )}
                </Field>
                <Field label="Múi giờ" error={errors.timezone}>
                    {(id) => (
                        <select
                            id={id}
                            className={inputCls}
                            value={form.timezone}
                            aria-invalid={!!errors.timezone}
                            onChange={(e) => onChange('timezone', e.target.value)}
                        >
                            <option value="Asia/Ho_Chi_Minh">(GMT+7) Hồ Chí Minh</option>
                            <option value="Asia/Bangkok">(GMT+7) Bangkok</option>
                            <option value="Asia/Singapore">(GMT+8) Singapore</option>
                        </select>
                    )}
                </Field>
                <Field label="Tiền tệ mặc định" error={errors.currency}>
                    {(id) => (
                        <select
                            id={id}
                            className={inputCls}
                            value={form.currency}
                            aria-invalid={!!errors.currency}
                            onChange={(e) => onChange('currency', e.target.value)}
                        >
                            <option value="VND">VND – Việt Nam Đồng</option>
                            <option value="USD">USD – Đô la Mỹ</option>
                        </select>
                    )}
                </Field>
                <Field label="Ngôn ngữ giao diện" error={errors.language}>
                    {(id) => (
                        <select
                            id={id}
                            className={inputCls}
                            value={form.language}
                            aria-invalid={!!errors.language}
                            onChange={(e) => onChange('language', e.target.value)}
                        >
                            <option value="vi">Tiếng Việt</option>
                            <option value="en">English</option>
                        </select>
                    )}
                </Field>
                <Field label="Định dạng ngày" error={errors.dateFormat}>
                    {(id) => (
                        <select
                            id={id}
                            className={inputCls}
                            value={form.dateFormat}
                            aria-invalid={!!errors.dateFormat}
                            onChange={(e) => onChange('dateFormat', e.target.value)}
                        >
                            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                        </select>
                    )}
                </Field>
            </div>
        </Card>
    );
}

function NotificationSection({
    values,
    onToggle,
}: {
    values: Record<NotificationKey, boolean>;
    onToggle: (key: NotificationKey, next: boolean) => void;
}) {
    return (
        <Card title="Thông báo" description="Chọn sự kiện bạn muốn nhận thông báo.">
            <ul>
                {NOTIFICATIONS.map((n) => (
                    <li
                        key={n.key}
                        className="flex items-center justify-between gap-4 border-t border-slate-100 py-3.5"
                    >
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                            <p className="mt-0.5 text-[13px] text-slate-500">{n.desc}</p>
                        </div>
                        <Switch
                            checked={values[n.key]}
                            onChange={(next) => onToggle(n.key, next)}
                            label={n.title}
                        />
                    </li>
                ))}
            </ul>
        </Card>
    );
}

function ComingSoon({ label }: { label: string }) {
    return (
        <Card title={label} description="Mục này chưa có nội dung.">
            <p className="text-sm text-slate-600">Thêm form cho mục này tại đây.</p>
        </Card>
    );
}

function StatusBanner({ status, onClose }: { status: NonNullable<Status>; onClose: () => void }) {
    const isError = status.type === 'error';
    return (
        <div
            role={isError ? 'alert' : 'status'}
            className={`mb-6 flex items-start justify-between gap-3 rounded-lg border px-4 py-3 text-sm ${isError
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}
        >
            <div>
                <p className="font-semibold">{status.title}</p>
                {status.type === 'error' && status.details.length > 0 && (
                    <ul className="mt-1 list-disc pl-5">
                        {status.details.map((d) => (
                            <li key={d}>{d}</li>
                        ))}
                    </ul>
                )}
            </div>
            <button
                type="button"
                onClick={onClose}
                className="shrink-0 font-semibold underline underline-offset-2"
            >
                Đóng
            </button>
        </div>
    );
}

/* ---------- Page ---------- */

export default function SettingsPage() {
    const [active, setActive] = useState<SectionKey>('company');
    const [company, setCompany] = useState<CompanyForm>(INITIAL_COMPANY);
    const [notify, setNotify] = useState<Record<NotificationKey, boolean>>({
        newLead: true,
        taskDue: true,
        stageChange: false,
        weeklyReport: true,
    });
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<Status>(null);
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

    const updateCompany = <K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) => {
        setCompany((prev) => ({ ...prev, [key]: value }));
        setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
    };

    async function handleSave() {
        setSaving(true);
        setStatus(null);
        setFieldErrors({});

        try {
            const saved = await api<CompanyForm>('/settings', {
                method: 'PATCH',
                body: JSON.stringify(toPayload(company)),
            });
            setCompany(toForm(saved));
            setStatus({ type: 'success', title: 'Đã lưu thay đổi' });
        } catch (error) {
            const { title, details, fields } = parseApiError(error);
            setFieldErrors(fields);
            setStatus({ type: 'error', title, details });
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        let cancelled = false;

        async function loadCompanySettings() {
            try {
                const data = await api<CompanyForm>('/settings');
                if (!cancelled) setCompany(toForm(data));
            } catch {
                if (!cancelled) {
                    setStatus({
                        type: 'error',
                        title: 'Không tải được thông tin công ty.',
                        details: [],
                    });
                }
            }
        }

        void loadCompanySettings();

        return () => {
            cancelled = true;
        };
    }, []);

    const activeLabel = SECTIONS.find((s) => s.key === active)?.label ?? '';

    return (
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
            <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Cài đặt</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        Quản lý thông tin công ty, người dùng và quy tắc hoạt động của CRM.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="h-11 whitespace-nowrap rounded-lg bg-[#0B6E78] px-5 text-sm font-semibold text-white hover:bg-[#095a63] disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78] focus-visible:ring-offset-2"
                >
                    {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                </button>
            </header>

            {status && <StatusBanner status={status} onClose={() => setStatus(null)} />}

            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
                <nav
                    aria-label="Nhóm cài đặt"
                    className="flex gap-1 overflow-x-auto lg:w-56 lg:shrink-0 lg:flex-col lg:overflow-visible"
                >
                    {SECTIONS.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            onClick={() => setActive(s.key)}
                            aria-current={active === s.key ? 'page' : undefined}
                            className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === s.key
                                    ? 'bg-white font-semibold text-[#0B6E78] shadow-sm'
                                    : 'text-slate-700 hover:bg-slate-200/60'
                                }`}
                        >
                            {s.label}
                        </button>
                    ))}
                </nav>

                <div className="min-w-0 flex-1 space-y-6">
                    {active === 'company' && (
                        <>
                            <CompanySection form={company} errors={fieldErrors} onChange={updateCompany} />
                            <Card
                                title="Vùng nguy hiểm"
                                description="Các thao tác dưới đây không thể hoàn tác."
                                danger
                            >
                                <button
                                    type="button"
                                    className="h-11 rounded-lg border border-red-200 bg-white px-4 text-sm font-semibold text-red-700 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
                                >
                                    Xóa toàn bộ dữ liệu CRM
                                </button>
                            </Card>
                        </>
                    )}
                    {active === 'notifications' && (
                        <NotificationSection
                            values={notify}
                            onToggle={(key, next) => setNotify((prev) => ({ ...prev, [key]: next }))}
                        />
                    )}
                    {active === 'users' && <UsersManagement />}
                    {active !== 'company' && active !== 'notifications' && active !== 'users' && (
                        <ComingSoon label={activeLabel} />
                    )}
                </div>
            </div>
        </div>
    );
}