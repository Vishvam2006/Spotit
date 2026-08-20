import { CONFIDENCE_BASIS, getConfidenceCopy } from '../../utils/continuity';
import type { AvailabilityConfidence } from '../../types/continuity';

interface ConfidenceBadgeProps {
  confidence: AvailabilityConfidence;
  size?: 'sm' | 'md';
  /** Renders the one-line explanation of what the score is derived from. */
  withBasis?: boolean;
  className?: string;
}

const sizeStyles: Record<'sm' | 'md', string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

/**
 * The Continuity Engine's trust score, shown to the driver who is about to rely
 * on the listing. The engine already recomputes this from open serious reports;
 * this is the one surface where the person it protects can see it.
 */
export default function ConfidenceBadge({
  confidence,
  size = 'md',
  withBasis = false,
  className = '',
}: ConfidenceBadgeProps) {
  const { label, description, styles } = getConfidenceCopy(confidence);

  const badge = (
    <span
      title={description}
      aria-label={`${label}. ${description}`}
      className={`inline-flex shrink-0 items-center rounded-full font-bold ${sizeStyles[size]} ${styles}`}
    >
      {label}
    </span>
  );

  if (!withBasis) {
    return <span className={className}>{badge}</span>;
  }

  return (
    <span className={`block ${className}`}>
      {badge}
      <span className="mt-1 block text-xs text-[var(--pm-color-muted)]">
        {CONFIDENCE_BASIS}
      </span>
    </span>
  );
}
