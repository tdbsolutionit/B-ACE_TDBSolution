import { Loader2 } from 'lucide-react';

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSaving: boolean;
  label?: string;
  loadingLabel?: string;
}

export function SubmitButton({ isSaving, label = 'Lưu', loadingLabel = 'Đang lưu...', className, ...props }: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isSaving || props.disabled}
      className={`inline-flex h-9 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 ${className || ''}`}
      {...props}
    >
      {isSaving && <Loader2 size={16} className="animate-spin" />}
      {isSaving ? loadingLabel : label}
    </button>
  );
}