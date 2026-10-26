'use client';

import { Layers3 } from 'lucide-react';

type Props = {
  text?: string;
  fullscreen?: boolean;
};

export function Loading({ text = 'Đang tải…', fullscreen = false }: Props) {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-4 ${
        fullscreen ? 'min-h-screen' : 'min-h-[300px] py-16'
      }`}
    >
      {/* Logo với hiệu ứng pulse + ring */}
      <div className="relative">
        {/* Ring xoay ngoài */}
        <div className="absolute inset-0 -m-3 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
        {/* Vòng pulse */}
        <div className="absolute inset-0 -m-3 animate-ping rounded-full border border-primary/30" />
        {/* Logo */}
        <div className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary-hover shadow-lg">
          <Layers3 size={26} className="text-white" strokeWidth={2.2} />
        </div>
      </div>

      {/* Text với hiệu ứng nhấp nháy */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-foreground">{text}</span>
        <span className="flex gap-0.5">
          <span className="inline-block size-1 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="inline-block size-1 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="inline-block size-1 animate-bounce rounded-full bg-primary" />
        </span>
      </div>
    </div>
  );
}

/** Skeleton cho list rows */
export function LoadingRows({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5">
          <div className="size-4 animate-pulse rounded bg-muted" />
          <div className="size-9 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            <div className="h-2.5 w-24 animate-pulse rounded bg-muted/70" />
          </div>
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="h-6 w-16 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}
