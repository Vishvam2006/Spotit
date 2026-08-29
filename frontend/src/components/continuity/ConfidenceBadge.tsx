import { useState } from 'react';
import { Clock } from 'lucide-react';
import { CONFIDENCE_BASIS, CONFIDENCE_TOOLTIP_TEXT, getConfidenceCopy } from '../../utils/continuity';
import type { AvailabilityConfidence } from '../../types/continuity';
import { formatLastUpdated } from '../../utils/format';
import ConfidenceLearnMoreModal from './ConfidenceLearnMoreModal';

interface ConfidenceBadgeProps {
  confidence: AvailabilityConfidence;
  size?: 'sm' | 'md' | 'lg';
  /** Renders the one-line explanation of what the score is derived from. */
  withBasis?: boolean;
  /** Pass the parking lot's updatedAt timestamp to render the relative last updated time. */
  updatedAt?: string | null;
  /** Whether to render the "Last updated: X minutes ago" line explicitly. */
  showLastUpdated?: boolean;
  /** Show interactive learn more button when basis is enabled. */
  showLearnMoreButton?: boolean;
  className?: string;
}

const sizeStyles: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm',
};

export default function ConfidenceBadge({
  confidence,
  size = 'md',
  withBasis = false,
  updatedAt,
  showLastUpdated = false,
  showLearnMoreButton = false,
  className = '',
}: ConfidenceBadgeProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const { label, styles } = getConfidenceCopy(confidence);

  const handleLearnMore = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setModalOpen(true);
  };

  const badgeContent = (
    <span
      title={CONFIDENCE_TOOLTIP_TEXT}
      aria-label={`${label}. ${CONFIDENCE_TOOLTIP_TEXT}`}
      className={`inline-flex shrink-0 items-center rounded-full font-bold transition-all ${sizeStyles[size]} ${styles}`}
    >
      <span>{label}</span>
    </span>
  );

  return (
    <>
      <div className={`inline-block ${className}`}>
        <div className="flex flex-col items-start gap-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {badgeContent}
          </div>

          {withBasis && (
            <p className="mt-1 text-xs text-[var(--pm-color-muted)] leading-relaxed">
              {CONFIDENCE_BASIS}
              {showLearnMoreButton && (
                <button
                  type="button"
                  onClick={handleLearnMore}
                  className="ml-1.5 font-semibold text-[var(--pm-color-action)] hover:underline inline-flex items-center gap-0.5"
                >
                  Learn more
                </button>
              )}
            </p>
          )}

          {showLastUpdated && updatedAt && (
            <div className="flex items-center gap-1 text-[11px] text-[var(--pm-color-muted)]">
              <Clock className="h-3 w-3 shrink-0" />
              <span>{formatLastUpdated(updatedAt)}</span>
            </div>
          )}
        </div>
      </div>

      <ConfidenceLearnMoreModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        initialHighlight={confidence}
      />
    </>
  );
}
