import type { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: 'blue' | 'emerald' | 'violet' | 'amber' | 'red' | 'slate';
}

const ACCENTS: Record<
  NonNullable<DashboardCardProps['accent']>,
  { icon: string; ring: string }
> = {
  // Categorical accents for stat tiles. These are not action colors — the
  // single action color across the app is emerald.
  blue: { icon: 'bg-sky-50 text-sky-600', ring: 'ring-sky-100' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', ring: 'ring-emerald-100' },
  violet: { icon: 'bg-violet-50 text-violet-600', ring: 'ring-violet-100' },
  amber: { icon: 'bg-amber-50 text-amber-600', ring: 'ring-amber-100' },
  red: { icon: 'bg-red-50 text-red-600', ring: 'ring-red-100' },
  slate: { icon: 'bg-slate-100 text-slate-600', ring: 'ring-slate-100' },
};

export default function DashboardCard({
  label,
  value,
  sublabel,
  icon: Icon,
  accent = 'blue',
}: DashboardCardProps) {
  const styles = ACCENTS[accent];

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>
          <Icon className="h-5 w-5" />
        </span>
        <p className="min-w-0 text-sm font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-4 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      {sublabel && <p className="mt-1 text-xs text-slate-400">{sublabel}</p>}
    </div>
  );
}