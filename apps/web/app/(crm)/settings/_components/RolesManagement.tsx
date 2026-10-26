'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/auth';
import { toast } from '@/components/ui/toast'; // Đảm bảo bạn đã có component toast

type Role = {
    id: string;
    name: string;
    description?: string | null;
    isSystem: boolean;
    permissionCodes: string[];
};

const MODULES = [
    { key: 'CUSTOMER', label: 'Khách hàng', actions: ['read', 'create', 'update', 'delete'] },
    { key: 'DEAL', label: 'Cơ hội (Deal)', actions: ['read', 'create', 'update', 'delete'] },
    { key: 'QUOTE', label: 'Báo giá', actions: ['read', 'create', 'update', 'delete'] },
    { key: 'TASK', label: 'Công việc', actions: ['read', 'create', 'update', 'delete'] },
    { key: 'USER', label: 'Người dùng', actions: ['read', 'create', 'update', 'delete'] },
    { key: 'SETTING', label: 'Cài đặt', actions: ['read', 'update'] },
];

const ACTION_LABELS: Record<string, string> = {
    read: 'Xem',
    create: 'Thêm',
    update: 'Sửa',
    delete: 'Xóa',
};

export function RolesManagement() {
    const [roles, setRoles] = useState<Role[]>([]);
    const [selected, setSelected] = useState<Role | null>(null);
    const [draftCodes, setDraftCodes] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [showCreate, setShowCreate] = useState(false);
    const [createForm, setCreateForm] = useState({ name: '', description: '' });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError(null);
                const data = await api<Role[]>('/roles');
                setRoles(data);
                if (data.length > 0) {
                    setSelected(data[0]);
                    // Đảm bảo không bị lỗi nếu API không trả về permissionCodes
                    setDraftCodes(data[0].permissionCodes ?? []); 
                }
            } catch (e) {
                setError('Không tải được danh sách vai trò.');
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        void load();
    }, []);

    useEffect(() => {
        setDraftCodes(selected?.permissionCodes ?? []);
        setDirty(false);
    }, [selected]);

    const toggle = (code: string) => {
        setDraftCodes((prev) => {
            const next = prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code];
            setDirty(true);
            return next;
        });
    };

    const toggleModule = (moduleKey: string, actions: string[], checked: boolean) => {
        const codes = actions.map((a) => `${moduleKey.toLowerCase()}:${a}`);
        setDraftCodes((prev) =>
            checked ? Array.from(new Set([...prev, ...codes])) : prev.filter((c) => !codes.includes(c)),
        );
        setDirty(true);
    };

    const handleSave = async () => {
        if (!selected) return;
        setSaving(true);
        try {
            await api(`/roles/${selected.id}/permissions`, {
                method: 'PUT',
                body: JSON.stringify({ permissions: draftCodes }),
            });
            
            // Cập nhật lại state local để UI đồng bộ ngay lập tức (không cần F5)
            setRoles((prev) =>
                prev.map((r) => (r.id === selected.id ? { ...r, permissionCodes: draftCodes } : r)),
            );
            setDirty(false);
            toast.success('Đã lưu phân quyền thành công!');
        } catch (e) {
            toast.error('Lưu phân quyền thất bại. Vui lòng thử lại.');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!createForm.name.trim()) return;
        setCreating(true);
        try {
            const created = await api<Role>('/roles', {
                method: 'POST',
                body: JSON.stringify({
                    name: createForm.name.trim(),
                    description: createForm.description.trim() || undefined,
                    permissionCodes: [],
                }),
            });
            setRoles((prev) => [...prev, created]);
            setSelected(created);
            setDraftCodes([]);
            setShowCreate(false);
            setCreateForm({ name: '', description: '' });
            toast.success('Đã tạo vai trò mới');
        } catch (e) {
            toast.error('Tạo vai trò thất bại');
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    const handleDeleteRole = async (role: Role) => {
        if (role.isSystem) return;
        if (!confirm(`Xóa vai trò "${role.name}"?`)) return;
        try {
            await api(`/roles/${role.id}`, { method: 'DELETE' });
            setRoles((prev) => prev.filter((r) => r.id !== role.id));
            if (selected?.id === role.id) {
                const next = roles.find((r) => r.id !== role.id);
                setSelected(next ?? null);
            }
            toast.success('Đã xóa vai trò');
        } catch (e) {
            toast.error('Xóa thất bại');
            console.error(e);
        }
    };

    if (loading) {
        return <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Đang tải danh sách vai trò…</div>;
    }

    if (error) {
        return (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center">
                <p className="text-sm font-medium text-red-800">{error}</p>
                <button onClick={() => location.reload()} className="mt-3 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700">Thử lại</button>
            </div>
        );
    }

    return (
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
            {/* Cột trái: Danh sách vai trò */}
            <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate-500">Danh sách vai trò</h3>
                <ul className="space-y-1">
                    {roles.map((r) => (
                        <li key={r.id}>
                            <button
                                onClick={() => setSelected(r)}
                                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${selected?.id === r.id ? 'bg-[#0B6E78]/5 font-semibold text-[#0B6E78]' : 'text-slate-700 hover:bg-slate-100'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span>{r.name}</span>
                                    {r.isSystem && <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-slate-500">Hệ thống</span>}
                                </div>
                                {r.description && <p className="mt-0.5 text-[12px] font-normal text-slate-500">{r.description}</p>}
                            </button>
                        </li>
                    ))}
                </ul>
                <button
                    onClick={() => { setCreateForm({ name: '', description: '' }); setShowCreate(true); }}
                    className="mt-3 w-full rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:border-[#0B6E78] hover:text-[#0B6E78]"
                >
                    + Thêm vai trò mới
                </button>

                {showCreate && (
                    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="space-y-2">
                            <input autoFocus placeholder="Tên vai trò..." value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]" />
                            <input placeholder="Mô tả..." value={createForm.description} onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })} className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B6E78]" />
                        </div>
                        <div className="mt-3 flex gap-2">
                            <button onClick={handleCreate} disabled={creating || !createForm.name.trim()} className="h-9 flex-1 rounded-md bg-[#0B6E78] px-3 text-sm font-semibold text-white hover:bg-[#095a63] disabled:opacity-50">{creating ? 'Đang tạo…' : 'Tạo'}</button>
                            <button onClick={() => setShowCreate(false)} className="h-9 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-100">Hủy</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Cột phải: Ma trận phân quyền */}
            <div className="rounded-xl border border-slate-200 bg-white p-6">
                {selected ? (
                    <>
                        <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                            <div>
                                <h2 className="text-[17px] font-semibold text-slate-900">Phân quyền: {selected.name}</h2>
                                <p className="mt-0.5 text-[13px] text-slate-500">Tick chọn quyền mà vai trò này được phép thực hiện.</p>
                            </div>
                            <div className="flex gap-2">
                                {selected && !selected.isSystem && (
                                    <button onClick={() => handleDeleteRole(selected)} className="h-10 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-600 hover:bg-red-50">Xóa vai trò</button>
                                )}
                                <button onClick={handleSave} disabled={!dirty || saving} className="h-10 rounded-lg bg-[#0B6E78] px-4 text-sm font-semibold text-white hover:bg-[#095a63] disabled:cursor-not-allowed disabled:opacity-50">
                                    {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                                </button>
                            </div>
                        </div>

                        <div className="overflow-hidden rounded-lg border border-slate-200">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 text-slate-600">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Module</th>
                                        {['read', 'create', 'update', 'delete'].map((a) => (
                                            <th key={a} className="w-24 px-4 py-3 text-center font-semibold">{ACTION_LABELS[a]}</th>
                                        ))}
                                        <th className="w-20 px-4 py-3 text-center font-semibold">Tất cả</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {MODULES.map((m) => {
                                        const codes = m.actions.map((a) => `${m.key.toLowerCase()}:${a}`);
                                        const allChecked = codes.every((c) => draftCodes.includes(c));
                                        const someChecked = codes.some((c) => draftCodes.includes(c));
                                        return (
                                            <tr key={m.key} className="border-t border-slate-100 hover:bg-slate-50/50">
                                                <td className="px-4 py-3 font-medium text-slate-800">{m.label}</td>
                                                {['read', 'create', 'update', 'delete'].map((a) => {
                                                    const code = `${m.key.toLowerCase()}:${a}`;
                                                    const supported = m.actions.includes(a);
                                                    return (
                                                        <td key={a} className="px-4 py-3 text-center">
                                                            {supported ? (
                                                                <input type="checkbox" checked={draftCodes.includes(code)} onChange={() => toggle(code)} className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#0B6E78] focus:ring-[#0B6E78]" />
                                                            ) : (
                                                                <span className="text-slate-300">—</span>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={allChecked}
                                                        ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                                                        onChange={(e) => toggleModule(m.key, m.actions, e.target.checked)}
                                                        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-[#0B6E78] focus:ring-[#0B6E78]"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <p className="mt-3 text-[12px] text-slate-500">
                            Đã chọn <span className="font-semibold text-slate-700">{draftCodes.length}</span> quyền.
                        </p>
                    </>
                ) : (
                    <div className="py-16 text-center text-sm text-slate-500">Chưa có vai trò nào.</div>
                )}
            </div>
        </div>
    );
}