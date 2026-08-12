import { CircleAlert, CircleCheck } from 'lucide-react';

interface AlertProps {
  variant: 'error' | 'success' | 'info';
  message: string;
}

export default function Alert({ variant, message }: AlertProps) {
  const styles = {
    error: 'border-red-200 bg-red-50 text-red-700',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    info: 'border-blue-200 bg-blue-50 text-blue-700',
  }[variant];

  const Icon = variant === 'success' ? CircleCheck : CircleAlert;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium shadow-sm ${styles}`}
    >
      <span className="mt-0.5 shrink-0">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="leading-5">{message}</p>
    </div>
  );
}
