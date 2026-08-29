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
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
      case 'MEDIUM':
        return <Info className="h-4 w-4 text-amber-600 shrink-0" />;
      case 'LOW':
        return <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />;
      case 'UNDER_REVIEW':
        return <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confidence-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <div>
              <h2 id="confidence-modal-title" className="text-base font-semibold text-slate-900">
                Availability Confidence Verification
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-sm">
          {/* Core Rule Explanation Card */}
          <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-start gap-2.5">
              <Info className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Computation Methodology</p>
                <p className="mt-1 text-slate-600">
                  {CONFIDENCE_TOOLTIP_TEXT}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Note: The platform refrains from claiming live telemetry without physical automated hardware. The Continuity Engine scores each location algorithmically based on verifiable driver interactions and operator inputs.
                </p>
              </div>
            </div>
          </div>

          {/* 4 State Cards */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Confidence States Reference
            </h3>

            <div className="grid gap-3 sm:grid-cols-1">
              {levels.map((lvl) => {
                const detail = CONFIDENCE_DETAILS[lvl];
                const isSelected = initialHighlight === lvl;

                return (
                  <div
                    key={lvl}
                    className={`rounded-md border p-4 ${
                      isSelected
                        ? 'border-slate-400 bg-slate-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        {getLevelIcon(lvl)}
                        <span className="font-semibold text-slate-900">{detail.title}</span>
                      </div>
                      <span className="inline-flex items-center rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                        {detail.badgeShort}
                      </span>
                    </div>

                    <p className="mt-2 text-slate-600">
                      {detail.meaning}
                    </p>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500">
                        <span className="font-medium">Example case:</span> {detail.example}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Last Updated Time Explanation */}
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <div className="flex items-start gap-2.5">
              <Clock className="h-4 w-4 text-slate-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-slate-900">Last Updated Timestamp</p>
                <p className="mt-1 text-slate-600">
                  Relative timestamps (e.g., "Last updated: 5 minutes ago") reflect the last recorded capacity change, completed checkout, or operator system update.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-5 py-4 flex items-center justify-end bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-white border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 shadow-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
