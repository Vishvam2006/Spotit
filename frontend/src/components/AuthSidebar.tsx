import Logo from './Logo';

export default function AuthSidebar() {
  return (
    <aside className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0 bg-[url('/assets/auth_bg_cinematic.png')] bg-cover bg-center"
        aria-hidden="true"
      />
      
      {/* Subtle overlay to darken the background slightly for better text contrast */}
      <div className="absolute inset-0 z-0 bg-[#0B1220]/40" aria-hidden="true" />

      {/* Foreground Content Container - Top Left */}
      <div className="relative z-30 flex flex-col h-full justify-between max-w-md">
        
        <div className="flex items-center">
          <img src="/assets/image.png" alt="ParkMitra" className="h-48 w-auto object-contain" />
        </div>

        {/* Headline & Subtitle */}
        <div className="animate-fade-in-up mt-32">
          <h1 className="text-6xl font-bold leading-[1.1] tracking-tight text-white">
            Arrive.<br/>
            <span className="text-[#19C7B2]">Park.</span><br/>
            Go.
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-300 font-medium max-w-sm">
            Find trusted parking around your destination in seconds.
          </p>
        </div>

        <div className="flex-grow" />

        {/* Footer */}
        <p className="text-sm text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} ParkMitra. All rights reserved.
        </p>
      </div>


    </aside>
  );
}
