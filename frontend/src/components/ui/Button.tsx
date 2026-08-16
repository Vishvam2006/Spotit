import type { ButtonHTMLAttributes, ReactNode } from 'react';
import Spinner from './Spinner';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export default function Button({
  loading = false,
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = true,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100';

  const widthClass = fullWidth ? 'w-full' : 'w-auto';

  const sizeClasses = {
    sm: 'min-h-11 px-3 py-2 text-sm',
    md: 'min-h-11 px-4 py-2.5 text-sm',
    lg: 'min-h-12 px-5 py-3 text-base',
  }[size];

  const variantClasses = {
    primary:
      'bg-[var(--pm-color-action)] text-white shadow-sm hover:bg-[var(--pm-color-action-hover)] focus-visible:ring-[var(--pm-color-focus)]',
    secondary:
      'border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 focus-visible:ring-[var(--pm-color-focus)]',
    danger:
      'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500',
    ghost:
      'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:ring-[var(--pm-color-focus)]',
  }[variant];

  return (
    <button
      className={`${baseClasses} ${widthClass} ${sizeClasses} ${variantClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}
