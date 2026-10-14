import { UsersRound } from 'lucide-react';


export default function EmptyDetailPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <UsersRound size={28} className="text-muted-foreground" />
      </div>
      <h2 className="font-display text-lg font-semibold">Chọn một khách hàng</h2>
      <p className="max-w-xs text-sm text-muted-foreground">
        Click vào khách hàng bên trái để xem chi tiết, lịch sử liên hệ, cơ hội và công việc.
      </p>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">J</kbd>
        <span>/</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">K</kbd>
        <span>để di chuyển</span>
        <span className="mx-1">·</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono">Enter</kbd>
        <span>để mở</span>
      </div>
    </div>
  );
}