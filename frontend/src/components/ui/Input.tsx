import { useId, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export default function Input({
  label,
  error,
  hint,
  type = 'text',
  id,
  className = '',
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const generatedId = useId();
  const resolvedId = id ?? generatedId;
  const isPassword = type === 'password';
  const resolvedType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={className}>
      <label
        htmlFor={resolvedId}
        className="block text-sm font-semibold text-[var(--pm-color-text)]"
      >
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={resolvedId}
          type={resolvedType}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${resolvedId}-error` : hint ? `${resolvedId}-hint` : undefined
          }
          className={`min-h-11 w-full rounded-xl border bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-base text-[var(--pm-color-text)] shadow-sm transition-colors placeholder:text-[var(--pm-color-muted)] focus:outline-none focus:ring-2 sm:text-sm ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-[var(--pm-color-border)] focus:border-[var(--pm-color-focus)] focus:ring-[var(--pm-color-focus)]'
          } ${isPassword ? 'pr-11' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="pm-touch-target absolute inset-y-0 right-0 flex items-center justify-center px-3.5 text-[var(--pm-color-muted)] transition-colors hover:text-[var(--pm-color-text)] focus:outline-none focus-visible:text-[var(--pm-color-text)]"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Eye className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        )}
      </div>
      {error && (
        <p
          id={`${resolvedId}-error`}
          className="mt-1.5 text-sm font-medium text-red-600"
          role="alert"
        >
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${resolvedId}-hint`} className="mt-1.5 text-sm text-[var(--pm-color-muted)]">
          {hint}
        </p>
      )}
    </div>
  );
}
