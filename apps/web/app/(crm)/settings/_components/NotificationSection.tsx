'use client';

import { NOTIFICATIONS, NotificationKey } from './settings-utils';
import { Card, Switch } from './SettingsUI';

export function NotificationSection({ values, onToggle }: { values: Record<NotificationKey, boolean>; onToggle: (key: NotificationKey, next: boolean) => void; }) {
    return (
        <Card title="Thông báo" description="Chọn sự kiện bạn muốn nhận thông báo.">
            <ul>
                {NOTIFICATIONS.map((n) => (
                    <li key={n.key} className="flex items-center justify-between gap-4 border-t border-slate-100 py-3.5">
                        <div>
                            <p className="text-sm font-semibold text-slate-900">{n.title}</p>
                            <p className="mt-0.5 text-[13px] text-slate-500">{n.desc}</p>
                        </div>
                        <Switch checked={values[n.key]} onChange={(next) => onToggle(n.key, next)} label={n.title} />
                    </li>
                ))}
            </ul>
        </Card>
    );
}