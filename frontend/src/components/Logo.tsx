interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-10 w-10' }: LogoProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl bg-[#0B1220] text-lg font-black text-[#19C7B2] shadow-sm ${className}`}
      aria-hidden="true"
    >
      P
    </div>
  );
}
