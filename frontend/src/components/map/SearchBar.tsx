import Input from '../ui/Input';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  searching?: boolean;
}

export default function SearchBar({
  value,
  onChange,
  onSubmit,
  onClear,
  searching = false,
}: SearchBarProps) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex-1">
        <Input
          id="map-search"
          label="Search location"
          type="search"
          placeholder='Try "Delhi Gate" or "MG Road"'
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onSubmit();
            }
          }}
        />
      </div>
      <div className="flex gap-2 pb-0.5">
        <button
          type="button"
          onClick={onSubmit}
          disabled={searching}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {searching ? 'Searching…' : 'Search'}
        </button>
        {value && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
