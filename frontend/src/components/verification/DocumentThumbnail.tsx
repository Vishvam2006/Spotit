import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';

interface Props {
  src?: string;
  alt: string;
}

export default function DocumentThumbnail({ src, alt }: Props) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!src) {
    return (
      <div className="flex aspect-[3/4] w-full items-center justify-center rounded-xl bg-[var(--pm-color-surface-raised)] text-xs text-[var(--pm-color-muted)] ring-1 ring-[var(--pm-color-border)]">
        No preview
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)]"
      >
        {/* object-contain, not cover: cropping half an RC in a verification UI
            hides exactly the fields the user wants to check. */}
        <img
          src={src}
          alt={alt}
          className="aspect-[3/4] w-full rounded-xl object-contain ring-1 ring-[var(--pm-color-border)] bg-[var(--pm-color-surface-raised)]"
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 animate-fade-in"
        >
          <button
            ref={closeRef}
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close preview"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={src}
            alt={alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
