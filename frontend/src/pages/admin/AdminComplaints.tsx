import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../../components/ui/Alert';
import ComplaintTable from '../../components/admin/ComplaintTable';
import Pagination from '../../components/admin/Pagination';
import { useAdminComplaints } from '../../hooks/useAdminComplaints';
import { updateAdminComplaintStatus } from '../../services/admin';
import { notifyError, notifySuccess } from '../../utils/notify';
import type { ComplaintStatus } from '../../types/complaint';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_REVIEW', label: 'In review' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
];

const PAGE_SIZE = 15;

export default function AdminComplaints() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { result, loading, error, manualRefresh } = useAdminComplaints({
    page,
    limit: PAGE_SIZE,
    status,
  });

  async function handleStatusChange(id: string, next: ComplaintStatus) {
    setUpdatingId(id);
    try {
      await updateAdminComplaintStatus(id, next);
      notifySuccess('Complaint status updated.');
      await manualRefresh();
    } catch (err) {
      notifyError(err);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleFilterChange(value: string) {
    setStatus(value);
    setPage(1);
  }

  return (
    <section>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-[var(--pm-color-text)]">
            Complaints &amp; Reports
          </h2>
          <p className="text-sm text-[var(--pm-color-muted)]">
            Review and manage issues reported by users.
          </p>
        </div>
        <div>
          <label className="sr-only" htmlFor="complaint-status-filter">
            Filter by status
          </label>
          <select
            id="complaint-status-filter"
            value={status}
            onChange={(event) => handleFilterChange(event.target.value)}
            className="min-h-11 w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-3.5 py-2.5 text-sm text-[var(--pm-color-text)] shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--pm-color-focus)] sm:w-auto"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert variant="error" message={error} />
        </div>
      )}

      <ComplaintTable
        complaints={result?.items ?? []}
        loading={loading}
        onSelect={(id) => navigate(`/admin/complaints/${id}`)}
        onStatusChange={handleStatusChange}
        updatingId={updatingId}
      />

      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          total={result.total}
          limit={result.limit}
          onPageChange={setPage}
        />
      )}
    </section>
  );
}