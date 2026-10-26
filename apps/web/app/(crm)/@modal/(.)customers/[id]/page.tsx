'use client'; // Thêm dòng này ở đầu file

import { useRouter } from 'next/navigation';
import CustomerDetailPage from '@/app/(crm)/customers/[id]/page';

export default function CustomerModal() {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Lớp nền đen mờ: Click vào đây sẽ gọi router.back() để đóng modal */}
      <div 
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity cursor-pointer" 
        aria-label="Đóng"
      />

      {/* Khung Drawer trượt ra từ bên phải */}
      <div className="relative z-10 h-full w-full max-w-4xl overflow-y-auto bg-background shadow-2xl animate-in slide-in-from-right duration-300 border-l border-border">
        <CustomerDetailPage />
      </div>
    </div>
  );
}