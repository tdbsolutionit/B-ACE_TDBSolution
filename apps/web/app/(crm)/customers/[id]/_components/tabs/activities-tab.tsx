'use client';
import { ActivityForm } from '@/components/shared/activity-form';
import type { CustomerActivity } from '../../_types';

interface ActivitiesTabProps {
  customerId: string;
  activities: CustomerActivity[];
  onSaved: () => void;
}

export function ActivitiesTab({ customerId, activities, onSaved }: ActivitiesTabProps) {
  return (
    <>
      <ActivityForm relatedType="customer" relatedId={customerId} onSaved={onSaved} />

      {activities.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Chưa có lịch sử tương tác.
        </p>
      ) : (
        <ul className="space-y-3">
          {activities.map((item) => (
            <li key={item.id} className="border-b border-border pb-3">
              <p className="text-sm font-medium">{item.subject}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {item.content} · {item.owner} ·{' '}
                {new Date(item.createdAt).toLocaleString('vi-VN')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}