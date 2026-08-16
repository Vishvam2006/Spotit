import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Car,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Map,
  ShieldCheck,
  SquareParking,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import Logo from '../Logo';
import { useAuth } from '../../context/auth-context';
import type { Role } from '../../types';

interface NavItem {
  to: string;
  label: string;
  mobileLabel?: string;
  icon: LucideIcon;
  end?: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  USER: 'Member',
  OWNER: 'Owner',
  ADMIN: 'Admin',
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
  return initials || 'U';
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const canViewDashboard =
    user?.role === 'OWNER' || user?.role === 'ADMIN';

  const navItems: NavItem[] = [
    { to: '/', label: 'Map', icon: Map, end: true },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },


    { to: '/verification', label: 'AI Verification', icon: ShieldCheck },

    { to: '/my-vehicles', label: 'My Vehicles', mobileLabel: 'Vehicles', icon: Car },
    { to: '/my-parkings', label: 'My Parkings', mobileLabel: 'Parkings', icon: SquareParking },

    ...(canViewDashboard
      ? [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
      : []),
  ];

  const mobileNavItems: NavItem[] = navItems.filter(
    (item) => item.to !== '/dashboard',
  );

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setAccountOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountOpen]);

  const initials = getInitials(user?.fullName ?? '');

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] ${
      isActive
        ? 'bg-emerald-50 text-emerald-700'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1 text-[11px] font-bold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pm-color-focus)] ${
      isActive ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur">
        {/* Desktop top bar */}
        <div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 md:flex">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ParkMitra
            </span>
          </div>

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navItems.map(({ to, label }) => (
              <NavLink key={to} to={to} end={to === '/'} className={desktopLinkClass}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)]"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                {initials}
              </span>
              <span className="hidden lg:inline">{user?.fullName}</span>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user?.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user?.email}</p>
                  </div>
                </div>
                <div className="px-4 py-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                    {user ? ROLE_LABELS[user.role] : ''}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 md:hidden">
          <NavLink to="/" className="flex items-center gap-3">
            <Logo className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-slate-900">
              ParkMitra
            </span>
          </NavLink>
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            className="pm-touch-target flex items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] focus-visible:ring-offset-2"
          >
            {initials}
          </button>
        </div>
      </header>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(15_23_42_/_0.08)] backdrop-blur-xl md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="flex">
          {mobileNavItems.map(({ to, label, mobileLabel, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={mobileTabClass}>
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${
                      isActive ? 'bg-emerald-600 opacity-100' : 'opacity-0'
                    }`}
                  />
                  <span
                    className={`flex h-8 w-10 items-center justify-center rounded-full transition-colors ${
                      isActive ? 'bg-emerald-50' : 'bg-transparent'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="max-w-full truncate">{mobileLabel ?? label}</span>
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            aria-label="Open account menu"
            aria-expanded={accountOpen}
            className={`relative flex min-h-16 flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1 text-[11px] font-bold leading-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--pm-color-focus)] ${
              accountOpen ? 'text-emerald-700' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span
              className={`absolute top-0 h-0.5 w-8 rounded-full transition-opacity ${
                accountOpen ? 'bg-emerald-600 opacity-100' : 'opacity-0'
              }`}
            />
            <span
              className={`flex h-8 w-10 items-center justify-center rounded-full transition-colors ${
                accountOpen ? 'bg-emerald-50' : 'bg-transparent'
              }`}
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </span>
            <span>Account</span>
          </button>
        </div>
      </nav>

      {/* Mobile account sheet */}
      {accountOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setAccountOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Account"
            className="pm-sheet absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-2xl p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] ring-1 ring-slate-200"
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-slate-200" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white shadow-sm">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-base font-bold text-slate-900">
                    {user?.fullName}
                  </p>
                  <p className="truncate text-sm text-slate-500">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                aria-label="Close account menu"
                className="pm-touch-target -mr-2 -mt-2 flex shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)]"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
                {user ? ROLE_LABELS[user.role] : ''}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                ParkMitra account
              </span>
            </div>

            <div className="mt-5 space-y-2 border-y border-slate-100 py-3">
              {mobileNavItems.map(({ to, label, mobileLabel, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  onClick={() => setAccountOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{mobileLabel ?? label}</span>
                </NavLink>
              ))}
            </div>

            {canViewDashboard && (
              <NavLink
                to="/dashboard"
                onClick={() => setAccountOpen(false)}
                className="mt-4 flex min-h-12 w-full items-center gap-3 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition-colors hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)] focus-visible:ring-offset-2"
              >
                <LayoutDashboard className="h-5 w-5" aria-hidden="true" />
                Owner dashboard
              </NavLink>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-bold text-red-600 transition-colors hover:bg-red-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
