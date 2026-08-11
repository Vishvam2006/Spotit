import { Link, useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  CalendarDays,
  CircleCheck,
  CirclePlay,
  RefreshCw,
  SquareParking,
} from 'lucide-react';
import Logo from '../components/Logo';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import DashboardCard from '../components/owner/DashboardCard';
import ParkingStatusTable from '../components/owner/ParkingStatusTable';
import RevenueTable from '../components/owner/RevenueTable';
import BookingsTable from '../components/owner/BookingsTable';
import LineChart from '../components/owner/LineChart';
import BarChart from '../components/owner/BarChart';
import { useOwnerDashboard } from '../hooks/useOwnerDashboard';
import { useAuth } from '../context/auth-context';
import { formatINR } from '../utils/format';

function OccupancyBar({
  occupied,
  total,
  percentage,
}: {
  occupied: number;
  total: number;
  percentage: number;
}) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">Occupancy</p>
        <p className="text-lg font-bold text-slate-900">{percentage.toFixed(1)}%</p>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        {occupied} of {total} slots are currently occupied.
      </p>
      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const {
    data,
    statuses,
    expandedIds,
    loading,
    error,
    lastUpdated,
    toggleParking,
    manualRefresh,
  } = useOwnerDashboard();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const dashboard = data.dashboard;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ParkMitra
            </span>
          </div>
          <nav className="flex flex-wrap items-center gap-2">
            <Link
              to="/"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Map
            </Link>
            <Link
              to="/bookings"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              My Bookings
            </Link>
            <Link
              to="/my-parkings"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              My Parking Lots
            </Link>
            <Link
              to="/dashboard"
              className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard</h1>
            <p className="mt-1 text-sm text-slate-500">
              Revenue, bookings and live parking status at a glance.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Live
            </span>
            <span className="text-xs text-slate-400">
              {lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
                : 'Updating…'}
            </span>
            <button
              type="button"
              onClick={() => manualRefresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6">
            <Alert variant="error" message={error} />
          </div>
        )}

        {loading && !dashboard ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        ) : (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DashboardCard
                label="Total Revenue"
                value={formatINR(dashboard?.totalRevenue ?? 0)}
                sublabel="All time earnings"
                icon={IndianRupee}
                accent="emerald"
              />
              <DashboardCard
                label="Today's Revenue"
                value={formatINR(dashboard?.todayRevenue ?? 0)}
                sublabel="Earned today"
                icon={IndianRupee}
                accent="blue"
              />
              <DashboardCard
                label="Monthly Revenue"
                value={formatINR(dashboard?.monthlyRevenue ?? 0)}
                sublabel="Current month"
                icon={CalendarDays}
                accent="violet"
              />
              <DashboardCard
                label="Completed Bookings"
                value={String(dashboard?.completedBookings ?? 0)}
                sublabel="All time"
                icon={CircleCheck}
                accent="emerald"
              />
              <DashboardCard
                label="Active Bookings"
                value={String(dashboard?.activeBookings ?? 0)}
                sublabel={`${dashboard?.reservedBookings ?? 0} reserved`}
                icon={CirclePlay}
                accent="blue"
              />
              <DashboardCard
                label="Available Slots"
                value={`${dashboard?.availableSlots ?? 0} / ${dashboard?.totalSlots ?? 0}`}
                sublabel="Across all lots"
                icon={SquareParking}
                accent="slate"
              />
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-4">
              <OccupancyBar
                occupied={dashboard?.occupiedSlots ?? 0}
                total={dashboard?.totalSlots ?? 0}
                percentage={dashboard?.occupancyPercentage ?? 0}
              />

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
                <div className="mb-2">
                  <h2 className="text-base font-bold text-slate-900">Today's revenue</h2>
                  <p className="text-sm text-slate-500">Per-hour earnings for today.</p>
                </div>
                <LineChart
                  data={data.analytics?.dailyRevenue ?? []}
                  formatValue={(value) => formatINR(value)}
                  ariaLabel="Daily revenue line chart"
                />
              </div>
            </section>

            <section className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-2">
                  <h2 className="text-base font-bold text-slate-900">Monthly revenue</h2>
                  <p className="text-sm text-slate-500">Last 12 months of earnings.</p>
                </div>
                <BarChart
                  data={data.analytics?.monthlyRevenue ?? []}
                  formatValue={(value) => formatINR(value)}
                  ariaLabel="Monthly revenue bar chart"
                />
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="mb-2">
                  <h2 className="text-base font-bold text-slate-900">Occupancy trend</h2>
                  <p className="text-sm text-slate-500">Average occupancy per day.</p>
                </div>
                <LineChart
                  data={data.analytics?.occupancyTrend ?? []}
                  formatValue={(value) => `${value}%`}
                  ariaLabel="Occupancy trend line chart"
                />
              </div>
            </section>

            <section className="mt-6">
              <RevenueTable
                rows={data.revenue?.byParking ?? []}
                loading={loading && data.revenue === null}
              />
            </section>

            <section className="mt-6">
              <ParkingStatusTable
                parkings={data.parkings}
                statuses={statuses}
                expandedIds={expandedIds}
                onToggle={toggleParking}
                loading={loading && data.parkings.length === 0}
              />
            </section>

            <section className="mt-6">
              <BookingsTable
                bookings={data.bookings}
                loading={loading && data.bookings.length === 0}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}