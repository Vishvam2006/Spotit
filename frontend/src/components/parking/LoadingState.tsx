import Spinner from '../ui/Spinner';

export default function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-[20px] border border-dashed border-[#E2E8F0] bg-white px-6 py-16 text-center">
      <Spinner className="h-7 w-7 text-[#19C7B2]" />
      <p className="text-sm font-semibold text-[#64748B]">Finding parking nearby...</p>
    </div>
  );
}
