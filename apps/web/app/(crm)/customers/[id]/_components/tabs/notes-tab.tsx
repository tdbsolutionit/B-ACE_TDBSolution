'use client';

interface NotesTabProps {
  notes: string;
  saved: boolean;
  canUpdate: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
}

export function NotesTab({ notes, saved, canUpdate, onChange, onSave }: NotesTabProps) {
  return (
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ghi chú về khách hàng..."
        className="h-32 w-full rounded-md border border-input bg-background p-3 text-sm"
      />

      {canUpdate && (
        <button
          type="button"
          onClick={onSave}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
        >
          Lưu ghi chú
        </button>
      )}

      {saved && <p className="text-sm text-success">Đã lưu ghi chú</p>}
    </div>
  );
}