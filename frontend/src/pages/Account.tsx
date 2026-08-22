import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Mail, Phone, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Spinner from '../components/ui/Spinner';
import Alert from '../components/ui/Alert';
import { useAuth } from '../context/auth-context';
import { getUserProfile, updateUserProfile, type UserProfile } from '../services/user';
import { fetchVehicles } from '../services/vehicles';
import { fetchBookings } from '../services/bookings';
import type { Vehicle } from '../types/vehicle';
import type { Booking } from '../types/booking';
import VehicleCard from '../components/vehicle/VehicleCard';
import BookingSummary from '../components/booking/BookingSummary';
import ProfileImageUpload from '../components/profile/ProfileImageUpload';
import { notifySuccess, notifyError } from '../utils/notify';

export default function Account() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
    phone: '',
    bio: '',
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [profileData, vehiclesData, bookingsData] = await Promise.all([
        getUserProfile(),
        fetchVehicles(),
        fetchBookings(),
      ]);
      setProfile(profileData);
      setVehicles(vehiclesData);
      setBookings(bookingsData.filter((b) => ['RESERVED', 'ACTIVE'].includes(b.status)));
      setEditForm({
        fullName: profileData.fullName,
        phone: profileData.phone || '',
        bio: profileData.bio || '',
      });
    } catch (err) {
      setError('Failed to load profile data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveProfile = async () => {
    if (!editForm.fullName.trim()) {
      notifyError('Name is required');
      return;
    }
    
    try {
      setSaving(true);
      const updated = await updateUserProfile({
        fullName: editForm.fullName,
        phone: editForm.phone || null,
        bio: editForm.bio || null,
      });
      setProfile(updated);
      setEditing(false);
      notifySuccess('Profile updated');
    } catch (err) {
      notifyError('Failed to update profile');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (url: string) => {
    try {
      const updated = await updateUserProfile({ profileImage: url });
      setProfile(updated);
      notifySuccess('Profile photo updated');
    } catch (err) {
      notifyError('Failed to save profile photo');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner className="h-8 w-8" />
        </div>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Alert variant="error" message={error || 'Profile not found'} />
          <Button onClick={loadData} className="mt-4">Try Again</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 pb-24">
        {/* Profile Header */}
        <div className="overflow-hidden rounded-2xl bg-[var(--pm-color-surface)] shadow-[var(--pm-shadow-card)]">
          <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600 sm:h-40" />
          <div className="px-6 pb-6 sm:px-8">
            <div className="-mt-16 sm:-mt-20 flex flex-col sm:flex-row sm:items-end sm:justify-between">
              <ProfileImageUpload 
                currentImageUrl={profile.profileImage} 
                onUploadSuccess={handleImageUpload}
                className="self-start sm:self-auto"
              />
              <div className="mt-4 flex gap-3 sm:mt-0">
                {editing ? (
                  <>
                    <Button variant="secondary" onClick={() => setEditing(false)} disabled={saving}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveProfile} loading={saving}>
                      Save
                    </Button>
                  </>
                ) : (
                  <Button onClick={() => setEditing(true)}>Edit Profile</Button>
                )}
              </div>
            </div>

            <div className="mt-6">
              {editing ? (
                <div className="space-y-4 max-w-md">
                  <div>
                    <Input
                      label="Full Name"
                      value={editForm.fullName}
                      onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <Input
                      label="Phone Number"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-[var(--pm-color-muted)]">
                      Bio
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] px-4 py-3 text-[var(--pm-color-text)] transition-colors focus:border-[var(--pm-color-focus)] focus:outline-none focus:ring-1 focus:ring-[var(--pm-color-focus)]"
                      rows={3}
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      placeholder="Tell us a bit about yourself"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h1 className="text-2xl font-bold text-[var(--pm-color-text)]">{profile.fullName}</h1>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-6">
                      <div className="flex items-center gap-2 text-sm text-[var(--pm-color-muted)]">
                        <Mail className="h-4 w-4" />
                        {profile.email}
                      </div>
                      {profile.phone && (
                        <div className="flex items-center gap-2 text-sm text-[var(--pm-color-muted)]">
                          <Phone className="h-4 w-4" />
                          {profile.phone}
                        </div>
                      )}
                    </div>
                  </div>
                  {profile.bio && (
                    <p className="text-[var(--pm-color-text)] opacity-90 max-w-2xl leading-relaxed">
                      {profile.bio}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Sections */}
        <div className="grid gap-8 lg:grid-cols-2">
          
          {/* Active Bookings Summary */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--pm-color-text)]">Active Bookings</h2>
              <Link to="/bookings" className="text-sm font-semibold text-[var(--pm-color-action)] hover:text-[var(--pm-color-action-hover)]">
                View all <ChevronRight className="inline h-4 w-4" />
              </Link>
            </div>
            
            {bookings.length > 0 ? (
              <div className="space-y-4">
                {bookings.slice(0, 2).map((booking) => (
                  <BookingSummary key={booking.id} booking={booking} />
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-8 text-center">
                <p className="text-[var(--pm-color-muted)]">No active bookings right now.</p>
                <Link to="/explore">
                  <Button variant="secondary" className="mt-4">Find Parking</Button>
                </Link>
              </div>
            )}
          </section>

          {/* Vehicles Summary */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--pm-color-text)]">My Vehicles</h2>
              <Link to="/my-vehicles" className="text-sm font-semibold text-[var(--pm-color-action)] hover:text-[var(--pm-color-action-hover)]">
                Manage <ChevronRight className="inline h-4 w-4" />
              </Link>
            </div>
            
            {vehicles.length > 0 ? (
              <div className="space-y-4">
                {vehicles.slice(0, 3).map((vehicle) => (
                  <div key={vehicle.id} className="pointer-events-none">
                    <VehicleCard vehicle={vehicle} onEdit={() => {}} onDelete={() => {}} onSetDefault={() => {}} hideActions />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-[var(--pm-color-border)] bg-[var(--pm-color-surface)] p-8 text-center">
                <p className="text-[var(--pm-color-muted)]">No vehicles added yet.</p>
                <Link to="/my-vehicles">
                  <Button variant="secondary" className="mt-4">Add a Vehicle</Button>
                </Link>
              </div>
            )}
          </section>

        </div>

        {/* Account Actions */}
        <section className="pt-8">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--pm-status-fail-border)] bg-[var(--pm-status-fail-soft)] px-4 py-3 font-semibold text-[var(--pm-status-fail)] transition-colors hover:bg-[var(--pm-status-fail)] hover:text-white"
          >
            <LogOut className="h-5 w-5" />
            Sign out of ParkMitra
          </button>
        </section>

      </div>
    </AppLayout>
  );
}
