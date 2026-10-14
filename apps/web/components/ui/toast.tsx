'use client';

import { Toaster as SonnerToaster, toast } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      closeButton
      toastOptions={{
        className: 'font-sans',
        style: {
          borderRadius: '0.75rem',
        },
      }}
    />
  );
}

export { toast };
