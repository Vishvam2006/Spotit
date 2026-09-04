import { useEffect } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-2xl bg-[var(--pm-color-page)] shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--pm-color-border)] px-5 py-4 bg-[var(--pm-color-surface)]">
          <div className="flex items-center gap-2.5">
            <HelpCircle className="h-5 w-5 text-[var(--pm-color-text)]" />
            <div>
              <h2 id="how-it-works-title" className="text-base font-semibold text-[var(--pm-color-text)]">
                How Spotit works
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-surface-raised)] hover:text-[var(--pm-color-text)] transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <HowItWorksCard image="/images/how-it-works/step1.jpg" title="1. Find a lot" desc="Search for parking spots near your destination." />
            <HowItWorksCard image="/images/how-it-works/step2.jpg" title="2. Reserve a space" desc="Book your spot in advance or claim one on the spot." />
            <HowItWorksCard image="/images/how-it-works/step3.jpg" title="3. Arrive and park" desc="Navigate to the location and park your vehicle." />
            <HowItWorksCard image="/images/how-it-works/step4.jpg" title="4. Check out" desc="Easily check out and pay through the app." />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--pm-color-border)] px-5 py-4 flex items-center justify-end bg-[var(--pm-color-surface)]">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-[var(--pm-color-action)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity focus:outline-none"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function HowItWorksCard({ image, title, desc }: { image: string, title: string, desc?: string }) {
  return (
    <article className="rounded-[1.5rem] bg-[var(--pm-color-surface)] p-2 pm-neumorphic overflow-hidden">
      <div className="h-40 w-full overflow-hidden rounded-[1rem] bg-[var(--pm-color-surface-raised)] relative group">
        <img src={image} alt={title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="p-4 text-center">
        <h3 className="text-sm font-extrabold text-[var(--pm-color-text)] tracking-tight">{title}</h3>
        {desc && <p className="mt-1.5 text-xs text-[var(--pm-color-muted)] leading-snug">{desc}</p>}
      </div>
    </article>
  );
}
