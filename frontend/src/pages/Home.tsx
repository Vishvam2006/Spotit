import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/auth-context';
import { useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  Car,
  Compass,
  MapPin,
  Search,
  ShieldCheck,
  CalendarDays,
  PlusCircle,
  AlertTriangle,
  Clock3,
} from 'lucide-react';
import AppLayout from '../components/layout/AppLayout';
import ComplaintForm from '../components/complaint/ComplaintForm';
import ConfidenceBadge from '../components/continuity/ConfidenceBadge';
import { fetchParkingLots } from '../services/parking';
import type { ParkingLot } from '../types/parking';
import { getCurrentPositionDetailed, type LatLng } from '../utils/geolocation';
import { haversineDistanceKm } from '../utils/distance';
import LandingPage from '../components/landing/LandingPage';

export default function Home() {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const [allParkingLots, setAllParkingLots] = useState<ParkingLot[]>([]);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    fetchParkingLots().then((lots) => setAllParkingLots(lots)).catch(() => { });
    getCurrentPositionDetailed().then((res) => {
      if (res.ok) setUserLocation(res.coords);
    });
  }, []);

  const visibleParkingLots = useMemo(() => {
    if (!userLocation) return allParkingLots.slice(0, 5);
    return [...allParkingLots]
      .map((lot) => ({
        ...lot,
        distanceKm: haversineDistanceKm(
          userLocation.lat,
          userLocation.lng,
          lot.latitude,
          lot.longitude,
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 5);
  }, [allParkingLots, userLocation]);

  const handleSearchClick = () => {
    navigate('/explore');
  };

  const handleQuickAction = (action: string) => {
    if (action === 'explore') navigate('/explore');
    else if (action === 'bookings') navigate('/bookings');
    else if (action === 'vehicles') navigate('/my-vehicles');
    // The add-parking flow lives on the map (you pin the location first), so
    // `addParking=1` is only ever handled by /explore.
    else if (action === 'list') {
      if (!user) navigate('/login', { state: { from: '/explore?addParking=1' } });
      else navigate('/explore?addParking=1');
    }
  };

  if (isInitializing) return null;

  if (!user) {
    return <LandingPage />;
  }

  return (
    <AppLayout maxWidth="max-w-none">
      <main className="min-h-screen bg-[var(--pm-color-page)] pb-32 pt-2 md:pt-6">
        <div className="mx-auto max-w-lg px-4 sm:px-6 md:max-w-3xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:hidden">
            <div className="flex items-center gap-2">
              <img src="/logo.jpg" alt="Spotit" className="h-8 w-8 rounded-lg object-cover" />
              <span className="text-xl font-bold tracking-tight text-[var(--pm-color-text)]">Spotit</span>
            </div>
          </div>

          {/* Main Search Area */}
          <div
            onClick={handleSearchClick}
            className="flex items-center justify-between gap-3 rounded-[2rem] bg-[var(--pm-color-surface-raised)] p-3 pl-5 pm-neumorphic cursor-text mb-4"
          >
            <div className="flex items-center gap-3">
              <Search className="h-6 w-6 text-[var(--pm-color-text)] font-bold" />
              <span className="text-lg font-bold text-[var(--pm-color-text)]">Where to?</span>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 rounded-full bg-[var(--pm-color-surface)] px-3 py-1.5 text-sm font-semibold text-[var(--pm-color-muted)] transition-colors pm-neumorphic-sm pm-neumorphic-active">
                <Clock3 className="h-4 w-4" />
                Later
              </button>
            </div>
          </div>

        
        

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="mb-4 text-xl font-bold text-[var(--pm-color-text)]">Find parking quickly</h2>
            {/* Grid of circular buttons */}
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              <QuickActionButton icon={Search} label="Find Park" onClick={() => handleQuickAction('explore')} badge="Fast" />
              <QuickActionButton icon={Compass} label="Nearby" onClick={() => handleQuickAction('explore')} />
              <QuickActionButton icon={CalendarDays} label="Bookings" onClick={() => handleQuickAction('bookings')} />

              <QuickActionButton icon={Car} label="Vehicles" onClick={() => handleQuickAction('vehicles')} />
              <QuickActionButton icon={MapPin} label="Saved" onClick={() => { }} />
              <QuickActionButton icon={AlertTriangle} label="Report" onClick={() => {
                if (!user) navigate('/login');
                else setReportOpen(true);
              }} />
              <QuickActionButton icon={PlusCircle} label="List Space" onClick={() => handleQuickAction('list')} badge="New" />
            </div>
          </div>

          {/* Nearby Parking Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[var(--pm-color-text)]">Nearby parking</h2>
              <button onClick={() => handleSearchClick()} className="text-sm font-semibold text-[var(--pm-color-action)]">View Map</button>
            </div>
            <div className="pm-scrollbar-none -mx-4 flex gap-4 overflow-x-auto px-4 pb-4">
              {visibleParkingLots.length === 0 ? (
                <div className="w-full rounded-2xl border border-dashed border-[var(--pm-color-border)] p-6 text-center">
                  <p className="text-[var(--pm-color-muted)]">No parking spots found nearby.</p>
                </div>
              ) : (
                visibleParkingLots.map((lot) => (
                  <NearbyParkingCard key={lot.id} lot={lot} onClick={() => navigate(`/parking/${lot.id}`)} />
                ))
              )}
            </div>
          </div>

          {/* Trust and Availability Card */}
          <div className="flex items-start gap-4 rounded-2xl bg-[var(--pm-color-surface)] p-5 pm-neumorphic mb-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--pm-color-action-soft)]">
              <ShieldCheck className="h-5 w-5 text-[var(--pm-color-action)]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[var(--pm-color-text)]">Parking availability you can trust</h3>
              <p className="mt-1 text-sm text-[var(--pm-color-muted)]">
                Live availability updates from verified parking partners.
              </p>
              <button className="mt-2 text-sm font-semibold text-[var(--pm-color-action)]">Learn more</button>
            </div>
          </div>

        </div>
      </main>
      {reportOpen && (
        <ComplaintForm onClose={() => setReportOpen(false)} />
      )}
    </AppLayout>
  );
}

function QuickActionButton({ icon: Icon, label, onClick, badge }: { icon: LucideIcon, label: string, onClick: () => void, badge?: string }) {
  return (
    <button onClick={onClick} className="group relative flex flex-col items-center gap-2 focus:outline-none">
      {badge && (
        <span className="absolute -top-2 -right-1 z-10 rounded-full bg-red-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
          {badge}
        </span>
      )}
      <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-[var(--pm-color-surface-raised)] transition-all pm-neumorphic pm-neumorphic-active">
        <Icon className="h-6 w-6 text-[var(--pm-color-text)]" />
      </div>
      <span className="text-xs font-semibold text-[var(--pm-color-text)]">{label}</span>
    </button>
  );
}

function NearbyParkingCard({ lot, onClick }: { lot: ParkingLot, onClick: () => void }) {
  return (
    <article
      onClick={onClick}
      className="w-[280px] shrink-0 rounded-2xl bg-[var(--pm-color-surface)] overflow-hidden pm-neumorphic pm-neumorphic-active cursor-pointer transition-all"
    >
      <div className="h-32 bg-[var(--pm-color-surface-raised)]">
        {lot.photos?.[0] ? (
          <img src={lot.photos[0]} alt={lot.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[var(--pm-color-surface-raised)]">
            <Compass className="h-8 w-8 text-[var(--pm-color-muted)]" />
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="truncate text-base font-bold text-[var(--pm-color-text)]">{lot.name}</h3>
        <p className="text-sm text-[var(--pm-color-muted)]">
          {lot.distanceKm !== undefined ? `${lot.distanceKm.toFixed(1)} km away` : lot.address}
        </p>
        {lot.availabilityConfidence !== 'HIGH' && (
          <ConfidenceBadge
            confidence={lot.availabilityConfidence}
            size="sm"
            className="mt-2"
          />
        )}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--pm-color-muted)]">Price</p>
            <p className="text-sm font-bold text-[var(--pm-color-text)]">₹{lot.pricePerHour}/hr</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[var(--pm-color-muted)]">Spaces</p>
            <p className="text-sm font-bold text-[var(--pm-color-action)]">{lot.availableSpaces} available</p>
          </div>
        </div>
        <button className="mt-4 w-full rounded-xl bg-[var(--pm-color-surface-raised)] py-2 text-sm font-bold text-[var(--pm-color-action)] transition-all pm-neumorphic-sm pm-neumorphic-active">
          Book Now
        </button>
      </div>
    </article>
  );
}
