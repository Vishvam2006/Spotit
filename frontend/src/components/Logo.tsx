interface LogoProps {
  className?: string;
}

export default function Logo({ className = 'h-10 w-10' }: LogoProps) {
  return (
    <img
      src="/logo.jpg"
      alt="ParkMitra Logo"
      className={`shrink-0 rounded-xl object-cover shadow-lg ${className}`}
    />
  );
}
