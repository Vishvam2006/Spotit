import type { ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import AppLayout from '../layout/AppLayout';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../../context/auth-context';

export default function AdminLayout({ children }: { children?: ReactNode }) {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--pm-color-text)]">
              Admin Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
              System-wide overview, complaints and bookings.
            </p>
          </div>
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700 ring-1 ring-violet-200">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            Admin
          </span>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <AdminSidebar fullName={user?.fullName ?? 'Admin'} />
          <main className="min-w-0 flex-1">{children ?? <Outlet />}</main>
        </div>
      </div>
    </AppLayout>
  );
}