'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import CustomerDetailPage from '@/app/(crm)/customers/[id]/page';

export default function CustomerModal() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const handleClose = () => setIsOpen(false);
    window.addEventListener('close-customer-modal', handleClose);

    if (pathname && !pathname.startsWith('/customers/')) {
      setIsOpen(false);
    }

    return () => window.removeEventListener('close-customer-modal', handleClose);
  }, [pathname]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        onClick={() => router.back()}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity cursor-pointer" 
      />
      <div className="relative z-10 h-full w-full max-w-4xl overflow-y-auto bg-background shadow-2xl animate-in slide-in-from-right duration-300 border-l border-border">
        <CustomerDetailPage />
      </div>
    </div>
  );
}