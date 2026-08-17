import { Search, X } from 'lucide-react';
import Input from '../ui/Input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  searching?: boolean;
  compact?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  searching = false,
  compact = false,
}: SearchBarProps) {
  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Input
          id="map-search"
          label="Search location"
          type="search"
          placeholder='Search destination or area'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
          className={compact ? '[&_label]:sr-only' : ''}
        />
      </div>
      <div className="flex gap-2 pb-0.5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={searching}
          aria-label={searching ? 'Searching' : 'Search'}
          className="pm-touch-target inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Search className={`h-5 w-5 ${searching ? 'animate-pulse' : ''}`} aria-hidden="true" />
        </button>
        {value && (
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear search"
            className="pm-touch-target inline-flex items-center justify-center rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3 text-[var(--pm-color-muted)] shadow-sm transition-colors hover:bg-[var(--pm-color-surface-raised)] hover:text-[var(--pm-color-text)] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
