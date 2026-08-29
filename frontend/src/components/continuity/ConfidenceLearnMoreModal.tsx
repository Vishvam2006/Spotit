import { useEffect } from 'react';
import { X, ShieldCheck, Info, Clock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import { CONFIDENCE_DETAILS, CONFIDENCE_TOOLTIP_TEXT } from '../../utils/continuity';
import type { AvailabilityConfidence } from '../../types/continuity';

interface ConfidenceLearnMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialHighlight?: AvailabilityConfidence;
}

export default function ConfidenceLearnMoreModal({
  isOpen,
  onClose,
  initialHighlight,
}: ConfidenceLearnMoreModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const levels: AvailabilityConfidence[] = ['HIGH', 'MEDIUM', 'LOW', 'UNDER_REVIEW'];

  const getLevelIcon = (level: AvailabilityConfidence) => {
    switch (level) {
      case 'HIGH':
        return <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />;
      case 'MEDIUM':
        return <Info className="h-5 w-5 text-amber-600 shrink-0" />;
      case 'LOW':
        return <AlertTriangle className="h-5 w-5 text-orange-600 shrink-0" />;
      case 'UNDER_REVIEW':
        return <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confidence-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-2xl transition-all">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 id="confidence-modal-title" className="text-lg font-extrabold text-slate-900">
                Availability Confidence
              </h2>
              <p className="text-xs text-slate-500">How Spotit verifies parking spot reliability</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 pm-scrollbar-none">
          {/* Core Rule Explanation Card */}
          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-blue-950">How Confidence is Computed</p>
                <p className="mt-1 text-xs text-blue-800 leading-relaxed">
                  {CONFIDENCE_TOOLTIP_TEXT}
                </p>
                <p className="mt-2 text-[11px] text-blue-700/90 font-medium">
                  We deliberately refrain from claiming &ldquo;real-time&rdquo; or &ldquo;live telemetry&rdquo; unless physical automated hardware is deployed. Instead, our Continuity Engine dynamically scores each location based on authentic driver experiences.
                </p>
              </div>
            </div>
          </div>

          {/* 4 State Cards */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Confidence States &amp; What They Mean
            </h3>

            <div className="grid gap-3.5 sm:grid-cols-1">
              {levels.map((lvl) => {
                const detail = CONFIDENCE_DETAILS[lvl];
                const isSelected = initialHighlight === lvl;

                return (
                  <div
                    key={lvl}
                    className={`rounded-2xl border p-4.5 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/30 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        {getLevelIcon(lvl)}
                        <span className="text-sm font-bold text-slate-900">{detail.title}</span>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${detail.styles}`}
                      >
                        {detail.badgeShort}
                      </span>
                    </div>

                    <p className="mt-2 text-xs font-medium text-slate-700 leading-relaxed">
                      {detail.meaning}
                    </p>

                    {/* Example Box */}
                    <div className="mt-3 rounded-xl bg-white border border-slate-200/80 p-3 shadow-xs">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Real-world Example:
                      </p>
                      <p className="mt-0.5 text-xs text-slate-800 italic">
                        &ldquo;{detail.example}&rdquo;
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Updated Time Explanation */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-slate-900">Last Updated Timestamp</p>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Every parking location displays a relative timestamp (such as <em>&ldquo;Last updated: 5 minutes ago&rdquo;</em>). This reflects the last recorded capacity change, completed driver checkout, or owner update received by the platform.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
