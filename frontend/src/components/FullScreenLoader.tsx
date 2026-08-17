export default function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--pm-color-page)]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
    </div>
  );
}