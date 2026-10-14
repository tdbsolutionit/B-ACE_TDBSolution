'use client';

import { useEffect, useState } from 'react';
import { Trophy, X } from 'lucide-react';

type CelebrationData = {
  dealName: string;
  value?: number;
  owner?: string;
  at: string;
};

type Props = {
  open: boolean;
  data: CelebrationData | null;
  onClose: () => void;
};

const CONFETTI_COLORS = ['#C9A961', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

export function Celebration({ open, data, onClose }: Props) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string; emoji: string }>>([]);

  useEffect(() => {
    if (!open) {
      setConfetti([]);
      return;
    }

    // Tạo 30 hạt confetti
    const pieces = Array.from({ length: 30 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      emoji: ['🎉', '🎊', '✨', '⭐', '🏆', '💫'][Math.floor(Math.random() * 6)],
    }));
    setConfetti(pieces);

    // Auto close sau 6s
    const timer = window.setTimeout(onClose, 6000);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open || !data) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Confetti */}
      <div className="pointer-events-none fixed inset-0 z-[201] overflow-hidden">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="absolute top-[-40px] animate-confetti-fall text-2xl"
            style={{
              left: `${c.left}%`,
              animationDelay: `${c.delay}s`,
            }}
          >
            {c.emoji}
          </span>
        ))}
      </div>

      {/* Popup card */}
      <div className="pointer-events-none fixed inset-0 z-[202] flex items-center justify-center p-4">
        <div
          className="pointer-events-auto relative w-full max-w-md animate-celebration-pop rounded-2xl border border-primary/30 bg-gradient-to-br from-amber-50 to-card p-8 text-center shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-accent"
            aria-label="Đóng"
          >
            <X size={16} />
          </button>

          {/* Trophy icon */}
          <div className="mx-auto mb-4 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-amber-500 shadow-lg">
            <Trophy size={40} className="text-white animate-bounce-slow" />
          </div>

          <h2 className="font-display text-2xl font-bold text-primary">
            🎉 CHÚC MỪNG! 🎉
          </h2>

          <p className="mt-3 text-sm text-muted-foreground">
            Deal vừa được chốt
          </p>

          <p className="mt-2 font-display text-lg font-semibold">
            {data.dealName}
          </p>

          {data.value != null && data.value > 0 && (
            <p className="mt-3 font-display text-3xl font-bold text-primary">
              {formatMoney(data.value)}
            </p>
          )}

          {data.owner && (
            <p className="mt-4 text-sm">
              <span className="text-muted-foreground">Bởi </span>
              <strong>{data.owner}</strong>
            </p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="mt-6 inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
          >
            Tuyệt vời! 🎊
          </button>
        </div>
      </div>
    </>
  );
}

function formatMoney(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)} tỷ đồng`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)} triệu đồng`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} nghìn đồng`;
  return `${v} đồng`;
}
