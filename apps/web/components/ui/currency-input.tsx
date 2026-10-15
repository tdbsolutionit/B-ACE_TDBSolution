'use client';

import { useEffect, useState } from 'react';

type Props = {
  name: string;
  defaultValue?: number | string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  showPreview?: boolean;
  onChange?: (value: number) => void;
};

function formatNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  // Xóa số 0 thừa ở đầu khi có số khác đằng sau (VD: "02" -> "2")
  const cleaned = digits.replace(/^0+(?=\d)/, '');
  return cleaned.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function parseNumber(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  const cleaned = digits.replace(/^0+(?=\d)/, '');
  return cleaned ? Number(cleaned) : 0;
}

function readVietnamese(v: number): string {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)} tỷ đồng`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} triệu đồng`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)} nghìn đồng`;
  if (v > 0) return `${v} đồng`;
  return '';
}

export function CurrencyInput({
  name,
  defaultValue = 0,
  placeholder = '0',
  required,
  className,
  showPreview = false,
  onChange,
}: Props) {
  const initial =
    typeof defaultValue === 'number'
      ? formatNumber(String(defaultValue))
      : formatNumber(String(defaultValue || 0));

  const [display, setDisplay] = useState<string>(initial);
  const [value, setValue] = useState<number>(parseNumber(initial));

  useEffect(() => {
    const next =
      typeof defaultValue === 'number'
        ? formatNumber(String(defaultValue))
        : formatNumber(String(defaultValue || 0));
    setDisplay(next);
    setValue(parseNumber(next));
  }, [defaultValue]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const formatted = formatNumber(raw);
    const parsed = parseNumber(formatted);
    setDisplay(formatted);
    setValue(parsed);
    onChange?.(parsed);
  }

  function handleFocus(e: React.FocusEvent<HTMLInputElement>) {
    if (value === 0 || display === '0') {
      e.target.select();
    }
  }

  return (
    <>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onFocus={handleFocus}
        onChange={handleChange}
        placeholder={placeholder}
        required={required}
        className={
          className ??
          'h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-primary/40'
        }
      />
      <input type="hidden" name={name} value={value} />
      {showPreview && value > 0 && (
        <p className="mt-1 text-[10px] text-muted-foreground">
          ≈ {readVietnamese(value)}
        </p>
      )}
    </>
  );
}