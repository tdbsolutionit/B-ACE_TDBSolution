export type CompanyForm = {
    name: string; taxCode: string; email: string; phone: string; website: string;
    address: string; logoUrl: string; bankName: string; bankAccount: string;
    bankOwner: string; directorName: string; quoteTerms: string; quoteNotes: string;
    quoteUnit: string; timezone: string; currency: string; language: string; dateFormat: string;
};

export type FieldErrors = Partial<Record<keyof CompanyForm, string>>;
export type Status = { type: 'success'; title: string } | { type: 'error'; title: string; details: string[] } | null;

export const INITIAL_COMPANY: CompanyForm = {
    name: '', taxCode: '', email: '', phone: '', website: '', address: '', logoUrl: '',
    bankName: '', bankAccount: '', bankOwner: '', directorName: '', quoteTerms: '',
    quoteNotes: '', quoteUnit: 'Gói', timezone: 'Asia/Ho_Chi_Minh', currency: 'VND',
    language: 'vi', dateFormat: 'DD/MM/YYYY',
};

export const FIELD_LABELS: Record<keyof CompanyForm, string> = {
    name: 'Tên công ty', taxCode: 'Mã số thuế', email: 'Email liên hệ', phone: 'Số điện thoại',
    website: 'Website', address: 'Địa chỉ', logoUrl: 'Logo', bankName: 'Tên ngân hàng',
    bankAccount: 'Số tài khoản', bankOwner: 'Chủ tài khoản', directorName: 'Tên giám đốc',
    quoteTerms: 'Điều khoản thanh toán', quoteNotes: 'Ghi chú', quoteUnit: 'Đơn vị tính mặc định',
    timezone: 'Múi giờ', currency: 'Tiền tệ', language: 'Ngôn ngữ', dateFormat: 'Định dạng ngày',
};

export const NOTIFICATIONS = [
    { key: 'newLead', title: 'Khách hàng tiềm năng mới', desc: 'Khi có lead mới từ form hoặc tích hợp' },
    { key: 'taskDue', title: 'Nhiệm vụ sắp đến hạn', desc: 'Nhắc trước 1 giờ so với hạn xử lý' },
    { key: 'stageChange', title: 'Cơ hội thay đổi giai đoạn', desc: 'Khi cơ hội của bạn được chuyển giai đoạn' },
    { key: 'weeklyReport', title: 'Báo cáo tuần qua email', desc: 'Gửi vào sáng thứ Hai hàng tuần' },
] as const;

export type NotificationKey = (typeof NOTIFICATIONS)[number]['key'];

export function toForm(data: Partial<Record<keyof CompanyForm, string | null>>): CompanyForm {
    return { ...INITIAL_COMPANY, ...Object.fromEntries(Object.entries(data).filter(([, v]) => v != null)) };
}

export function toPayload(form: CompanyForm) {
    return Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || undefined]));
}

function translateValidation(raw: string): { field?: keyof CompanyForm; text: string } {
    const field = (Object.keys(FIELD_LABELS) as (keyof CompanyForm)[]).find((k) => raw.startsWith(`${k} `));
    const label = field ? FIELD_LABELS[field] : 'Trường này';
    let m: RegExpMatchArray | null;

    if (/must be an email/.test(raw)) return { field, text: `${label} không hợp lệ` };
    if ((m = raw.match(/shorter than or equal to (\d+) characters/))) return { field, text: `${label} tối đa ${m[1]} ký tự` };
    if ((m = raw.match(/longer than or equal to (\d+) characters/))) return { field, text: `${label} tối thiểu ${m[1]} ký tự` };
    if (/should not be empty/.test(raw)) return { field, text: `${label} không được để trống` };
    return { field, text: raw };
}

export function parseApiError(error: unknown): { title: string; details: string[]; fields: FieldErrors } {
    const fallback = 'Không lưu được thông tin công ty. Vui lòng thử lại.';
    if (!(error instanceof Error)) return { title: fallback, details: [], fields: {} };

    let body: { message?: string | string[]; statusCode?: number };
    try { body = JSON.parse(error.message); } catch { return { title: error.message || fallback, details: [], fields: {} }; }

    const raws = Array.isArray(body.message) ? body.message : body.message ? [body.message] : [];
    const fields: FieldErrors = {};
    const details: string[] = [];

    for (const raw of raws) {
        const { field, text } = translateValidation(raw);
        if (field) {
            if (fields[field]) continue;
            fields[field] = text;
        }
        details.push(text);
    }

    return { title: details.length ? 'Vui lòng kiểm tra lại thông tin' : fallback, details, fields };
}