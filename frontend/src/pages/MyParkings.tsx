import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import ParkingForm from '../components/parking/ParkingForm';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import Spinner from '../components/ui/Spinner';
import { useAuth } from '../context/auth-context';
import {
  deleteParking,
  getMyParkings,
  getParkingErrorMessage,
  toggleParking,
} from '../services/parkingApi';
import type { Parking } from '../types/parking';
import { formatINR } from '../utils/format';

type FormMode = 'create' | 'edit' | null;

export default function MyParkings() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [editingParking, setEditingParking] = useState<Parking | undefined>();
  const [deleteTarget, setDeleteTarget] = useState<Parking | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    getMyParkings()
      .then((data) => {
        if (active) setParkings(data);
      })
      .catch((err) => {
        if (active) setError(getParkingErrorMessage(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const openCreateForm = () => {
    setActionError(null);
    setEditingParking(undefined);
    setFormMode('create');
  };

  const openEditForm = (parking: Parking) => {
    setActionError(null);
    setEditingParking(parking);
    setFormMode('edit');
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingParking(undefined);
  };

  const handleSaved = (parking: Parking) => {
    if (formMode === 'create') {
      setParkings((current) => [parking, ...current]);
      setNotice('Parking lot created successfully.');
    } else {
      setParkings((current) =>
        current.map((item) => (item.id === parking.id ? parking : item)),
      );
      setNotice('Parking lot updated successfully.');
    }
    closeForm();
  };

  const handleToggleStatus = async (parking: Parking) => {
    setActionError(null);
    setTogglingId(parking.id);

    try {
      const updated = await toggleParking(parking.id, !parking.isActive);
      setParkings((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      setNotice(
        updated.isActive ? 'Parking lot activated.' : 'Parking lot deactivated.',
      );
    } catch (err) {
      setActionError(getParkingErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setActionError(null);
    setDeletingId(deleteTarget.id);

    try {
      await deleteParking(deleteTarget.id);
      setParkings((current) => current.filter((item) => item.id !== deleteTarget.id));
      setNotice('Parking lot deleted.');
      setDeleteTarget(null);
    } catch (err) {
      setActionError(getParkingErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9 w-9" />
            <span className="text-xl font-bold tracking-tight text-slate-900">
              ParkMitra
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Map
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Parkings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage the parking lots you own.
            </p>
          </div>
          {!formMode && (
            <Button type="button" className="sm:w-auto" onClick={openCreateForm}>
              Add parking
            </Button>
          )}
        </div>

        {notice && (
          <div className="mb-5">
            <Alert variant="success" message={notice} />
          </div>
        )}

        {actionError && (
          <div className="mb-5">
            <Alert variant="error" message={actionError} />
          </div>
        )}

        {formMode && (
          <div className="mb-6">
            <ParkingForm
              key={formMode === 'create' ? 'create' : editingParking?.id}
              mode={formMode}
              initialValues={editingParking}
              onSaved={handleSaved}
              onCancel={closeForm}
            />
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner className="h-8 w-8 text-blue-600" />
          </div>
        ) : error ? (
          <Alert variant="error" message={error} />
        ) : parkings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
            <h2 className="text-lg font-semibold text-slate-900">No parking lots yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Add your first parking lot to start accepting bookings.
            </p>
            {!formMode && (
              <Button type="button" className="mx-auto mt-6 sm:w-auto" onClick={openCreateForm}>
                Add parking
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {parkings.map((parking) => (
              <article
                key={parking.id}
                className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{parking.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{parking.address}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      parking.isActive
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                        : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
                    }`}
                  >
                    {parking.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                {parking.description && (
                  <p className="mt-3 text-sm text-slate-600">{parking.description}</p>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-500">Price / hour</dt>
                    <dd className="font-semibold text-slate-900">
                      {formatINR(parking.pricePerHour)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Availability</dt>
                    <dd className="font-semibold text-slate-900">
                      {parking.availableSlots} / {parking.totalSlots}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(parking)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Edit
                  </button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-auto px-3 py-2"
                    loading={togglingId === parking.id}
                    onClick={() => handleToggleStatus(parking)}
                  >
                    {parking.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(parking)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete parking lot"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          loading={deletingId === deleteTarget.id}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deletingId) setDeleteTarget(null);
          }}
        />
      )}
    </div>
  );
}
