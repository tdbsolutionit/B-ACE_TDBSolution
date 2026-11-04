'use client';
import { useRouter } from 'next/navigation';

export function ProjectNotFound() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8">
      <h2 className="text-lg font-bold text-foreground">Không tìm thấy dự án</h2>
      <p className="text-sm text-muted-foreground">
        Dự án này không tồn tại hoặc đã bị xóa khỏi hệ thống.
      </p>
      <button
        onClick={() => router.push('/projects')}
        className="mt-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Quay lại danh sách
      </button>
    </div>
  );
}