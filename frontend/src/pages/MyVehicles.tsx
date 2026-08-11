import { useCallback, useEffect, useState } from 'react';
import AppLayout from '../components/layout/AppLayout';
import Alert from '../components/ui/Alert';
import Spinner from '../components/ui/Spinner';
import Button from '../components/ui/Button';
import VehicleCard from '../components/vehicle/VehicleCard';
import VehicleForm, { type VehicleFormValues } from '../components/vehicle/VehicleForm';
import DeleteVehicleDialog from '../components/vehicle/DeleteVehicleDialog';
import {
  createVehicle,
  deleteVehicle,
  fetchVehicles,
  setDefaultVehicle,
  updateVehicle,
} from '../services/vehicles';
import { getErrorMessage } from '../services/api';
import { notifyError, notifySuccess } from '../utils/notify';
import type { Vehicle } from '../types/vehicle';

export default function MyVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Vehicle | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadVehicles = useCallback(() => {
    let active = true;
    fetchVehicles()
      .then((result) => {
        if (active) setVehicles(result);
      })
      .catch(() => {
        if (active) setLoadError('Failed to load your vehicles. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => loadVehicles(), [loadVehicles]);

  const openAdd = () => {
    setFormError(null);
    setAdding(true);
    setEditing(null);
  };

  const openEdit = (vehicle: Vehicle) => {
    setFormError(null);
    setEditing(vehicle);
    setAdding(false);
  };

  const closeForm = () => {
    setAdding(false);
    setEditing(null);
    setFormError(null);
  };

  const handleSubmit = async (values: VehicleFormValues) => {
    setFormError(null);
    if (!values.image || !values.image.imageUrl || !values.image.imagePublicId) {
      setFormError('Please add a photo of your vehicle.');
      return;
    }
    setFormSubmitting(true);
    try {
      if (editing) {
        const imageChanged =
          values.image.imagePublicId !== editing.imagePublicId ||
          values.image.imageUrl !== editing.imageUrl;
        await updateVehicle(editing.id, {
          registration: values.registration,
          type: values.type,
          make: values.make || null,
          model: values.model || null,
          color: values.color || null,
          ...(imageChanged
            ? { imageUrl: values.image.imageUrl, imagePublicId: values.image.imagePublicId }
            : {}),
        });
        notifySuccess('Vehicle updated.');
      } else {
        await createVehicle({
          registration: values.registration,
          type: values.type,
          make: values.make || null,
          model: values.model || null,
          color: values.color || null,
          imageUrl: values.image.imageUrl,
          imagePublicId: values.image.imagePublicId,
        });
        notifySuccess('Vehicle added to your garage.');
      }
      closeForm();
      loadVehicles();
    } catch (error) {
      setFormError(getErrorMessage(error));
      notifyError(error);
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setDeleteSubmitting(true);
    try {
      await deleteVehicle(deleting.id);
      notifySuccess('Vehicle deleted.');
      setDeleting(null);
      loadVehicles();
    } catch (error) {
      notifyError(error);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSetDefault = async (vehicle: Vehicle) => {
    setBusyId(vehicle.id);
    try {
      const updated = await setDefaultVehicle(vehicle.id);
      setVehicles(updated);
      notifySuccess('Default vehicle updated.');
    } catch (error) {
      notifyError(error);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AppLayout>
      <main className="mx-auto max-w-4xl px-4 pt-8 pb-24 sm:px-6 md:pb-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Vehicles</h1>
            <p className="mt-1 text-sm text-slate-500">
              Add the vehicles you park with — one photo is required for each.
            </p>
          </div>
          {!adding && !editing && (
            <Button className="max-w-48" onClick={openAdd}>
              + Add vehicle
            </Button>
          )}
        </div>

        {(adding || editing) && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">
              {editing ? `Edit ${editing.registration}` : 'Add a vehicle'}
            </h2>
            <div className="mt-5">
              <VehicleForm
                key={editing?.id ?? 'new'}
                initial={editing ?? undefined}
                submitting={formSubmitting}
                submitError={formError}
                submitLabel={editing ? 'Save changes' : 'Add vehicle'}
                onCancel={closeForm}
                onSubmit={handleSubmit}
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <Spinner className="h-8 w-8 text-blue-600" />
            </div>
          ) : loadError ? (
            <Alert variant="error" message={loadError} />
          ) : vehicles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <p className="text-sm text-slate-500">You have no vehicles yet.</p>
              <Button className="mx-auto mt-4 max-w-xs" onClick={openAdd}>
                + Add your first vehicle
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {vehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  busy={busyId === vehicle.id}
                  onSetDefault={handleSetDefault}
                  onEdit={openEdit}
                  onDelete={setDeleting}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {deleting && (
        <DeleteVehicleDialog
          vehicle={deleting}
          loading={deleteSubmitting}
          onConfirm={handleDelete}
          onCancel={() => {
            if (!deleteSubmitting) setDeleting(null);
          }}
        />
      )}
    </AppLayout>
  );
}
