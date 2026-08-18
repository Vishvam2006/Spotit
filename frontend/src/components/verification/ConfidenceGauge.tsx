import { useEffect, useMemo, useState } from 'react';
import type { ConfidenceBreakdown } from '../../services/verification';
import {
  CONFIDENCE_COMPONENT_LABELS,
  confidenceLabel,
  confidenceTone,
  toneClasses,
} from './verificationTokens';

interface ConfidenceGaugeProps {
  value: number;
  breakdown?: ConfidenceBreakdown;
  size?: 'sm' | 'lg';
  /** Hide the "how this was calculated" disclosure (used in dense card headers). */
  compact?: boolean;
}

const ARC_PATH = 'M 12 84 A 68 68 0 0 1 148 84';
// Half the circumference of an r=68 circle: the sweep of the semicircular arc.
const ARC_LENGTH = Math.PI * 68;

/**
 * Semicircular confidence gauge.
 *
 * The number it shows is *extraction* confidence, computed by the engine from
 * field completeness, validator agreement and legibility -- not a self-reported
 * score from the model. A document can read at 92% and still be rejected (an
 * expired RC is read perfectly and fails on the date), which is why the caption
 * says "Extraction confidence" rather than "AI score".
 */
export default function ConfidenceGauge({
  value,
  breakdown,
  size = 'lg',
  compact = false,
}: ConfidenceGaugeProps) {
  const clamped = Math.max(0, Math.min(1, value));
  const tone = confidenceTone(clamped);
  const classes = toneClasses(tone);

  const [prefersReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches),
  );

  // Sweep the arc up on mount so the result feels like it lands.
  const [shown, setShown] = useState(prefersReducedMotion ? clamped : 0);
  useEffect(() => {
    // Scheduled rather than set synchronously: the arc animates from 0 on mount,
    // and reduced-motion users start at the final value already.
    const frame = requestAnimationFrame(() => setShown(clamped));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  const components = useMemo(
    () =>
      breakdown
        ? (Object.entries(breakdown) as [string, number][]).filter(
            ([key]) => key in CONFIDENCE_COMPONENT_LABELS,
          )
        : [],
    [breakdown],
  );

  const isSmall = size === 'sm';
  const percent = Math.round(clamped * 100);

  return (
    <div className={isSmall ? 'w-28 shrink-0' : 'w-44 shrink-0'}>
      <div className="relative">
        <svg viewBox="0 0 160 92" className="w-full" aria-hidden="true">
          <path
            d={ARC_PATH}
            fill="none"
            stroke="var(--pm-color-border)"
            strokeWidth={12}
            strokeLinecap="round"
          />
          <path
            d={ARC_PATH}
            fill="none"
            stroke={classes.stroke}
            strokeWidth={12}
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={ARC_LENGTH * (1 - shown)}
            style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(.22,1,.36,1)' }}
          />
        </svg>

        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span
            className={`font-extrabold text-[var(--pm-color-text)] ${
              isSmall ? 'text-lg' : 'text-3xl'
            }`}
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label="Extraction confidence"
          >
            {percent}%
          </span>
          <span className={`text-xs font-semibold ${classes.fg}`}>
            {confidenceLabel(clamped)}
          </span>
        </div>
      </div>

      <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--pm-color-muted)]">
        Extraction confidence
      </p>

      {!compact && components.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer list-none text-center text-[11px] font-semibold text-[var(--pm-color-muted)] underline decoration-dotted underline-offset-2 hover:text-[var(--pm-color-text)]">
            How this was calculated
          </summary>
          <ul className="mt-2 space-y-1.5">
            {components.map(([key, componentValue]) => (
              <li key={key}>
                <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--pm-color-muted)]">
                  <span className="truncate">{CONFIDENCE_COMPONENT_LABELS[key]}</span>
                  <span className="tabular-nums">{Math.round(componentValue * 100)}%</span>
                </div>
                <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-[var(--pm-color-border)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(Math.max(0, Math.min(1, componentValue)) * 100)}%`,
                      backgroundColor: classes.stroke,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
