import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AppLayout from '../layout/AppLayout';

export default function LandingPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?lat=&lng=&q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/explore');
    }
  };

  return (
    <AppLayout maxWidth="max-w-none">
      <div className="bg-white min-h-screen text-slate-900 font-sans">

        {/* HERO SECTION */}
        <section className="relative w-full overflow-hidden bg-slate-900">
          <div className="absolute inset-0">
            <img
              src="https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&q=80&w=2070"
              alt="City skyline at night"
              className="w-full h-full object-cover opacity-40 mix-blend-overlay"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
          </div>

          <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8 lg:py-40 flex flex-col items-center text-center">
            <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl mb-6 max-w-3xl drop-shadow-md">
              Find and book parking in seconds.
            </h1>
            <p className="mt-4 text-xl text-slate-200 max-w-2xl mb-10 drop-shadow">
              Reserve your spot in advance and skip the circling. Join millions of drivers using Spotit.
            </p>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl relative flex items-center bg-white rounded-full p-2 shadow-2xl transition-transform focus-within:scale-[1.02]">
              <div className="flex-1 flex items-center pl-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-400">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where are you going?"
                  className="w-full py-3 px-3 text-lg text-slate-800 placeholder-slate-400 bg-transparent outline-none focus:ring-0 border-none"
                />
              </div>
              <button type="submit" className="bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg shadow-md">
                Search
              </button>
            </form>
          </div>
        </section>

        {/* FEATURES SECTION (Image 1) */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-16">
              Skip the circling and park with ease
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {/* Park easy */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-slate-50 overflow-hidden">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#F4F6F8" />
                    <rect x="25" y="70" width="50" height="8" rx="2" fill="#FFC700" />
                    <path d="M30 70V58C30 52.4772 34.4772 48 40 48H60C65.5228 48 70 52.4772 70 58V70H30Z" fill="#0066FF" />
                    <path d="M36 48L42 36H58L64 48H36Z" fill="#3385FF" />
                    <rect x="26" y="58" width="48" height="6" rx="3" fill="#0052CC" />
                    <circle cx="35" cy="62" r="3" fill="white" />
                    <circle cx="65" cy="62" r="3" fill="white" />
                    <rect x="32" y="70" width="8" height="6" fill="#111827" />
                    <rect x="60" y="70" width="8" height="6" fill="#111827" />
                    {/* Sparkles */}
                    <path d="M70 30L72 24L78 22L72 20L70 14L68 20L62 22L68 24L70 30Z" fill="#FFC700" />
                    <path d="M25 40L26 36L30 35L26 34L25 30L24 34L20 35L24 36L25 40Z" fill="#FFC700" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Park easy</h3>
                <p className="text-slate-600 text-sm max-w-[250px]">
                  Get a guaranteed parking spot, stress-free*
                </p>
              </div>

              {/* Park for every plan */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-slate-50 overflow-hidden">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#F4F6F8" />
                    <path d="M10 80C30 60 70 60 90 80V100H10V80Z" fill="#CBD5E1" />
                    <circle cx="65" cy="75" r="5" fill="#E2E8F0" opacity="0.6" />
                    <circle cx="80" cy="85" r="8" fill="#E2E8F0" opacity="0.6" />
                    <rect x="42" y="30" width="4" height="40" rx="2" fill="#1E293B" />
                    <path d="M46 32H72C74.2091 32 76 33.7909 76 36V46C76 48.2091 74.2091 50 72 50H46V32Z" fill="#0066FF" />
                    <path d="M56 36H62C64.2091 36 66 37.7909 66 40V40C66 42.2091 64.2091 44 62 44H56V36Z" fill="white" />
                    <path d="M58 38H61C62.1046 38 63 38.8954 63 40V40C63 41.1046 62.1046 42 61 42H58V38Z" fill="#0066FF" />
                    <rect x="56" y="36" width="2" height="10" fill="white" />
                    {/* Sparkles */}
                    <path d="M30 40L31 38L33 37L31 36L30 34L29 36L27 37L29 38L30 40Z" fill="#FFC700" />
                    <path d="M80 45L81 43L83 42L81 41L80 39L79 41L77 42L79 43L80 45Z" fill="#FFC700" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Park for every plan</h3>
                <p className="text-slate-600 text-sm max-w-[250px]">
                  Your spot, where you need it, at a great price
                </p>
              </div>

              {/* Park your way */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-slate-50 overflow-hidden">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="50" fill="#F4F6F8" />
                    {/* Burst lines */}
                    <path d="M50 20V12" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
                    <path d="M35 25L30 18" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
                    <path d="M65 25L70 18" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
                    <path d="M22 38L15 35" stroke="#FFC700" strokeWidth="2" strokeLinecap="round" />
                    <path d="M78 38L85 35" stroke="#FFC700" strokeWidth="2" strokeLinecap="round" />

                    {/* Crown */}
                    <path d="M25 45L35 60L50 40L65 60L75 45L72 75H28L25 45Z" fill="#FFC700" />
                    <path d="M28 75H72V80C72 82.2091 70.2091 84 68 84H32C29.7909 84 28 82.2091 28 80V75Z" fill="#F59E0B" />
                    <path d="M50 55L45 65H55L50 55Z" fill="#0066FF" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Park your way</h3>
                <p className="text-slate-600 text-sm max-w-[250px]">
                  Parking as flexible as your plans**
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STEPS SECTION (Image 2) */}
        <section className="py-24 bg-slate-50">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-16">
              From search to booked in seconds
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="15" width="30" height="50" rx="4" stroke="#111827" strokeWidth="2" fill="white" />
                    <rect x="27" y="17" width="26" height="15" rx="2" fill="#0066FF" />
                    <rect x="20" y="28" width="40" height="8" rx="4" fill="white" stroke="#0066FF" strokeWidth="2" />
                    <circle cx="25" cy="32" r="2" fill="#0066FF" />
                    <rect x="29" y="38" width="22" height="6" rx="1" fill="#E2E8F0" />
                    <rect x="29" y="48" width="22" height="6" rx="1" fill="#E2E8F0" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Search your destination</h3>
                <p className="text-slate-600 text-sm max-w-[200px]">
                  Enter where you're going and when
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-slate-100 overflow-hidden shadow-sm border border-slate-200">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Map lines */}
                    <path d="M0 40H100M0 60H100M40 0V100M60 0V100" stroke="#DBEAFE" strokeWidth="4" />
                    <path d="M20 0L80 100" stroke="#DBEAFE" strokeWidth="4" />
                    {/* Pins */}
                    <path d="M50 25C50 25 65 40 50 55C35 40 50 25 50 25Z" fill="#10B981" />
                    <circle cx="50" cy="38" r="4" fill="white" />

                    <circle cx="30" cy="55" r="12" fill="#0066FF" />
                    <path d="M28 53H32M30 51V59C30 60 29 60 29 59" stroke="white" strokeWidth="1.5" strokeLinecap="round" />

                    <circle cx="75" cy="45" r="14" fill="#0066FF" />
                    <path d="M72 43H78M75 41V49C75 50 73 50 73 49M72 46H78" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Compare your options</h3>
                <p className="text-slate-600 text-sm max-w-[200px]">
                  Browse locations, prices, and details all in one place
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="25" y="15" width="30" height="50" rx="4" stroke="#111827" strokeWidth="2" fill="white" />
                    <path d="M30 35H50" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />
                    <circle cx="35" cy="32" r="2" fill="#0066FF" />
                    <circle cx="45" cy="32" r="2" fill="#0066FF" />
                    <path d="M32 28H48" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" />

                    <rect x="27" y="48" width="26" height="8" rx="4" fill="#0066FF" />
                    {/* Checkmark circle */}
                    <circle cx="55" cy="55" r="10" fill="#10B981" stroke="white" strokeWidth="2" />
                    <path d="M51 55L54 58L59 52" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Sparkle */}
                    <path d="M15 30L17 26L21 24L17 22L15 18L13 22L9 24L13 26L15 30Z" fill="#FFC700" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Book instantly</h3>
                <p className="text-slate-600 text-sm max-w-[200px]">
                  Plan ahead or last-minute; arrive with confidence
                </p>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32 mb-6 flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100">
                  <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    {/* Gate base */}
                    <rect x="15" y="45" width="10" height="25" rx="1" fill="#F59E0B" />
                    <rect x="12" y="70" width="76" height="4" fill="#111827" />
                    {/* Gate Arm */}
                    <path d="M20 50L85 30" stroke="#F59E0B" strokeWidth="4" strokeLinecap="square" />
                    <path d="M25 48L35 45M45 42L55 39M65 36L75 33" stroke="white" strokeWidth="4" />
                    {/* Car */}
                    <path d="M35 68V55C35 50 40 45 45 45H75C80 45 85 50 85 55V68H35Z" fill="#0066FF" />
                    <path d="M42 45L48 35H72L78 45H42Z" fill="#3385FF" />
                    <circle cx="45" cy="58" r="4" fill="white" />
                    <circle cx="75" cy="58" r="4" fill="white" />
                    <rect x="37" y="68" width="10" height="6" fill="#111827" />
                    <rect x="73" y="68" width="10" height="6" fill="#111827" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Park with ease</h3>
                <p className="text-slate-600 text-sm max-w-[200px]">
                  Everything you need is on your parking pass
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST SECTION (Image 3) */}
        <section className="py-24 bg-white overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Collage */}
              <div className="relative">
                <div className="relative z-10 w-4/5 ml-auto rounded-3xl overflow-hidden shadow-2xl aspect-[3/4]">
                  <img
                    src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=1471"
                    alt="Happy driver"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-1/4 -left-4 z-20 w-3/5 rounded-3xl overflow-hidden shadow-2xl aspect-[4/5] border-4 border-white">
                  <img
                    src="https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&q=80&w=1470"
                    alt="Man walking in city"
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Graphics overlay */}
                <div className="absolute top-10 right-4 z-30 bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-1">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC700" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" /></svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC700" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" /></svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC700" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" /></svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC700" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" /></svg>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="#FFC700" xmlns="http://www.w3.org/2000/svg"><path d="M12 17.27L18.18 21L16.54 13.97L22 9.24L14.81 8.63L12 2L9.19 8.63L2 9.24L7.46 13.97L5.82 21L12 17.27Z" /></svg>
                </div>

                <div className="absolute -bottom-6 -left-6 z-30">
                  <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 80C30 50 60 40 90 30" stroke="#111827" strokeWidth="2" strokeDasharray="6 6" strokeLinecap="round" />
                    <circle cx="20" cy="80" r="8" fill="#0066FF" />
                    <path d="M85 20L110 25L95 45Z" fill="#0066FF" />
                  </svg>
                </div>
              </div>

              {/* Text */}
              <div className="flex flex-col items-start lg:pl-10">
                <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl mb-12">
                  Trusted by millions of drivers
                </h2>

                <div className="space-y-8 mb-12">
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">100M+ cars parked</h4>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">300K+ <span className="font-extrabold text-slate-900">5-star</span> reviews</h4>
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-slate-900">400+ cities across the U.S. & Canada</h4>
                  </div>
                </div>

                <button
                  onClick={() => navigate('/explore')}
                  className="bg-[#0066FF] hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-md transition-colors text-lg"
                >
                  Learn More
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>
    </AppLayout>
  );
}
