import { useState } from 'react';
import { Check, Copy, RefreshCw } from 'lucide-react';
import Button from '../ui/Button';
import ConfidenceGauge from './ConfidenceGauge';
import VerificationStatusBadge from './VerificationStatusBadge';
import type { VerificationResultData } from '../../services/verification';
import StatusIcon from './StatusIcon';
import {
  type OverallStatus,
  overallStatusHeadline,
  overallTone,
  toneClasses,
} from './verificationTokens';

interface Props {
  result: VerificationResultData;
  onRetry?: () => void;
}

const STATUS_AS_OUTCOME = { VERIFIED: 'PASS', NEEDS_REVIEW: 'WARN', REJECTED: 'FAIL' } as const;

export default function ResultBanner({ result, onRetry }: Props) {
  const [copied, setCopied] = useState(false);
  const engineDown = result.engineAvailable === false;
  const status = result.overallStatus as OverallStatus;
  const tone = engineDown ? 'warn' : overallTone[status] ?? 'neutral';
  const classes = toneClasses(tone);
  const iconOutcome = engineDown ? 'WARN' : STATUS_AS_OUTCOME[status];

  function copyId() {
    navigator.clipboard?.writeText(result.verificationId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div
      aria-live="polite"
      className={`flex flex-col gap-4 rounded-2xl p-6 ring-1 sm:flex-row sm:items-center sm:justify-between ${classes.bg} ${classes.ring}`}
    >
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${classes.bg} ${classes.fg} ring-1 ${classes.ring}`}>
          <StatusIcon outcome={iconOutcome} className="h-8 w-8" />
        </div>

        <div className="min-w-0">
          <h2 className="text-xl font-bold text-[var(--pm-color-text)]">
            {overallStatusHeadline(status, !engineDown)}
          </h2>
          <p className="mt-1 text-sm text-[var(--pm-color-muted)]">{result.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!engineDown && <VerificationStatusBadge status={status} size="sm" />}
            <button
              type="button"
              onClick={copyId}
              title="Copy verification ID"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] text-[var(--pm-color-muted)] hover:bg-[var(--pm-color-surface-raised)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--pm-color-focus)]"
            >
              {result.verificationId}
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>

      {engineDown ? (
        /* An outage is not a verdict. Offer a retry with the files already loaded
           rather than a confidence number we have no basis for. */
        <div className="shrink-0 space-y-2 sm:w-52">
          <p className="text-xs text-[var(--pm-color-muted)]">
            Your document was not rejected &mdash; it was never checked, and nothing has been
            recorded against your vehicle.
          </p>
          {onRetry && (
            <Button variant="secondary" size="sm" onClick={onRetry}>
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Try again
            </Button>
          )}
        </div>
      ) : (
        <ConfidenceGauge
          value={result.overallConfidence}
          breakdown={result.documents[0]?.confidenceBreakdown}
        />
      )}
    </div>
  );
}
