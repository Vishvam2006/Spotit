interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-10 w-10' }: LogoProps) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 text-lg font-black text-white shadow-lg shadow-blue-600/20 ${className}`}
      aria-hidden="true"
    >
      P
    </div>
  );
}
