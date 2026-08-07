import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
  variant?: 'primary' | 'secondary';
}

export default function Button({
  loading = false,
  children,
  variant = 'primary',
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60';

  const variantClasses =
    variant === 'primary'
      ? 'bg-[#19C7B2] text-[#0B1220] shadow-sm hover:bg-[#0E9F94] hover:text-white focus:ring-[#19C7B2]'
      : 'border border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-[#F8FAFC] focus:ring-[#19C7B2]';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}
