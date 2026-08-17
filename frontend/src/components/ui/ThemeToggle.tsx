import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../context/theme-context';

interface ThemeToggleProps {
  compact?: boolean;
  className?: string;
}

export default function ThemeToggle({
  compact = false,
  className = '',
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] ${
        compact
          ? 'h-11 w-11 rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] text-[var(--pm-color-muted)] shadow-sm hover:text-[var(--pm-color-text)]'
          : 'pm-touch-target text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-surface-raised)] hover:text-[var(--pm-color-text)]'
      } ${className}`}
    >
      {isDark ? (
        <Sun className="h-5 w-5" aria-hidden="true" />
      ) : (
        <Moon className="h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}