'use client';

export function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <>
      <div className="modal-backdrop" onClick={onClose} />
      <div className="modal-card">
        <h2 className="text-lg font-semibold">Trợ giúp & hỗ trợ</h2>
        <p className="mt-1 text-sm text-muted-foreground">Không gian làm việc của đội ngũ kinh doanh</p>
        <p className="mt-4 text-sm leading-7">
          Quản lý khách hàng, theo dõi cơ hội và công việc của bạn tại một nơi.
          Dữ liệu được lưu trong cơ sở dữ liệu của công ty.
        </p>
        <button type="button" onClick={onClose} className="mt-5 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Đã hiểu
        </button>
      </div>
    </>
  );
}