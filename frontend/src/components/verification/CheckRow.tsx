import type { CheckResultItem } from '../../services/verification';
import StatusIcon from './StatusIcon';
import { outcomeTone, toneClasses } from './verificationTokens';

export default function CheckRow({ check }: { check: CheckResultItem }) {
  const tone = outcomeTone[check.status];
  const classes = toneClasses(tone);
  const muted = check.status === 'SKIPPED' || check.status === 'UNKNOWN';

  return (
    <li className={`flex items-start gap-3 py-3 ${muted ? 'opacity-70' : ''}`}>
      <StatusIcon outcome={check.status} className={`mt-0.5 h-5 w-5 shrink-0 ${classes.fg}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--pm-color-text)]">{check.label}</p>
        {/* The detail sentence names the actual values compared -- this is what
            turns "expiry failed" into "expired on 15 May 2020, 2,286 days ago". */}
        <p className="text-sm leading-relaxed text-[var(--pm-color-muted)]">{check.detail}</p>
      </div>
    </li>
  );
}
