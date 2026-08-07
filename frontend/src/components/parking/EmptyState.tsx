export default function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <svg
        className="h-10 w-10 text-slate-300"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M7 9h10M7 13h6" />
      </svg>
      <p className="text-sm font-semibold text-slate-700">No parking lots found</p>
      <p className="text-sm text-slate-500">
        Try adjusting your search or filters.
      </p>
    </div>
  );
}
