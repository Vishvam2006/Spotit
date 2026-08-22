import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  CalendarDays,
  Car,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  SquareParking,
  User,
  X,
  Home,
  Compass,
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
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);

  // Hide mobile bottom tab bar on detail pages where sticky action buttons might overlap
  const hideMobileNav =
    location.pathname.startsWith('/parking/') ||
    location.pathname.startsWith('/booking/confirm/');
  const menuRef = useRef<HTMLDivElement>(null);
  const mobileSheetRef = useRef<HTMLDivElement>(null);

  const canViewDashboard =
    user?.role === 'OWNER' || user?.role === 'ADMIN';

  const dashboardHref = user?.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard';

  // Desktop nav items
  const navItems: NavItem[] = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
    { to: '/verification', label: 'AI Verification', icon: ShieldCheck },
    { to: '/my-vehicles', label: 'My Vehicles', mobileLabel: 'Vehicles', icon: Car },
    { to: '/my-parkings', label: 'My Parkings', mobileLabel: 'Parkings', icon: SquareParking },
    ...(canViewDashboard
      ? [{ to: dashboardHref, label: 'Dashboard', icon: LayoutDashboard }]
      : []),
  ];

  // Mobile primary nav items for bottom bar
  const mobileNavItems: NavItem[] = [
    { to: '/', label: 'Home', icon: Home, end: true },
    { to: '/explore', label: 'Explore', icon: Compass },
    { to: '/bookings', label: 'Bookings', icon: CalendarDays },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      const clickedOutsideSheet = mobileSheetRef.current && !mobileSheetRef.current.contains(target);
      
      if (clickedOutsideMenu && clickedOutsideSheet) {
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
        ? 'bg-[var(--pm-color-action-soft)] text-[var(--pm-color-action)]'
        : 'text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-surface-raised)] hover:text-[var(--pm-color-text)]'
    }`;

  // Pill-style dark bottom nav for mobile
  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    `group relative flex flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1 py-2 rounded-xl text-[11px] font-bold leading-none transition-all duration-200 focus:outline-none ${
      isActive ? 'text-[var(--pm-color-text)]' : 'text-[var(--pm-color-muted)] hover:text-[var(--pm-color-text)]'
    }`;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[var(--pm-color-page)]/90 backdrop-blur-md">
        {/* Desktop top bar */}
        <div className="mx-auto hidden max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 md:flex border-b border-[var(--pm-color-border)]">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-[var(--pm-color-text)]">
              ParkMitra
            </span>
          </div>

          <nav className="flex items-center gap-1" aria-label="Main navigation">
            {navItems.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className={desktopLinkClass}>
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className="flex min-h-11 items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-color-action)] text-xs font-bold text-white shadow-md">
                {initials}
              </span>
              <span className="hidden lg:inline">{user?.fullName}</span>
              <ChevronDown
                className={`h-4 w-4 text-[var(--pm-color-muted)] transition-transform duration-200 ${accountOpen ? 'rotate-180' : ''
                  }`}
              />
            </button>

            {accountOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 overflow-hidden rounded-xl bg-[var(--pm-color-surface-raised)] shadow-2xl ring-1 ring-[var(--pm-color-border)]">
                <div className="flex items-center gap-3 border-b border-[var(--pm-color-border)] px-4 py-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-action)] text-sm font-bold text-white">
                    {initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--pm-color-text)]">
                      {user?.fullName}
                    </p>
                    <p className="truncate text-xs text-[var(--pm-color-muted)]">{user?.email}</p>
                  </div>
                </div>
                <div className="px-4 py-2">
                  <span className="rounded-full bg-[var(--pm-color-action-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--pm-color-action)]">
                    {user ? ROLE_LABELS[user.role] : ''}
                  </span>
                </div>
                <Link
                  to="/account"
                  onClick={() => setAccountOpen(false)}
                  className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface)] focus:outline-none"
                >
                  <User className="h-4 w-4" />
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-11 w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-500 transition-colors hover:bg-red-500/10 focus:outline-none"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            )}
            </div>
          </div>
        </div>

        {/* Mobile top header (hidden if no map/home, or we can make it part of Home) */}
        {/* We keep it simple here */}
      </header>

      {/* Floating Pill Mobile bottom tab bar */}
      {!hideMobileNav && (
        <nav
          className="fixed inset-x-0 bottom-4 z-50 px-4 md:hidden pb-[env(safe-area-inset-bottom)] pointer-events-none"
          aria-label="Mobile navigation"
        >
          <div className="mx-auto flex max-w-md items-center justify-between rounded-[2rem] bg-[#1a2230]/95 backdrop-blur-xl p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ring-1 ring-white/10 pointer-events-auto">
            {mobileNavItems.map(({ to, label, mobileLabel, icon: Icon, end }) => {
              const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <NavLink key={to} to={to} end={end} className={mobileTabClass}>
                  <span
                    className={`flex h-10 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                      isActive ? 'bg-[var(--pm-color-action)] text-white shadow-lg' : 'bg-transparent text-[var(--pm-color-muted)]'
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className={`mt-1 max-w-full truncate transition-all duration-300 ${isActive ? 'opacity-100 scale-100 font-extrabold text-white' : 'opacity-80 scale-95 font-medium'}`}>
                    {mobileLabel ?? label}
                  </span>
                </NavLink>
              );
            })}
            
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              aria-label="Open account menu"
              aria-expanded={accountOpen}
              className={`group relative flex flex-1 flex-col items-center justify-center gap-1 overflow-hidden px-1 py-2 rounded-xl text-[11px] font-bold leading-none transition-all duration-200 focus:outline-none ${
                accountOpen ? 'text-[var(--pm-color-text)]' : 'text-[var(--pm-color-muted)] hover:text-[var(--pm-color-text)]'
              }`}
            >
              <span
                className={`flex h-10 w-12 items-center justify-center rounded-2xl transition-all duration-300 ${
                  accountOpen ? 'bg-[var(--pm-color-action)] text-white shadow-lg' : 'bg-transparent text-[var(--pm-color-muted)]'
                }`}
              >
                <User className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className={`mt-1 max-w-full truncate transition-all duration-300 ${accountOpen ? 'opacity-100 scale-100 font-extrabold text-white' : 'opacity-80 scale-95 font-medium'}`}>
                Account
              </span>
            </button>
          </div>
        </nav>
      )}

      {/* Mobile account sheet */}
      {accountOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setAccountOpen(false)}
            aria-hidden="true"
          />
          <div
            ref={mobileSheetRef}
            role="dialog"
            aria-label="Account"
            className="pm-sheet absolute inset-x-0 bottom-0 max-h-[85vh] animate-slide-up overflow-y-auto rounded-t-3xl bg-[var(--pm-color-surface)] p-6 pb-[max(2rem,env(safe-area-inset-bottom))] shadow-2xl ring-1 ring-white/10"
          >
            <div className="mx-auto mb-6 h-1.5 w-12 rounded-full bg-[var(--pm-color-border-strong)]" />

            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-action)] text-lg font-bold text-white shadow-lg">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-[var(--pm-color-text)]">
                    {user?.fullName}
                  </p>
                  <p className="truncate text-sm text-[var(--pm-color-muted)]">{user?.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountOpen(false)}
                aria-label="Close account menu"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] text-[var(--pm-color-muted)] transition-colors hover:bg-[var(--pm-color-border)] focus:outline-none"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[var(--pm-color-action-soft)] px-3 py-1.5 text-xs font-bold text-[var(--pm-color-action)]">
                {user ? ROLE_LABELS[user.role] : ''}
              </span>
            </div>

            <div className="mt-6 space-y-1">
              {/* Extra nav items inside the menu */}
              {[
                { to: '/account', label: 'My Profile', icon: User },
                { to: '/verification', label: 'AI Verification', icon: ShieldCheck },
                { to: '/my-vehicles', label: 'My Vehicles', icon: Car },
                { to: '/my-parkings', label: 'My Parkings', icon: SquareParking },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setAccountOpen(false)}
                  className={({ isActive }) =>
                    `flex min-h-12 w-full items-center gap-4 rounded-2xl px-4 text-sm font-semibold transition-colors focus:outline-none ${
                      isActive
                        ? 'bg-[var(--pm-color-action-soft)] text-[var(--pm-color-action)]'
                        : 'text-[var(--pm-color-text)] hover:bg-[var(--pm-color-surface-raised)]'
                    }`
                  }
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>

            {canViewDashboard && (
              <NavLink
                to={dashboardHref}
                onClick={() => setAccountOpen(false)}
                className="mt-6 flex min-h-14 w-full items-center gap-3 rounded-2xl bg-[var(--pm-color-surface-raised)] px-5 text-sm font-bold text-[var(--pm-color-text)] shadow-sm transition-colors hover:bg-[var(--pm-color-border)] focus:outline-none"
              >
                <LayoutDashboard className="h-5 w-5 text-[var(--pm-color-action)]" aria-hidden="true" />
                {user?.role === 'ADMIN' ? 'Admin Dashboard' : 'Owner Dashboard'}
              </NavLink>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="mt-4 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 text-sm font-bold text-red-500 transition-colors hover:bg-red-500/20 focus:outline-none"
            >
              <LogOut className="h-5 w-5" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </>
  );
}
