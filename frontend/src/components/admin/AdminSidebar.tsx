import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquareWarning,
  CalendarDays,
  type LucideIcon,
} from 'lucide-react';

interface SidebarItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

const ITEMS: SidebarItem[] = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/complaints', label: 'Complaints', icon: MessageSquareWarning },
  { to: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || 'A';
}

export default function AdminSidebar({ fullName }: { fullName: string }) {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex min-h-11 w-full items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] ${
      isActive
        ? 'bg-[var(--pm-color-action-soft)] text-[var(--pm-color-action)]'
        : 'text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-surface-raised)] hover:text-[var(--pm-color-text)]'
    }`;

  return (
    <aside className="flex w-full flex-col gap-1 lg:w-60 lg:shrink-0">
      <div className="mb-2 hidden items-center gap-3 rounded-2xl bg-[var(--pm-color-surface)] p-4 shadow-sm ring-1 ring-[var(--pm-color-border)] lg:flex">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-action)] text-sm font-bold text-white">
          {getInitials(fullName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--pm-color-text)]">
            {fullName}
          </p>
          <p className="text-xs font-semibold text-[var(--pm-color-action)]">
            Admin
          </p>
        </div>
      </div>

      <nav
        className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        aria-label="Admin navigation"
      >
        {ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={linkClass}>
            <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
            <span className="whitespace-nowrap">{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}