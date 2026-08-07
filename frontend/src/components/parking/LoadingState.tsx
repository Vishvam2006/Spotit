import Spinner from '../ui/Spinner';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <Spinner className="h-7 w-7 text-blue-600" />
      <p className="text-sm font-medium text-slate-600">Loading parking lots…</p>
    </div>
  );
}
