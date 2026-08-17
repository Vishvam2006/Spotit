import {
  Users,
  UserCog,
  SquareParking,
  CalendarCheck,
  Clock,
  CirclePlay,
  CircleCheck,
  MessageSquareWarning,
  RefreshCw,
} from 'lucide-react';
import AdminStatCard from '../../components/admin/AdminStatCard';
import Alert from '../../components/ui/Alert';
import Spinner from '../../components/ui/Spinner';
import { useAdminDashboard } from '../../hooks/useAdminDashboard';

export default function AdminOverview() {
  const { data, loading, error, lastUpdated, manualRefresh } =
    useAdminDashboard();

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--pm-color-muted)]">
          System-wide statistics in real time.
        </p>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--pm-color-muted)]">
            {lastUpdated
              ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}`
              : 'Updating…'}
          </span>
          <button
            type="button"
            onClick={() => manualRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3 py-2 text-sm font-semibold text-[var(--pm-color-text)] transition-colors hover:bg-[var(--pm-color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" message={error} />
        </div>
      )}

      {loading && !data ? (
        <div className="flex items-center justify-center py-24">
          <Spinner className="h-8 w-8 text-emerald-600" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Total Users"
            value={data?.totalUsers ?? 0}
            sublabel="Registered user accounts"
            icon={Users}
            accent="blue"
          />
          <AdminStatCard
            label="Parking Owners"
            value={data?.totalOwners ?? 0}
            sublabel="Registered owner accounts"
            icon={UserCog}
            accent="violet"
          />
          <AdminStatCard
            label="Parking Locations"
            value={data?.totalParkings ?? 0}
            sublabel="Listed parking lots"
            icon={SquareParking}
            accent="emerald"
          />
          <AdminStatCard
            label="Total Bookings"
            value={data?.totalBookings ?? 0}
            sublabel="All-time bookings"
            icon={CalendarCheck}
            accent="slate"
          />
          <AdminStatCard
            label="Active Reservations"
            value={data?.activeReservations ?? 0}
            sublabel="Reserved, awaiting check-in"
            icon={Clock}
            accent="amber"
          />
          <AdminStatCard
            label="Currently Checked-in"
            value={data?.currentlyCheckedIn ?? 0}
            sublabel="Active parking sessions"
            icon={CirclePlay}
            accent="emerald"
          />
          <AdminStatCard
            label="Checked-out"
            value={data?.currentlyCheckedOut ?? 0}
            sublabel="Completed sessions"
            icon={CircleCheck}
            accent="slate"
          />
          <AdminStatCard
            label="Pending Complaints"
            value={data?.pendingComplaints ?? 0}
            sublabel="Awaiting admin review"
            icon={MessageSquareWarning}
            accent="red"
          />
        </div>
      )}
    </section>
  );
}