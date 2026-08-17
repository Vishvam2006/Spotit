interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPageChange,
}: PaginationProps) {
  if (totalPages <= 1) {
    return (
      <p className="px-5 py-3 text-xs text-[var(--pm-color-muted)]">
        Showing {total} result{total === 1 ? '' : 's'}
      </p>
    );
  }

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t border-[var(--pm-color-border)] px-5 py-3 sm:flex-row sm:items-center">
      <p className="text-xs text-[var(--pm-color-muted)]">
        Showing {from}–{to} of {total} results
      </p>
      <nav aria-label="Pagination" className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={item === page ? 'page' : undefined}
            className={`flex min-h-9 min-w-9 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors focus:outline-none ${
              item === page
                ? 'bg-[var(--pm-color-action)] text-white'
                : 'text-[var(--pm-color-text)] hover:bg-[var(--pm-color-surface-raised)]'
            }`}
          >
            {item}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex min-h-9 items-center rounded-lg px-3 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface-raised)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </nav>
    </div>
  );
}